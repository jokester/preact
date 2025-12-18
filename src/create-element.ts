import { slice } from './util';
import options from './options';
import { NULL, UNDEFINED } from './constants';
import type { VNode, ComponentChildren, Ref } from './internal';

let vnodeId = 0;

/**
 * Create an virtual node (used for JSX)
 */
export function createElement(
	type: VNode['type'],
	props?: Record<string, any> | null,
	children?: ComponentChildren
): VNode {
	let normalizedProps: Record<string, any> = {},
		key: string | number | null | undefined,
		ref: Ref<any> | undefined,
		i: string;

	for (i in props) {
		if (i == 'key') key = props![i];
		else if (i == 'ref' && typeof type != 'function') ref = props![i];
		else normalizedProps[i] = props![i];
	}

	if (arguments.length > 2) {
		normalizedProps.children =
			arguments.length > 3 ? slice.call(arguments, 2) : children;
	}

	return createVNode(type, normalizedProps, key, ref, NULL);
}

/**
 * Create a VNode (used internally by Preact)
 */
export function createVNode(
	type: VNode['type'],
	props: object | string | number | null,
	key: string | number | null | undefined,
	ref: Ref<any> | null | undefined,
	original: number | null
): VNode {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	const vnode: VNode = {
		type,
		props: props as any,
		key: key ?? null,
		ref: ref ?? null,
		_children: NULL,
		_parent: NULL,
		_depth: 0,
		_dom: NULL,
		_component: NULL,
		constructor: UNDEFINED as undefined,
		_original: original == NULL ? ++vnodeId : original,
		_index: -1,
		_flags: 0
	};

	// Only invoke the vnode hook if this was *not* a direct copy:
	if (original == NULL && options.vnode != NULL) options.vnode(vnode as any);

	return vnode;
}

export function createRef<T = any>(): { current: T | null } {
	return { current: NULL };
}

export function Fragment(props: {
	children: ComponentChildren;
}): ComponentChildren {
	return props.children;
}

/**
 * Check if a the argument is a valid Preact VNode.
 */
export const isValidElement = (vnode: any): vnode is VNode =>
	vnode != NULL && vnode.constructor == UNDEFINED;
