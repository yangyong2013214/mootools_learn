/*
 ---

 name: Core

 description: The heart of MooTools.

 license: MIT-style license.

 copyright: Copyright (c) 2006-2015 [Valerio Proietti](http://mad4milk.net/).

 authors: The MooTools production team (http://mootools.net/developers/)

 inspiration:
 - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
 - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

 provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

 ...
 */
/*! MooTools: the javascript framework. license: MIT-style license. copyright: Copyright (c) 2006-2015 [Valerio Proietti](http://mad4milk.net/).*/
(function () {

    this.MooTools = {
        version: '1.6.1-dev',
        build: '%build%'
    };

// typeOf, instanceOf

    //
    // MT库自己提供了typeOf， instanceOf函数。这两个函数是为了MT库设计的，来替代
    // JS原生的typeof, instanceof 运算符（注意大小写）。
    //

    // 这个是MT自定义的typeOf全局函数，是在JS的小写的typeof运算符的基础上做了定制和扩展。
    // 规则：
    //  1）null --> "null"
    //  2) 有$family属性的，直接返回$family属性值（MT特殊的对象）。MT把所有内置对象的原型都添加了这个属性，所以array，Number这些会在这里返回。
    //  3）有nodeName属性的，根据nodeType返回: element, textnode, whitespace
    //  4) 有length属性的，且length是数字类型，则返回arguments(如果有callee属性)或collection（如果有item属性）。不会返回'array'，或'string'
    //  5）一般不会不满足。假如不满足，则返回js typeof运算符的结果："number"、"string"、"boolean"、"object"、"function" 和 "undefined"。

    var typeOf = this.typeOf = function (item) {
    	//item === null 或 item === undefined
        if (item == null) return 'null';
        //有$family函数，就取$family 函数值
		//MT 中使用Type封装后的类型都有该方法，
        if (item.$family != null) return item.$family();
        //页面的Element节点
        if (item.nodeName) {
            if (item.nodeType == 1) return 'element';
            //有内容为：textnode，没有内容为：whitespace
            if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
        } else if (typeof item.length == 'number') {
			// 判断对象是否为数组/对象的元素/属性：
			// 格式：（变量 in 对象）......注意，，，
			// 　　当“对象”为数组时，“变量”指的是数组的“索引”；
			// 　　当“对象”为对象是，“变量”指的是对象的“属性”。
            if ('callee' in item) return 'arguments';
            if ('item' in item) return 'collection';
        }

        return typeof item;
    };

    // 这个是MT自定义的instanceOf全局函数，是在JS的小写的instanceof运算符的基础上做了定制和扩展。
    // 规则：
    //  1) null --> false.
    //  2) 根据对象的constructor属性（或者$constructor属性，这个是自定义Class时使用的），匹配对象类型。
    //  3) 使用JS的instanceof运算符

    var instanceOf = this.instanceOf = function (item, object) {
    	// 同上
        if (item == null) return false;
        // 在这可以获得所有对象的$constructor, 也包括字符串, 数字，
        // 如'aaaa'.$constructor === String();
        var constructor = item.$constructor || item.constructor;
        while (constructor) {
            if (constructor === object) return true;
            /*
             主要用来判定Class类的， Class的Matutors.extends方法会指定构造函数的parent;
             var A=new Class({
             initialize:function(){
             }
             })
             var B=new Class({
             Extends:A,
             initialize:function(){
             }
             })


             new Type('a',A);
             new Type('b',B);
             var b=new B();
             console.log( instanceOf(b,A));
             */

			//parent是MT中针对Class构造类中添加的属性

            constructor = constructor.parent;
        }

        /*
         http://ajaxian.com/archives/working-aroung-the-instanceof-memory-leak
         有三个对象会导致这个问题
         window
         document
         element
         举例，if (window instanceof Object) 每次刷新会增加50kb的内存，
         原因是这三个对象在IE下不是真正的对象，没有hasOwnProperty 及valueOf方法。
         */

        /*<ltIE8>*/
        if (!item.hasOwnProperty) return false;
        /*</ltIE8>*/

        /*
         借用 instanceof 进行深度检测，那么 instanceOf(Array, Function) true,
         instance of (Array, Object) true.
         */

        return item instanceof object;
    };

    var hasOwnProperty = Object.prototype.hasOwnProperty;


    /*<ltIE8>*/
    // [Refer to 棍子上的萝卜]
    // 这里先对IE不能遍历对象中类似toString方法的bug做一个修正
    // 有些浏览器不会枚举Object中定义部分属性即使重新在对象中定义了这些属性，比如toString
    // PunCha: NodeJs的世界没有这个问题，所以enumerables永远是null。
    var enumerables = true;
    //IE8及以下浏览器不能进入for in 循环，
    for (var i in {toString: 1}) enumerables = null;

    // toString, toLocaleString, valueOf 等内置属性不可枚举, Object.prototype.propertyIsEnumerable('toString') 返回true,
    // 	但对于代码定义的toString方法，是可枚举的（大部分自已定义的属性都可枚举）， 但在IE8之前，自已重新定义的内置方法，还是不可枚举. 可以通过以下代码进行调整

    if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];


    function forEachObjectEnumberableKey(object, fn, bind) {
        if (enumerables)
            for (var i = enumerables.length; i--;) {
                var k = enumerables[i];
                // signature has key-value, so overloadSetter can directly pass the
                // method function, without swapping arguments.
                if (hasOwnProperty.call(object, k)) fn.call(bind, k, object[k]);
                //bind 是调用对象， fn就是overloadSetter的包装之后的函数
                //object.hasOwnProperty(k)==> bind.fn(k, object[k]);
            }
    }

    /*</ltIE8>*/

// Function overloading

    // MT扩充了JS原生的Function对象/构造函数，这个是所有JS函数的始祖。
    // this.Function是全局的Function对象（就是JS内置的Function对象）
    var Function = this.Function;

    // overloadSetter连同overloadGetter，两种功能的装饰方法
    // 该overloadSetter功能是用来将具有签名FN（键，值），可以接受对象参数的函数功能，即：FN（{键：值}）

    // MT的灵魂函数。总的来说，是包装一下原函数，并返回强化过的新函数。
    // 这个对原函数有限制，原函数必须有2个参数key/value。强化后的版本，可以传入key/value，也可以传入有多个key/value的一个对象。
    // 这个函数很难理解，可以结合Function.prototype.extend一起来看。
    // 这个是蛮精妙的函数，MT为在Function的原型上添加了这个方法，所以JS的所有函数都自动继承了这个方法，但是文档上面没有这个方法，说明作者是不想expose的。
    // 所有的操作都是应用在this对象上的。
    Function.prototype.overloadSetter = function (usePlural) {
        // self指代的是原函数对象（是一个函数哦）
		// self 是指被包装的原函数
        var self = this;

        // 包装之后的函数
        return function (a, b) {
            //  Tricky：假如不带参数的调用包装后的函数，返回非强化的版本（原函数），注意不会执行原函数的逻辑。

            if (a == null) return this;

            if (usePlural || typeof a != 'string') {
                //  强化！假如第一个参数不是string，那么就假设传入的是对象（并忽略参数b），枚举传入对象的每个属性，
                // 并对this对象执行原函数的逻辑（将属性,属性值作为参数传入）。
                for (var k in a) self.call(this, k, a[k]); //===> this.self(k, a[k]);
                /*<ltIE8>*/
                forEachObjectEnumberableKey(a, self, this);
                //对IE不能遍历对象中类似toString方法的bug做一个修正
                //==>类似执行了 self.call(this, k, a[k]); //===> this.self(k, a[k]);
                /*</ltIE8>*/
            } else {
                // 这个就是执行原函数：传入a,b两个参数。维持this指针不变。在后面的应用中可以看到这个是为了在this对象上附加属性。
                self.call(this, a, b); //===> this.self(a, b);
            }
            return this;
        };
    };

    // [Refer to 棍子上的萝卜]
    // 使得一个类似getStyle(name)的方法(本来返回value)接受一个数组参数如[name1,name2,name3],
    // 然后返回一个返回值的字面量对象如{name1:value1,name2:value,name3:value3}.
    Function.prototype.overloadGetter = function (usePlural) {
		// self 是指被包装的原函数
        var self = this;

        return function (a) {
            var args, result;
            if (typeof a != 'string') args = a;

            else if (arguments.length > 1) args = arguments;

            else if (usePlural) args = [a];

            if (args) {
                result = {};
                for (var i = 0; i < args.length; i++)
                	result[args[i]] = self.call(this, args[i]); //==> this.self(args[i]);
            } else {
                result = self.call(this, a);
            }
            return result;
        };
    };

    // 这个是作者想暴露的API，逻辑简单，在this对象上附加key,value。最后wrap了一下，让这个逻辑可以应用于多次。
    // 但是要注意，wrap后的参数可以是key（字符串类型）和value，也可以是包含多个属性/值对的一个对象。
    Function.prototype.extend = function (key, value) {
        this[key] = value;
    }.overloadSetter();

    //这个是作者想暴露的API，逻辑简单，在this的*原型*对象上附加key,value。最后wrap了一下，让这个逻辑可以应用于多次。
    // 注意点同上。
    Function.prototype.implement = function (key, value) {
        this.prototype[key] = value;
    }.overloadSetter();

// From

    // slice函数快捷方式
    var slice = Array.prototype.slice;


    // 一切皆数组！将类数组转化成数组；将对象转换成一个成员的数组。
    Array.convert = function (item) {
        if (item == null) return [];
        //多个三元操作符也是可能的（注：条件运算符是右结合）：
        //当一个表达式中出现多个条件运算符时，应该将位于最右边的问号与离它最近的冒号配对，并按这一原则正确区分各条件运算符的运算对象。
        return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
    };

	// 如果传入一个函数，就返还这个函数，如果传入的是一个其它值，则生成一个返回这个值的函数
    Function.convert = function (item) {
        return (typeOf(item) == 'function') ? item : function () {
                return item;
            };
    };

    // 转化成数字或者null,过滤掉NaN类型的数据
    Number.convert = function (item) {
        var number = parseFloat(item);
        return isFinite(number) ? number : null;
    };

    // 这个实现倒是简单（自动调用toString()）
    String.convert = function (item) {
        return item + '';
    };

    /*<1.5compat>*/
    Array.from = Array.convert;
    /*</1.5compat>*/

    Function.from = Function.convert;
    Number.from = Number.convert;
    String.from = String.convert;


    // 为函数添加$hidden, $protected “访问修饰符”。~OO之封装~
    // 但是严格的说，OO思想里面所有的变量、函数都有访问修饰符，但是作者仅仅为
    // 函数做了处理。
    //
// hide, protect

    // 这2个函数设计的可以级联（返回this）。
    Function.implement({
        // 隐藏起来的意思是，别人“拿不走”我的这个函数。把我传给别的对象implement, extend的话，
        // 别人是得不到这个函数的。
        hide: function () {
            this.$hidden = true;
            return this;
        },

        // 把方法保护起来，这个是保护自己的方法不受别人篡改。一旦受保护，那么
        // 他就不会被同名函数覆盖；同时类的实例也不能访问该方法。
        protect: function () {
            this.$protected = true;
            return this;
        }

    });

// Type

    // Type是MT的灵魂类型之一

    // 注意，虽然这个是构造函数，但是构造出来的Type的实例是完全没有实际用处的，这个从他的返回值也可以验证。
    // 这个函数本身只用来注册类型的。object参数取名有点问题，其实他要求传入是类型的构造函数，是函数！==>构造函数

    // 作用是添加$family属性、添加Type.isXXXX()快捷方法，并附加上Type类的静态方法。（同时也重载掉了
    // Function.implement、extend函数，替换成Type.implement() 和 Type.extend()。)


    //在JS里，new关键字是一种实例对象的方式，而在这里却发生了一些变化，因为Type内部最后返回了object，那么这个函数其实返回的是参数函数，
    // 而不是实例而对象，那么为什么要多此一举，不直接调用Type(name,object)呢，我认为：
    //obejct.extend(this) 这里必须要用new 才能正确获得this，进而获取prototype上的方法，你可以试试，如果不new 看看this指向？
    //new Type(name,object)更直观的说明了函数的用途：object是Type的一个实例。
    //我们通过研究Type就能更清楚的了解MT的整体架构，MT里的一切都是派生于Type, 在此基础上构造类系统。

    var Type = this.Type = function (name, object) {
        if (name) {
            var lower = name.toLowerCase();

            var typeCheck = function (item) {
                return (typeOf(item) == lower);
            };

            // 在Type类附加了一个类静态方法，用来检查类型。
            // 所以你最好也遵从这些规范，自己写的类型也注册下，不过假如你使用MT的Class类打造你
            // 自己的类型的话，就不用了，因为Class类会帮你注册。
            Type['is' + name] = typeCheck;
            if (object != null) {
                // 附加$family属性，这样typeOf就能更好的工作了。看到没，还被hide起来了。
                object.prototype.$family = (function () {
                    return lower;
                }).hide();
                //<1.2compat>
                object.type = typeCheck;
                //</1.2compat>
            }
        }
        // 假如没有传入object参数，会使这个注册函数“失色”不少。功能变得就仅仅是提供个isXXX的快捷检查方法。
        /*并不是说return null就没有任何作用了,如果没有传入第二个参数 作用就是引入
         一个Type['is'+name],的检查类型的方法,虽然没有指定$family，对于比如Node类型的
         对象还是可以通过typeOf判断其类型,所以isTextNode等方法就可以用来快速判断了
         没听懂?给你个例子前面定义的typeOf中说明了dom节点或者文本节点可以通过其nodeType来
         得到返回值 如  new ('TextNode',null)这里事实上与实际上的textnode没有任何关系,但是却产生了
         一个isTextNode的方法,而isTextNode是typeOf的包装,这下明白了吧
         */
        if (object == null) return null;
        // 注意，这个this指针是正在构建的Type实例。就是说，对传入的对象构造函数，会在本身附加Type原型的成员。
        // 注意：
        //  1）是原型的成员，而不是Type本身的，比如上面的Type[is+name]是不会有的。
        //  2）是对传入的对象的构造函数本身，而不是其原型，所以构造出来的对象是不会有Type的成员的。
        //  3）不同类型的object，其extend实现实不同的。一般是调用Fuction.extend。
        // 把Type.prototype上的方法扩展到object上，这样的目的就是模仿 类实例的过程。
        object.extend(this);
        // 将object的构造函数设为Type ，模拟的好像啊...
        // 自定义$constrcutor，模仿原生种的constructor行为
        object.$constructor = Type;
        // 呵呵，做事做全套。
        // 指定object的原型的$constructor使之 可以正确的instanceOf
        // 重新调整$construcotor，防止混乱
        object.prototype.$constructor = object;
        //返回了这个被包装过的类
        return object;
    };

    // 导出Object始祖对象的toString()实现。
    var toString = Object.prototype.toString;

    // 对象有length属性，且不是函数。
    Type.isEnumerable = function (item) {
        return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
    };

    // 这是一个Map，key是不同的类别。唯一有可能往这个数组里面添加项目的是Type.mirror()函数。
    var hooks = {};

    // 根据对象的类别取得该类别所有相关类型的数组。
    var hooksOf = function (object) {
        var type = typeOf(object.prototype);
        return hooks[type] || (hooks[type] = []);
    };

    // 这个方法是附属于对象的，因为他里面用到了this.prototype，所以this指针是对象的构造函数！
    // 这个函数被Type.implement使用，一大作用就是会重载掉在Type里面注册的类型的Function.implement函数！
    var implement = function (name, method) {
        // 跳过私有函数，私有函数不能赋予其他对象。
        if (method && method.$hidden) return;
        // 获取对象类别
        var hooks = hooksOf(this);
        // 对于该类别的每个相关类型
        for (var i = 0; i < hooks.length; i++) {
            var hook = hooks[i];
            // 如果是Type类型，则为Type类型的原型定义（implement）此方法或属性！
            if (typeOf(hook) == 'type') implement.call(hook, name, method);
            //===>hook.implement(name, method);

            // 否则运行这个钩子函数（hook[i]是外部通过调用mirror时提供的，只要是函数就行）
            // 感觉就是给了某些特殊的应用一次处理的时间。
            else hook.call(this, name, method);
        }
        // 在this的原型上（重）定义该方法（跳过受保护的方法），所以该类型的实例会继承这个方法。
        var previous = this.prototype[name];

        if (previous == null || !previous.$protected) this.prototype[name] = method;

        // 如果本身没有这个方法，那么定义一个同名的可以调用它实例的方法（类级别的静态方法！）
        // MT的原则是函数多多益善啊！
        if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function (item) {
            return method.apply(item, slice.call(arguments, 1));  //===> item.method(arguments.slice(1));

        });
    };

    var extend = function (name, method) {
        // 私有方法不能给别人。
        if (method && method.$hidden) return;

        // 没有当然给一个。已经有了，而且被保护了，那么不能改写。
        var previous = this[name];
        if (previous == null || !previous.$protected) this[name] = method;
    };

    // Type本身是一个函数，所以这里implement是调用Function.implement，相当于把这些方法附属到Type原型上
    // 所以任何type实例，或继承自Type都有了这些方法。
    Type.implement({

        // Type实例将使用特有的implement（非Function.implement）
        implement: implement.overloadSetter(),

        // Type实例将使用特有的extend（非Function.extend）
        extend: extend.overloadSetter(),

        // 为这个函数取一个别名。注意，别名定义在implement和类本身上
        alias: function (name, existing) {
            implement.call(this, name, this.prototype[existing]);
        }.overloadSetter(),

        // 增加一个同类别的类型，注意这是唯一一个地方push一个对象到hooks数组。
        // [Refer to 棍子上的萝卜]
        // 将hook（一般为一个函数）暂时存放在hooks[type]的数组中,不作处理,直到这个Type类型的构造函数implement的时候
        // 其中type是这个Type类型的构造函数指定的name属性，
        // 如果传入hook为另外一个Type类型则在implement时另外一个Type类型也会被连带处理。
        // mirror方法非常重要，相当于1.2中的afterImplement，比如Element类implement了一个方法 setStyle ，如果在连带的hook中处理了Elements
        // 那它implement的同时也会影响到Elements了！！！所以$$(".className").setStyle(xx,xx)是正确的语法!!!太高端了mootools

        // PunCha: 其实我还是完全不懂，但是我写了个example:
        //   function A() {}
        //   function B() {}
        //   new Type("banana", A).mirror(function (name) {console.log("A-" + name);});
        //   new Type("banana", B).mirror(function (name) {console.log("B-" + name);});
        //   A.implement("Wow", "value");
        // 输出： A-Wow  B-Wow
        // 啥用处？？？！
        mirror: function (hook) {
            hooksOf(this).push(hook);
            return this;
        }

    });

    // 对Type本身进行注册，所以Type本身也有了Type原型的方法。
    new Type('Type', Type);
    // 简而言之,new Type(name,func)即仅仅只对输入的func做了一点加工，
    // 比如使其对typeOf以及instanceOf有效。使其可以使用implement以及
    // extend, mirror等等方法，还有Type.isname的快捷方法。

