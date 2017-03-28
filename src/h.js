import { VNode } from './vnode';
import options from './options';

/**
 * h(): convert  (jsx literal?) to VNode
 *
 *
 */

/**
 * stack: first elements have larger index
 */
const stack = [];

const EMPTY_CHILDREN = [];

/** JSX/hyperscript reviver
 *
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes, /* ...child nodes */) {
	let children, lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children) {
		// add attributes.children to stack, only if there is only 2 arguments
		// (e.g. no child nodes in 3rd parameter)
		// which makes precendes (child nodes) > (attributes.children)
		// TODO why? is this a spec or convention?
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	// flatten (possibly nested) array in stack, to "children" variable
	while (stack.length) {
		if ((child = stack.pop()) instanceof Array) {
			for (i=child.length; i--; ) stack.push(child[i]);
		}
		else if (child!=null && child!==true && child!==false) {
			if (typeof child=='number') child = String(child);
			simple = typeof child=='string';
			if (simple && lastSimple) {
				// when this and prev child are both string, concat them
				children[children.length-1] += child;
			}
			else {
				// children: (string | vnode)[]
				(children || (children = [])).push(child);
				lastSimple = simple;
			}
		} /* else: ignore falsy / boolean child */
	}

	let p = new VNode(nodeName, attributes || undefined, children || EMPTY_CHILDREN);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}
