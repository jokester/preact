import { VNode } from './vnode';
import options from './options';


const stack = [];

const EMPTY_CHILDREN = [];

/** JSX/hyperscript reviver
 * 将JSX转换为VNode
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 */
export function h(nodeName, attributes) {
	// children: 所有直接children
	let children=EMPTY_CHILDREN, lastSimple, child, simple, i;
	// 将第3个及之后的参数压入stack栈
	// 注意: stack的顺序是和arguments相反的，比如arguments[3] 会最后被push，成为stack[stack.length-1]
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments[i]);
	}
	// 如果stack是空的，从props中的children属性获取children
	if (attributes && attributes.children!=null) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	// 展开stack中的嵌套数组
	while (stack.length) {
		// 注意: 最后被push的会最先被pop，因此展开后的children和arguments中的顺序一致
		if ((child = stack.pop()) && child.pop!==undefined) {
			for (i=child.length; i--; ) stack.push(child[i]);
		}
		else {
			if (child===true || child===false) child = null;

			// "simple": text node
			if ((simple = typeof nodeName!=='function')) {
				if (child==null) child = '';
				else if (typeof child==='number') child = String(child);
				else if (typeof child!=='string') simple = false;
			}

			// 将两个连续的Text Node合并成一个
			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			// 在pop出第一个child时才创建新的children数组，避免在无children时创建空数组
			else if (children===EMPTY_CHILDREN) {
				children = [child];
			}
			else {
				children.push(child);
			}

			lastSimple = simple;
		}
	}

	// 创建和初始化VNode对象
	let p = new VNode();
	p.nodeName = nodeName;
	p.children = children;
	p.attributes = attributes==null ? undefined : attributes;
	p.key = attributes==null ? undefined : attributes.key;

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode!==undefined) options.vnode(p);

	return p;
}