// Default Types

    // 开始构建MT的Type大军，将内置类型一个一个变成Type
    //


    // 为传入的类型注册。对传入的类型的原型附加多个成员函数；
    // 注意！Object类型，没有注册，只不过做了下保护。

    var force = function (name, object, methods) {
        // 只有在object是Object类型的时候，isType才会是false。也就是始祖对象。
        var isType = (object != Object),

            prototype = object.prototype;

        // 注册。注意object还是传入的object，其实没变（Type内部返回object)
        if (isType) object = new Type(name, object); //如：=> new Type('String', String);

        for (var i = 0, l = methods.length; i < l; i++) {
            var key = methods[i],
                generic = object[key],
                proto = prototype[key];
            // 如果该类型本身有这个方法，保护起来免得被改写！比如Array.push()
            if (generic) generic.protect();
            // 如果原型上有这个方法，粗鲁的将他改成受保护的。
            // TODO：搞不懂，为什么不直接调用下proto.protect()?
            if (isType && proto) object.implement(key, proto.protect());
        }

        // 对于非Object类型
        if (isType) {
            // 赠送一个方法？
			// 是检测属性是否可用 for...in 枚举
            var methodsEnumerable = prototype.propertyIsEnumerable(methods[0]);
            // 反正就是挨个调用成员函数。你传入的fn必须支持2个参数，第一个是值，第二个是属性
            object.forEachMethod = function (fn) {
                if (!methodsEnumerable)
                	for (var i = 0, l = methods.length; i < l; i++) {
						fn.call(prototype, prototype[methods[i]], methods[i]);
					}
                for (var key in prototype) fn.call(prototype, prototype[key], key);
            };
        }

        return force;
    };

    // 构建Type大军，注册了所有内置类型！且这些方法都被保护了起来。
    force('String', String, [
        'charAt', 'charCodeAt', 'concat', 'contains', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
        'slice', 'split', 'substr', 'substring', 'trim', 'toLowerCase', 'toUpperCase'
    ])('Array', Array, [
        'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
        'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight', 'contains'
    ])('Number', Number, [
        'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
    ])('Function', Function, [
        'apply', 'call', 'bind'
    ])('RegExp', RegExp, [
        'exec', 'test'
    ])('Object', Object, [
        'create', 'defineProperty', 'defineProperties', 'keys',
        'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
        'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
    ])('Date', Date, ['now']);




    // 对Object进行特殊的扩展，Object没有$family、以及implement, extend属性。在这里，为其附加extend方法，也就说
    // 所有的{}都可以用这个函数附加方法了。而且这个是强化版的。
    Object.extend = extend.overloadSetter();

    // 替换了Date的默认now实现。
    Date.extend('now', function () {
        return +(new Date);
    });

    // 为boolean做了注册，为什么要单独注册？可能是因为他没有成员函数
    new Type('Boolean', Boolean);

