import { assign, slice } from './util';
import { createVNode } from './create-element';
import { NULL } from './constants';
import type { VNode, ComponentChildren } from './internal';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its
 * children.
 */
export function cloneElement(
	vnode: VNode,
	props?: Record<string, any>,
	children?: ComponentChildren
): VNode {
	let normalizedProps: Record<string, any> = assign({}, vnode.props),
		key: string | number | null | undefined,
		ref: VNode['ref'],
		i: string;

	for (i in props) {
		if (i == 'key') key = props![i];
		else if (i == 'ref' && typeof vnode.type != 'function') ref = props![i];
		else normalizedProps[i] = props![i];
	}

	if (arguments.length > 2) {
		normalizedProps.children =
			arguments.length > 3 ? slice.call(arguments, 2) : children;
	}

	return createVNode(
		vnode.type,
		normalizedProps,
		key || vnode.key,
		ref || vnode.ref,
		NULL
	);
}
