import { EMPTY_OBJ, MODE_HYDRATE, NULL } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';
import { slice } from './util';
import type { ComponentChild, PreactElement, VNode } from './internal';

/**
 * Render a Preact virtual node into a DOM element
 */
export function render(vnode: ComponentChild, parentDom: PreactElement): void {
	// https://github.com/preactjs/preact/issues/3794
	if ((parentDom as unknown) == document) {
		parentDom = document.documentElement as unknown as PreactElement;
	}

	if (options._root) options._root(vnode, parentDom);

	let isHydrating = vnode && (vnode as VNode)._flags & MODE_HYDRATE;

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	let oldVNode = isHydrating ? NULL : parentDom._children;

	parentDom._children = createElement(Fragment as any, NULL, [
		vnode
	]) as unknown as VNode;

	// List of effects that need to be called after diffing.
	let commitQueue: any[] = [],
		refQueue: any[] = [];

	diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		parentDom._children as unknown as VNode,
		(oldVNode || EMPTY_OBJ) as VNode,
		EMPTY_OBJ,
		parentDom.namespaceURI!,
		oldVNode
			? NULL
			: parentDom.firstChild
				? slice.call((parentDom as any).childNodes)
				: NULL,
		commitQueue,
		oldVNode ? oldVNode._dom : (parentDom as any).firstChild,
		// @ts-expect-error we are doing a bit-wise operation so it's either 0 or true
		isHydrating,
		refQueue,
		parentDom.ownerDocument
	);

	// Flush all queued effects
	commitRoot(commitQueue, parentDom._children as unknown as VNode, refQueue);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 */
export function hydrate(vnode: ComponentChild, parentDom: PreactElement): void {
	(vnode as VNode)._flags |= MODE_HYDRATE;
	render(vnode, parentDom);
}
