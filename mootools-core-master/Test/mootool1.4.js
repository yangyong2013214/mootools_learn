/**
 * Created by yong on 2017/4/13 0013.
 */
/*
 ---
 MooTools: the javascript framework

 web build:
 - http://mootools.net/core/dce97d7a88c57a1b0474a9a90f0687e1

 packager build:
 - packager build Core/Core Core/Array Core/String Core/Number Core/Function Core/Object Core/Class Core/Class.Extras Core/JSON

 ...
 */

/*
 ---

 name: Core

 description: The heart of MooTools.

 license: MIT-style license.

 copyright: Copyright (c) 2006-2012 [Valerio Proietti](http://mad4milk.net/).

 authors: The MooTools production team (http://mootools.net/developers/)

 inspiration:
 - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
 - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

 provides: [Core, MooTools, Type, typeOf, instanceOf, Native]

 ...
 */

// MT1.4.5 部分代码解读  -- by PunCha 2012/12/23

(function () {
	// 这里所有的代码都被包在一个匿名函数的内部，所以this指针很肯定指向的是JS世界的全局对象！

	// Track版本信息
	this.MooTools = {
		version: '1.4.5',
		build: 'ab8ea8824dc3b24b6666867a2c4ed58ebb762cf0'
	};

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
		if (item == null) return 'null';
		if (item.$family != null) return item.$family();

		if (item.nodeName) {
			if (item.nodeType == 1) return 'element';
			if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
		} else if (typeof item.length == 'number') {
			if (item.callee) return 'arguments';
			if ('item' in item) return 'collection';
		}

		return typeof item;
	};

	// 这个是MT自定义的instanceOf全局函数，是在JS的小写的instanceof运算符的基础上做了定制和扩展。
	// 规则：
	//  1) null --> false.
	//  2) 根据对象的constructor属性（或者$constructor属性，这个是自定义Class时使用的），匹配对象类型。
	//  3) 使用JS的instanceof运算符。
	var instanceOf = this.instanceOf = function (item, object) {
		if (item == null) return false;
		var constructor = item.$constructor || item.constructor;
		while (constructor) {
			if (constructor === object) return true;
			constructor = constructor.parent;
		}
		/*<ltIE8>*/
		if (!item.hasOwnProperty) return false;
		/*</ltIE8>*/
		return item instanceof object;
	};

	// MT扩充了JS原生的Function对象/构造函数，这个是所有JS函数的始祖。
	//

	// this.Function是全局的Function对象（就是JS内置的Function对象）
	var Function = this.Function;

	// [Refer to 棍子上的萝卜]
	// 这里先对IE不能遍历对象中类似toString方法的bug做一个修正
	// 有些浏览器不会枚举Object中定义部分属性即使重新在对象中定义了这些属性，比如toString
	// PunCha: NodeJs的世界没有这个问题，所以enumerables永远是null。
	var enumerables = true;
	for (var i in { toString: 1 }) enumerables = null;
	if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

	// MT的灵魂函数。总的来说，是包装一下原函数，并返回强化过的新函数。
	// 这个对原函数有限制，原函数必须有2个参数key/value。强化后的版本，可以传入key/value，也可以传入有多个key/value的一个对象。
	// 这个函数很难理解，可以结合Function.prototype.extend一起来看。
	// 这个是蛮精妙的函数，MT为在Function的原型上添加了这个方法，所以JS的所有函数都自动继承了这个方法，但是文档上面没有这个方法，说明作者是不想expose的。
	// 所有的操作都是应用在this对象上的。
	Function.prototype.overloadSetter = function (usePlural) {

		// self指代的是原函数对象（是一个函数哦）
		var self = this;

		// 包装之后的函数
		return function (a, b) {
			//  Tricky：假如不带参数的调用包装后的函数，返回非强化的版本（原函数），注意不会执行原函数的逻辑。
			if (a == null) return this;
			if (usePlural || typeof a != 'string')
			{
				//  强化！假如第一个参数不是string，那么就假设传入的是对象（并忽略参数b），枚举传入对象的每个属性，并对this对象执行原函数的逻辑（将属性,属性值作为参数传入）。
				for (var k in a) self.call(this, k, a[k]);
				if (enumerables) for (var i = enumerables.length; i--;) {
					k = enumerables[i];
					if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
				}
			}
			else
			{
				// 这个就是执行原函数：传入a,b两个参数。维持this指针不变。在后面的应用中可以看到这个是为了在this对象上附加属性。
				self.call(this, a, b);
			}
			return this;
		};
	};

	// [Refer to 棍子上的萝卜]
	// 使得一个类似getStyle(name)的方法(本来返回value)接受一个数组参数如[name1,name2,name3],然后返回一个返回值的字面量对象如{name1:value1,name2:value,name3:value3}.
	Function.prototype.overloadGetter = function (usePlural) {
		var self = this;
		return function (a) {
			var args, result;
			if (typeof a != 'string') args = a;
			else if (arguments.length > 1) args = arguments;
			else if (usePlural) args = [a];
			if (args) {
				result = {};
				for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
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

	// 这个是作者想暴露的API，逻辑简单，在this的*原型*对象上附加key,value。最后wrap了一下，让这个逻辑可以应用于多次。
	// 注意点同上。
	Function.prototype.implement = function (key, value) {
		this.prototype[key] = value;
	}.overloadSetter();

	// slice函数快捷方式
	var slice = Array.prototype.slice;

	// 一切皆函数！
	Function.from = function (item) {
		return (typeOf(item) == 'function') ? item : function () {
			return item;
		};
	};

	// 一切皆数组！将类数组转化成数组；将对象转换成一个成员的数组。
	Array.from = function (item) {
		if (item == null) return [];
		return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
	};

	// 转化成数字或者null
	Number.from = function (item) {
		var number = parseFloat(item);
		return isFinite(number) ? number : null;
	};

	// 这个实现倒是简单（自动调用toString()）
	String.from = function (item) {
		return item + '';
	};

	// 为函数添加$hidden, $protected “访问修饰符”。~OO之封装~
	// 但是严格的说，OO思想里面所有的变量、函数都有访问修饰符，但是作者仅仅为
	// 函数做了处理。
	//

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

	// Type是MT的灵魂类型之一

	// 注意，虽然这个是构造函数，但是构造出来的Type的实例是完全没有实际用处的，这个从他的返回值也可以验证。
	// 这个函数本身只用来注册类型的。object参数取名有点问题，其实他要求传入是类型的构造函数，是函数！
	// 作用是添加$family属性、添加Type.isXXXX()快捷方法，并附加上Type类的静态方法。（同时也重载掉了
	// Function.implement、extend函数，替换成Type.implement() 和 Type.extend()。)
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

			// 附加$family属性，这样typeOf就能更好的工作了。看到没，还被hide起来了。
			if (object != null) {
				object.prototype.$family = (function () {
					return lower;
				}).hide();

			}
		}

		// 假如没有传入object参数，会使这个注册函数“失色”不少。功能变得就仅仅是提供个isXXX的快捷检查方法。
		if (object == null) return null;

		// 注意，这个this指针是正在构建的Type实例。就是说，对传入的对象构造函数，会在本身附加Type原型的成员。
		// 注意：
		//  1）是原型的成员，而不是Type本身的，比如上面的Type[is+name]是不会有的。
		//  2）是对传入的对象的构造函数本身，而不是其原型，所以构造出来的对象是不会有Type的成员的。
		//  3）不同类型的object，其extend实现实不同的。一般是调用Fuction.extend。
		object.extend(this);

		// 注册了之后，会附加$constructor属性，这样instanceOf就能工作了。
		object.$constructor = Type;
		// 呵呵，做事做全套。
		object.prototype.$constructor = object;

		return object;
	};

	// 导出Object始祖对象的toString()实现。
	var toString = Object.prototype.toString;

	// 对象有length属性，且不是函数。
	Type.isEnumerable = function (item) {
		return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]');
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
			if (typeOf(hook) == 'type') {
				// 如果是Type类型，则为Type类型的原型定义（implement）此方法或属性！
				implement.call(hook, name, method);
			}
			else {
				// 否则运行这个钩子函数（hook[i]是外部通过调用mirror时提供的，只要是函数就行）
				// 感觉就是给了某些特殊的应用一次处理的时间。
				hook.call(this, name, method);
			}
		}

		// 在this的原型上（重）定义该方法（跳过受保护的方法），所以该类型的实例会继承这个方法。
		var previous = this.prototype[name];
		if (previous == null || !previous.$protected) this.prototype[name] = method;

		// 如果本身没有这个方法，那么定义一个同名的可以调用它实例的方法（类级别的静态方法！）
		// MT的原则是函数多多益善啊！
		if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function (item) {
			return method.apply(item, slice.call(arguments, 1));
		});
	};

	// Type.extend
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
	//------------------------------------------------------------


	// 开始构建MT的Type大军，将内置类型一个一个变成Type
	//


	// 为传入的类型注册。对传入的类型的原型附加多个成员函数；
	// 注意！Object类型，没有注册，只不过做了下保护。
	var force = function (name, object, methods) {

		// 只有在object是Object类型的时候，isType才会是false。也就是始祖对象。
		var isType = (object != Object),
			prototype = object.prototype;

		// 注册。注意object还是传入的object，其实没变（Type内部返回object)
		if (isType) object = new Type(name, object);

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
			var methodsEnumerable = prototype.propertyIsEnumerable(methods[0]);
			// 反正就是挨个调用成员函数。你传入的fn必须支持2个参数，第一个是值，第二个是属性
			object.forEachMethod = function (fn) {
				if (!methodsEnumerable) for (var i = 0, l = methods.length; i < l; i++) {
					fn.call(prototype, prototype[methods[i]], methods[i]);
				}
				for (var key in prototype) fn.call(prototype, prototype[key], key)
			};
		}

		return force;
	};

	// 构建Type大军，注册了所有内置类型！且这些方法都被保护了起来。
	force('String', String, [
		'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
		'slice', 'split', 'substr', 'substring', 'trim', 'toLowerCase', 'toUpperCase'
	])('Array', Array, [
		'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
		'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
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

	// 修正NaN会返回number类型的问题
	Number.prototype.$family = function () {
		return isFinite(this) ? 'number' : 'null';
	}.hide();

	// 这个比Math.Random好用多了。
	Number.extend('random', function (min, max) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	});

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	// forEach方法，仅对真正的property才调用。
	Object.extend('forEach', function (object, fn, bind) {
		for (var key in object) {
			if (hasOwnProperty.call(object, key)) fn.call(bind, object[key], key, object);
		}
	});

	Object.each = Object.forEach;

	Array.implement({

		forEach: function (fn, bind) {
			for (var i = 0, l = this.length; i < l; i++) {
				if (i in this) fn.call(bind, this[i], i, this);
			}
		},

		each: function (fn, bind) {
			Array.forEach(this, fn, bind);
			return this;
		}

	});

	// Array & Object cloning, Object merging and appending

	// 深度克隆啊，只对array和object处理就够了吗？
	var cloneOf = function (item) {
		switch (typeOf(item)) {
			case 'array': return item.clone();
			case 'object': return Object.clone(item);
			default: return item;
		}
	};

	Array.implement('clone', function () {
		var i = this.length, clone = new Array(i);
		while (i--) clone[i] = cloneOf(this[i]);
		return clone;
	});

	var mergeOne = function (source, key, current) {
		switch (typeOf(current)) {
			case 'object':
				if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
				else source[key] = Object.clone(current);
				break;
			case 'array': source[key] = current.clone(); break;
			default: source[key] = current;
		}
		return source;
	};

	// Object又多了3个类的静态方法。
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



})();


