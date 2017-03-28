import { clone, extend } from './util';
import { h } from './h';

/**
 * Clone a VNode with new props
 *
 * @export
 * @param {VNode} vnode
 * @param {Object} props
 * @returns
 */
export function cloneElement(vnode, props, /* child nodes */) {
	return h(
		vnode.nodeName,
		extend(clone(vnode.attributes), props),
		// precedence: (new child nodes) > (vnode.children)
		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	);
}