// fixes NaN returning as Number

    // 修正NaN会返回number类型的问题
    Number.prototype.$family = function () {
        return isFinite(this) ? 'number' : 'null';
    }.hide();

// Number.random

    // 这个比Math.Random好用多了。
    Number.extend('random', function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    });

// forEach, each, keys

    Array.implement({

        /*<!ES5>*/
        forEach: function (fn, bind) {
            for (var i = 0, l = this.length; i < l; i++) {
                if (i in this) fn.call(bind, this[i], i, this);
            }
        },
        /*</!ES5>*/
        // fn(item, index, object)
		//item - (mixed) 数组中的当前项。
		//index - (number) 数组中的当前项的索引。如果是一个对象它是当前项的键名,而不是索引。
		//object - (mixed) 执行些方法的数组/对象
        each: function (fn, bind) {
            Array.forEach(this, fn, bind);
            return this;
        }

    });

    Object.extend({

        keys: function (object) {
            var keys = [];
            for (var k in object) {
                if (hasOwnProperty.call(object, k)) keys.push(k);
            }
            /*<ltIE8>*/
            forEachObjectEnumberableKey(object, function (k) {
                keys.push(k);
            });
            /*</ltIE8>*/
            return keys;
        },

        // forEach方法，仅对真正的property才调用。
        forEach: function (object, fn, bind) {
            Object.keys(object).forEach(function (key) {
                fn.call(bind, object[key], key, object);
            });
        }

    });

    Object.each = Object.forEach;