/*
 ---

 name: Array

 description: Contains Array Prototypes like each, contains, and erase.

 license: MIT-style license.

 requires: Type

 provides: Array

 ...
 */

// 这里的implement方法是Type.implement。这些函数没什么多说的，都很简单。
Array.implement({

	/*<!ES5>*/
	every: function (fn, bind) {
		for (var i = 0, l = this.length >>> 0; i < l; i++) {
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function (fn, bind) {
		var results = [];
		for (var value, i = 0, l = this.length >>> 0; i < l; i++) if (i in this) {
			value = this[i];
			if (fn.call(bind, value, i, this)) results.push(value);
		}
		return results;
	},

	indexOf: function (item, from) {
		var length = this.length >>> 0;
		for (var i = (from < 0) ? Math.max(0, length + from) : from || 0; i < length; i++) {
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function (fn, bind) {
		var length = this.length >>> 0, results = Array(length);
		for (var i = 0; i < length; i++) {
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function (fn, bind) {
		for (var i = 0, l = this.length >>> 0; i < l; i++) {
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},
	/*</!ES5>*/

	clean: function () {
		return this.filter(function (item) {
			return item != null;
		});
	},

	invoke: function (methodName) {
		var args = Array.slice(arguments, 1);
		return this.map(function (item) {
			return item[methodName].apply(item, args);
		});
	},

	associate: function (keys) {
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function (object) {
		var result = {};
		for (var i = 0, l = this.length; i < l; i++) {
			for (var key in object) {
				if (object[key](this[i])) {
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function (item, from) {
		return this.indexOf(item, from) != -1;
	},

	append: function (array) {
		this.push.apply(this, array);
		return this;
	},

	getLast: function () {
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function () {
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function (item) {
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function (array) {
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function (item) {
		for (var i = this.length; i--;) {
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function () {
		this.length = 0;
		return this;
	},

	flatten: function () {
		var array = [];
		for (var i = 0, l = this.length; i < l; i++) {
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},

	pick: function () {
		for (var i = 0, l = this.length; i < l; i++) {
			if (this[i] != null) return this[i];
		}
		return null;
	},

	// 这个array参数是boolean类型的。。这设计的超奇怪，呵呵。
	hexToRgb: function (array) {
		if (this.length != 3) return null;
		var rgb = this.map(function (value) {
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function (array) {
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++) {
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});




/*
 ---

 name: String

 description: Contains String Prototypes like camelCase, capitalize, Core, and toInt.

 license: MIT-style license.

 requires: Type

 provides: String

 ...
 */

String.implement({

	test: function (regex, params) {
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function (string, separator) {
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : String(this).indexOf(string) > -1;
	},

	trim: function () {
		return String(this).replace(/^\s+|\s+$/g, '');
	},

	clean: function () {
		return String(this).replace(/\s+/g, ' ').trim();
	},

	camelCase: function () {
		return String(this).replace(/-\D/g, function (match) {
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function () {
		return String(this).replace(/[A-Z]/g, function (match) {
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function () {
		return String(this).replace(/\b[a-z]/g, function (match) {
			return match.toUpperCase();
		});
	},

	escapeRegExp: function () {
		return String(this).replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function (base) {
		return parseInt(this, base || 10);
	},

	toFloat: function () {
		return parseFloat(this);
	},

	hexToRgb: function (array) {
		var hex = String(this).match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function (array) {
		var rgb = String(this).match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function (object, regexp) {
		return String(this).replace(regexp || (/\\?\{([^{}]+)\}/g), function (match, name) {
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != null) ? object[name] : '';
		});
	}

});


/*
 ---

 name: Number

 description: Contains Number Prototypes like limit, round, times, and ceil.

 license: MIT-style license.

 requires: Type

 provides: Number

 ...
 */

Number.implement({

	limit: function (min, max) {
		return Math.min(max, Math.max(min, this));
	},

	round: function (precision) {
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function (fn, bind) {
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function () {
		return parseFloat(this);
	},

	toInt: function (base) {
		return parseInt(this, base || 10);
	}

});

// 这个比较有意思！取了个别名。Number.each == Number.times
Number.alias('each', 'times');

(function (math) {
	var methods = {};
	math.each(function (name) {
		if (!Number[name]) methods[name] = function () {
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);


/*
 ---

 name: Function

 description: Contains Function Prototypes like create, bind, pass, and delay.

 license: MIT-style license.

 requires: Type

 provides: Function

 ...
 */

Function.extend({

	// 安全的执行多个无参函数，这个是类静态方法。
	attempt: function () {
		for (var i = 0, l = arguments.length; i < l; i++) {
			try {
				return arguments[i]();
			} catch (e) { }
		}
		return null;
	}

});

Function.implement({

	// 这个是实例方法。
	attempt: function (args, bind) {
		try {
			return this.apply(bind, Array.from(args));
		} catch (e) { }

		return null;
	},

	// 假如没有bind函数，那么我们写一个！
	/*<!ES5-bind>*/
	bind: function (that) {
		var self = this,
			args = arguments.length > 1 ? Array.slice(arguments, 1) : null,
			F = function () { };

		var bound = function () {
			var context = that, length = arguments.length;
			if (this instanceof bound) {
				F.prototype = self.prototype;
				context = new F;
			}
			var result = (!args && !length)
				? self.call(context)    // 无参
				: self.apply(context, args && length ? args.concat(Array.slice(arguments)) : args || arguments);
			return context == that ? result : context;
		};
		return bound;
	},
	/*</!ES5-bind>*/

	pass: function (args, bind) {
		var self = this;
		if (args != null) args = Array.from(args);
		return function () {
			return self.apply(bind, args || arguments);
		};
	},

	delay: function (delay, bind, args) {
		return setTimeout(this.pass((args == null ? [] : args), bind), delay);
	},

	periodical: function (periodical, bind, args) {
		return setInterval(this.pass((args == null ? [] : args), bind), periodical);
	}

});




/*
 ---

 name: Object

 description: Object generic methods

 license: MIT-style license.

 requires: Type

 provides: [Object, Hash]

 ...
 */

(function () {

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	Object.extend({

		subset: function (object, keys) {
			var results = {};
			for (var i = 0, l = keys.length; i < l; i++) {
				var k = keys[i];
				if (k in object) results[k] = object[k];
			}
			return results;
		},

		map: function (object, fn, bind) {
			var results = {};
			for (var key in object) {
				if (hasOwnProperty.call(object, key)) results[key] = fn.call(bind, object[key], key, object);
			}
			return results;
		},

		filter: function (object, fn, bind) {
			var results = {};
			for (var key in object) {
				var value = object[key];
				if (hasOwnProperty.call(object, key) && fn.call(bind, value, key, object)) results[key] = value;
			}
			return results;
		},

		every: function (object, fn, bind) {
			for (var key in object) {
				if (hasOwnProperty.call(object, key) && !fn.call(bind, object[key], key)) return false;
			}
			return true;
		},

		some: function (object, fn, bind) {
			for (var key in object) {
				if (hasOwnProperty.call(object, key) && fn.call(bind, object[key], key)) return true;
			}
			return false;
		},

		keys: function (object) {
			var keys = [];
			for (var key in object) {
				if (hasOwnProperty.call(object, key)) keys.push(key);
			}
			return keys;
		},

		values: function (object) {
			var values = [];
			for (var key in object) {
				if (hasOwnProperty.call(object, key)) values.push(object[key]);
			}
			return values;
		},

		getLength: function (object) {
			return Object.keys(object).length;
		},

		keyOf: function (object, value) {
			for (var key in object) {
				if (hasOwnProperty.call(object, key) && object[key] === value) return key;
			}
			return null;
		},

		contains: function (object, value) {
			return Object.keyOf(object, value) != null;
		},

		toQueryString: function (object, base) {
			var queryString = [];

			Object.each(object, function (value, key) {
				if (base) key = base + '[' + key + ']';
				var result;
				switch (typeOf(value)) {
					case 'object': result = Object.toQueryString(value, key); break;
					case 'array':
						var qs = {};
						value.each(function (val, i) {
							qs[i] = val;
						});
						result = Object.toQueryString(qs, key);
						break;
					default: result = key + '=' + encodeURIComponent(value);
				}
				if (value != null) queryString.push(result);
			});

			return queryString.join('&');
		}

	});

})();




/*
 ---

 name: Class

 description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

 license: MIT-style license.

 requires: [Array, String, Function, Number]

 provides: Class

 ...
 */

(function () {

	// 这里其实分2步写会比较清楚：
	// function Class (params) { .... }
	// new Type('Class', Class);
	// Type注册函数会返回定义的function(params)。
	var Class = this.Class = new Type('Class', function (params) {
		// 如果参数是一个函数，那么就当成是initialize（初始化）函数
		if (instanceOf(params, Function)) params = { initialize: params };

		// 这个函数很关键，调用new Class()就会返回这个函数。当然这个函数的constructor是Function。
		// 所以不要去管返回的类型的constructor了。new Class(xxx).constructor == 这个函数。
		// 注意，外部函数的this是正在构建的Class的实例，而其内部的this是指向将来被构造的该类型的实例，
		// 这个和Class对象无关。
		// 细节：新建这个函数作为新建的类的原型， 然后调用extend函数把Class所有的成员复制给newClass，
		// 然后params对象implement到newClass类中，这里调用的implement是Class的implement方法。
		var newClass = function () {

			// 剥离这个this对象的外部一切关联。因为是原型继承，所以怕引用的类型会被所有实例共享。
			reset(this);
			// 在构造子类的过程中，MT会自动创建一个父类的实例，作为子类的原型，那么在构造父类的过程中
			// 是不应该调用其initialize函数的。应该由子类的initialize函数显式调用。
			if (newClass.$prototyping) return this;
			this.$caller = null;
			// 调用构造函数，这个initialize函数是通过implement(params)生成的。
			var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
			this.$caller = this.caller = null;
			return value;
		}.extend(this).implement(params);  // 这里的this是Class对象了！

		// 其实构造出来的实例的constructor都不太对，所以真实的一些信息都在这里保存。
		// 我们在使用过程中，应该使用$constructor，就像instanceOf那样。
		newClass.$constructor = Class;
		newClass.prototype.$constructor = newClass;

		// 这里的Parent是下面定义的Parent函数。这个是原型上的parent。
		newClass.prototype.parent = parent;

		// 注意哦，这里返回的是函数，而不是对象！所以 var Foo = new Class(XXX)；Foo不是对象是构造函数。
		return newClass;
	});

	// 这个是让子类调用父类被override的函数用的， 在子类的成员函数里面调用下this.parent()
	// 就可以了，连函数名都不用指定，因为这些必要的调用信息在wrap函数时提供。
	var parent = function () {

		// parent方法只能在子类里面调用，也就是说这个方法肯定是在wrap的wrapper函数内部被
		// 触发的，那么$caller肯定也就会被正确的设置了。$caller就是wrapper。
		if (!this.$caller) throw new Error('The method "parent" cannot be called.');

		var name = this.$caller.$name,  // 函数名
			parent = this.$caller.$owner.parent,    // 其实就是该对象的父类，可以用this.$constrcutor替代。
			previous = (parent) ? parent.prototype[name] : null;    // 父对象的函数
		if (!previous) throw new Error('The method "' + name + '" has no parent.');// 父对象一定要有子类的这个函数，不然怎么调用！
		return previous.apply(this, arguments); // 用this指针进行调用。
	};


	// [Refer to 棍子上的萝卜]
	// 对象的剥离(也就是clone),这里要详细说明一下reset函数的工作原理：
	// 首先创建了一个新的空函数F，然后将F的prototype属性设置为作为参数object传入的原型对象，prototype属性就是用来指向原型对象的，通过原型链机制，
	// 它提供了到所有继承而来的成员的链接，最后通过new运算符作用于F创建出一个新对象返回。这个新的对象就是一个以给定对象为原型对象的空对象，
	// 以下面的例子来解说，先执行reset(b)语句，然后读取b.ref.x的值，这时你得到的是其原型对象的同名属性值，其实是一个返指最初的a.x的链接，
	// 而在这之后你写入b.ref.x一个新值，也就是直接为b.ref对象定义了一个新的属性x，这时你再读取b.ref.x就不是指向a.x了
	// 如果想详细了解原型式继承可翻阅JavaScript设计模式一书，非常棒的一本书，真的很棒!!!哈哈......
	// var a = { x: 1 };
	// var b = { y: 2, ref: a };
	// log.info('b.ref == a : ' + (b.ref == a)); //输出true
	// log.info(b.y); // 输出2
	// log.info(b.ref.x); // 输出1
	// reset(b); //解除引用
	// log.info('b.ref == a : ' + (b.ref == a)); //输出false
	// log.info(b.y); // 输出2
	// log.info(b.ref.x); // 输出1
	// b.ref.x = 10;
	// log.info(b.ref.x); // 输出10
	// log.info(a.x); // 输出1
	var reset = function (object) {
		for (var key in object) {
			var value = object[key];
			switch (typeOf(value)) {
				case 'object':
					var F = function () { };
					F.prototype = value;
					object[key] = reset(new F);
					break;
				case 'array': object[key] = value.clone(); break;
			}
		}
		return object;
	};

	// 把成员函数包一下，并添加$owner, $origin, $name3个属性。最终真正执行的是被包过的wrapper。
	// 注意，这个函数配合parent函数是实现回溯调用的关键。回溯的意思是，假如类库有多级（C继承B，
	// B继承A，而且ABC上都实现了foo()函数，每一级的foo()都会调用其父类的foo。那么:
	// var c = new C(); c.foo()； 会一级一级正确的调用上去！
	var wrap = function (self, key, method) {

		if (method.$origin) method = method.$origin;

		// 真正执行的是这个函数，注意这里用了extend，保存了必要的信息。这些信息很重要！举个例子，
		// D是B的子类，B和D都有foo(), bar()，且B的foo()会调用bar()，那么D.foo()执行的时候，首先会调用B.foo()，
		// 而这时候B.foo()内部调用的bar()不是B的，而是D的！这个就是多态！
		var wrapper = function () {
			// 这里的设计真的很奇怪！假如这个成员函数是受保护的，那么只有在子类的同名函数里
			// 通过parent()来调用外，其他情况下都不能调用！包括这个类的实例或者其他成员函数！
			// 这个实在不知道为什么这么设计。。。。
			if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
			// 保留caller信息
			var caller = this.caller;
			// 保留$caller信息（最后一级的调用，this.$caller是空，但是回溯到上一级，
			// 那么$caller就指向前一次的wrapper函数。
			var current = this.$caller;
			// caller设置到$caller
			this.caller = current;
			// $caller指向wrapper本身，所以parent才能正确调用。因为parent每次都会从$caller取信息
			// 同时要注意，每次的回溯，$caller值会不一样。
			this.$caller = wrapper;
			// 触发成员函数的调用（注意，parent()会在这里面被调用，而一旦parent被调用，又会触发wrapper被
			// 再次调用，但是这个时候$caller已经不同了。
			var result = method.apply(this, arguments);
			// 还原，把$caller设置为null是重要的。
			this.$caller = current; this.caller = caller;
			return result;
		}.extend({ $owner: self, $origin: method, $name: key });    // this指针，函数本身，函数名。
		return wrapper;
	};


	// 核心函数：实现Extends/Implements，成员函数的包装，普通属性的附加。
	var implement = function (key, value, retain) {

		// 对于特定的key，即：Extends, Implements，把逻辑交给Clas.Mutators类处理。
		// 该类负责把对value进行一些处理。这个很灵活，但是你的成员函数就不能取这2个
		// 名字了。
		if (Class.Mutators.hasOwnProperty(key)) {
			value = Class.Mutators[key].call(this, value);
			// 假如处理后的value变成了null，那么就停止后续的处理了。Extends和
			// Implements的返回值都是null。
			if (value == null) return this;
		}
		// 所有的成员函数，都会被包在wrap函数内部，wrap负责保存一些场景信息，以便
		// 子类调用父类用。要注意，hidden函数会被跳过。(Extends和Implements都回
		// 返回null）
		if (typeOf(value) == 'function') {
			// 拿不走hidden的
			if (value.$hidden) return this;
			// 在Impements内部调用本函数时retain参数设为ture，表明只是合并方法到原型中，
			// 不用包一下。而在其他时候，用wrap函数包
			this.prototype[key] = (retain) ? value : wrap(this, key, value);
		} else {
			// 普通的属性是会被覆盖的。
			Object.merge(this.prototype, key, value);
		}

		return this;
	};

	// 构建一个实例。注意klass是一个构造函数！
	var getInstance = function (klass) {
		// 标记一下，防止klass的initialize函数被调用。
		klass.$prototyping = true;
		var proto = new klass;
		delete klass.$prototyping;
		return proto;
	};

	// 设置Class.implement方法
	Class.implement('implement', implement.overloadSetter());

	// [Refer to 棍子上的萝卜]
	// Mutator是一个可以改变你的类的结构的一个很特殊的函数，它们是产生特别功能和优雅化继承和掺元的的有力工具。
	// 建立一个Mutatorr有二个部分：mutator的关键字 和mutator的实际函数，关键字既是mutator的名字，
	// 也是在构建类时候的keyword。Mootools把mutators 储存在Class.Mutators对象中。
	// 当你传一个对象给Class构造函数的时候，Mootools检查这个对象的的每一个键在Class.Mutators对象的是不是有
	// mutator函数的对应的名字在里面。如果找到了，它就调用这个函数并且把键的值传给它做处理。
	// Class.Mutators对象包含了两个内建的Mutator: Extends 和 Implements，分别实现原型式继承和多亲继承。
	// MooTools在Class.Extras模块中提供了三个掺元类Chain、Events、Options，至于作用就不用多说了吧，呵呵。
	Class.Mutators = {

		// 这里会重写原型，所以Extends属性一定要放在最前面传入！
		Extends: function (parent) {

			// 添加了parent属性。注意和原型上的parent这个parent是新的类型上的，而不是原型上的。
			// 原型上还有另外一个parent函数。。。这2个Parent好乱。
			this.parent = parent;

			// 改写了原型链，而且注意，是新建了一个实例，所以不存在信息会共享的情况。但是MT在
			// 这里没有修正constrcutor信息。还有，那些基类的成员函数，自动的被继承过来了，这个
			// 对于实现回溯调用也起到了一定的作用。
			this.prototype = getInstance(parent);
		},

		// items必须是一个或多个构造函数，而不能是简单的对象。
		Implements: function (items) {
			Array.from(items).each(function (item) {
				var instance = new item;
				for (var key in instance) implement.call(this, key, instance[key], true);
			}, this);
		}
	};

})();


/*
 ---

 name: Class.Extras

 description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

 license: MIT-style license.

 requires: Class

 provides: [Class.Extras, Chain, Events, Options]

 ...
 */

(function () {

	// 这个就是一个很普通的队列的实现
	this.Chain = new Class({

		$chain: [],

		// 入队
		chain: function () {
			this.$chain.append(Array.flatten(arguments));
			return this;
		},

		// 出队并执行，使用这个语句让他出队执行完毕：
		// while (false !== XXX.callChain()) {}
		callChain: function () {
			return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
		},

		// 清楚队列
		clearChain: function () {
			this.$chain.empty();
			return this;
		}

	});

	// 把onXyyy变成xyyy（把前缀on去掉，把去调之后的第一个字符变成小写）
	// 其实隐含的限制就是：事件类型必须是on开头的。
	var removeOn = function (string) {
		return string.replace(/^on([A-Z])/, function (full, first) {
			return first.toLowerCase();
		});
	};

	this.Events = new Class({

		$events: {},

		// 往事件队列里面塞一个事件处理程序。根据文档，internal是为了避免被remove。。。
		addEvent: function (type, fn, internal) {
			type = removeOn(type);


			// 建立一个改事件类型的数组，把事件处理程序塞进去（不会重复）。
			this.$events[type] = (this.$events[type] || []).include(fn);

			// 标记为internal，这个标记在原函数对象上。。。is it OK？
			if (internal) fn.internal = true;
			return this;
		},

		// 往事件队列里面塞多个事件处理程序，传入的时对象字面量
		addEvents: function (events) {
			for (var type in events) this.addEvent(type, events[type]);
			return this;
		},

		// 触发事件，传入“事件类型、参数、延迟”。还支持延迟，HOHO
		fireEvent: function (type, args, delay) {

			type = removeOn(type);
			var events = this.$events[type];

			// 该事件类型没注册，直接走人
			if (!events) return this;
			args = Array.from(args);

			// 使用this指针绑定调用事件处理程序
			events.each(function (fn) {
				if (delay) fn.delay(delay, this, args);
				else fn.apply(this, args);
			}, this);
			return this;
		},

		// 移除掉某一事件处理程序（不能移除被标记为internal的）
		removeEvent: function (type, fn) {
			type = removeOn(type);
			var events = this.$events[type];
			if (events && !fn.internal) {
				var index = events.indexOf(fn);
				if (index != -1) delete events[index];
			}
			return this;
		},

		// 移除掉某一事件处理程序（不能移除被标记为internal的）。哎，这个函数提供的功能有点不一致啊！！真头痛！
		removeEvents: function (events) {
			var type;
			if (typeOf(events) == 'object') {
				// 这种情况下，移除多个事件处理程序。
				for (type in events) this.removeEvent(type, events[type]);
				return this;
			}

			// 移除该事件类型的所有事件处理程序（internal的不会被移除，因为其内部调用removeEvent）
			if (events) events = removeOn(events);
			for (type in this.$events) {
				if (events && events != type) continue;
				var fns = this.$events[type];
				for (var i = fns.length; i--;) if (i in fns) {
					this.removeEvent(type, fns[i]);
				}
			}
			return this;
		}

	});

	this.Options = new Class({

		// 一种功能是：统一添加事件处理程序。传入类似于{onClick: fuction(){}, onDblClick: function(){}}这种的。
		// 另外种功能就是把key/value插入到options成员中（但是会做深拷贝），比如： {"size": 3, "color" : red },
		// 具体可以看文档，要避免深拷贝的话，可以把值用函数封装：{ "size": function(){ return mSize; }
		setOptions: function () {

			// 把属性/值合并到options数组（我觉得可能这个Extras是为了客户端代码服务的吧！因为太specific了。
			var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));

			// 和Events Extras协同工作。
			if (this.addEvent) for (var option in options) {
				// 假如key/value匹配： onXXX : function(){}的话，就注册一个事件。
				if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
				this.addEvent(option, options[option]);
				delete options[option];
			}
			return this;
		}

	});

})();


/*
 ---

 name: JSON

 description: JSON encoder and decoder.

 license: MIT-style license.

 SeeAlso: <http://www.json.org/>

 requires: [Array, String, Number, Function]

 provides: JSON

 ...
 */

if (typeof JSON == 'undefined') this.JSON = {};



(function () {

	var special = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\' };

	var escape = function (chr) {
		return special[chr] || '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
	};

	JSON.validate = function (string) {
		string = string.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
		replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
		replace(/(?:^|:|,)(?:\s*\[)+/g, '');

		return (/^[\],:{}\s]*$/).test(string);
	};

	JSON.encode = JSON.stringify ? function (obj) {
		return JSON.stringify(obj);
	} : function (obj) {
		if (obj && obj.toJSON) obj = obj.toJSON();

		switch (typeOf(obj)) {
			case 'string':
				return '"' + obj.replace(/[\x00-\x1f\\"]/g, escape) + '"';
			case 'array':
				return '[' + obj.map(JSON.encode).clean() + ']';
			case 'object': case 'hash':
			var string = [];
			Object.each(obj, function (value, key) {
				var json = JSON.encode(value);
				if (json) string.push(JSON.encode(key) + ':' + json);
			});
			return '{' + string + '}';
			case 'number': case 'boolean': return '' + obj;
			case 'null': return 'null';
		}

		return null;
	};

	JSON.decode = function (string, secure) {
		if (!string || typeOf(string) != 'string') return null;

		if (secure || JSON.secure) {
			if (JSON.parse) return JSON.parse(string);
			if (!JSON.validate(string)) throw new Error('JSON could not decode the input; security is enabled and the value is not secure.');
		}

		return eval('(' + string + ')');
	};

})();