// Array & Object cloning, Object merging and appending

    // 深度克隆啊，只对array和object处理就够了吗？
    var cloneOf = function (item) {
        switch (typeOf(item)) {
            case 'array':
                return item.clone();
            case 'object':
                return Object.clone(item);
            default:
                return item;
        }
    };

    //返回数组的副本。
    Array.implement('clone', function () {
        var i = this.length, clone = new Array(i);
        while (i--) clone[i] = cloneOf(this[i]);
        return clone;
    });

    //合并
    var mergeOne = function (source, key, current) {
        switch (typeOf(current)) {
            case 'object':
                if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
                else source[key] = Object.clone(current);
                break;
            case 'array':
                source[key] = current.clone();
                break;
            default:
                source[key] = current;
        }
        return source;
    };

    Object.extend({

        merge: function (source, k, v) {


            if (typeOf(k) == 'string') return mergeOne(source, k, v);

            for (var i = 1, l = arguments.length; i < l; i++) {
                var object = arguments[i];
                for (var key in object) mergeOne(source, key, object[key]);
            }
            return source;
        },

        clone: function (object) {
            var clone = {};
            for (var key in object) clone[key] = cloneOf(object[key]);
            return clone;
        },

        append: function (original) {
            for (var i = 1, l = arguments.length; i < l; i++) {
                var extended = arguments[i] || {};
                for (var key in extended) original[key] = extended[key];
            }
            return original;
        }

    });

// Object-less types
    // 这里其实不是严格意义上的注册，因为第二个参数没传进去。所以，这里仅仅是为Type添加isXXX的快捷方法。
    ['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function (name) {
        new Type(name);
    });

// Unique ID

    var UID = Date.now();

    String.extend('uniqueID', function () {
        return (UID++).toString(36);
    });

//<1.2compat>
	//Hash数据结构，我们通常用来存放键值对
    var Hash = this.Hash = new Type('Hash', function (object) {
        if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
        for (var key in object) this[key] = object[key];
        return this;
    });

    Hash.implement({
		// 遍历Hash实例的属性和方法，执行fn函数，
		// 第一参数是属性或者方法的值，第二个参数是key名称
        forEach: function (fn, bind) {
            Object.forEach(this, fn, bind);
        },

		// 得到一个干净的拷贝，不会拷贝继承的属性或方法
        getClean: function () {
            var clean = {};
            //遍历一个对象的所有属性时忽略掉继承属性
            for (var key in this) {
                if (this.hasOwnProperty(key)) clean[key] = this[key];
            }
            return clean;
        },

		// 得到Hash实例的属性和方法的总数量，不包括继承的属性和方法
        getLength: function () {
            var length = 0;
            for (var key in this) {
                if (this.hasOwnProperty(key)) length++;
            }
            return length;
        }

    });

    Hash.alias('each', 'forEach');

    Object.type = Type.isObject;

    var Native = this.Native = function (properties) {
        return new Type(properties.name, properties.initialize);
    };

    Native.type = Type.type;

    Native.implement = function (objects, methods) {
        for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
        return Native;
    };

    var arrayType = Array.type;
    Array.type = function (item) {
        return instanceOf(item, Array) || arrayType(item);
    };

	// 把传入的迭代对象转换为数组Array
    this.$A = function (item) {
        return Array.convert(item).slice();
    };

	// 返回一个函数，这个函数返回它接受的参数列表的第i项
    this.$arguments = function (i) {
        return function () {
            return arguments[i];
        };
    };

	// 检查对象的属性或方法是否已定义或者变量是否已赋值或者是否为0
    this.$chk = function (obj) {
        return !!(obj || obj === 0);
    };

    // 通用计时器清除方法，如果timer不存在也不会报错
    this.$clear = function (timer) {
        clearTimeout(timer);
        clearInterval(timer);
        return null;
    };

	// 检查对象的属性是否已定义或者变量是否已赋值
	// 即对象不是undefined
    this.$defined = function (obj) {
        return (obj != null);
    };

	// 迭代对象，对里面的所有属性或在方法执行fn(value, key)
    this.$each = function (iterable, fn, bind) {
		// 获取迭代对象的类型名称
        var type = typeOf(iterable);
		// 如果为arguments、collection或者array中的一种，则执行Array的each方法，
		// 其它情况则执行Object的each方法
        ((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
    };

	// 空函数
    this.$empty = function () {
    };

	// 通过浅拷贝实现original的扩展，注意不会解除引用
    this.$extend = function (original, extended) {
        return Object.append(original, extended);
    };

	// 实例化Hash对象的快捷方式
    this.$H = function (object) {
        return new Hash(object);
    };

	// 递归合并参数列表中的所有对象，后出现的属性或者方法会覆盖前面出现的，
	// 为深拷贝，会利用$unlink解除引用
    this.$merge = function () {
		// 转换arguments为真的Array对象，从而可以使用unshift等Array的方法
        var args = Array.slice(arguments);
		// 在数组最前面插入一个空对象
        args.unshift({});
        return Object.merge.apply(null, args);
    };

	// 如果传入一个函数，就返还这个函数，如果传入的是一个其它值，则生成一个返回这个值的函数
    this.$lambda = Function.convert;

	// 递归合并所有参数列表中的对象的属性和方法，后面的会覆盖前面的
	// 这里的mix就是上面插入的{}空的对象，也是参数列表的第一个参数
    this.$mixin = Object.merge;

    this.$random = Number.random;

    this.$splat = Array.convert;

    this.$time = Date.now;

    this.$type = function (object) {
        var type = typeOf(object);
        if (type == 'elements') return 'array';
        return (type == 'null') ? false : type;
    };

    this.$unlink = function (object) {
        switch (typeOf(object)) {
            case 'object':
                return Object.clone(object);
            case 'array':
                return Array.clone(object);
            case 'hash':
                return new Hash(object);
            default:
                return object;
        }
    };

//</1.2compat>

})();
