import { assign } from './util';
import { createVNode } from './create-element';
import { TypedPreact } from './typed-preact';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./index').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 * @returns {import('./internal').VNode}
 */
export function cloneElement<P extends TypedPreact.NormalizedProps>(
	vnode: TypedPreact.VNode<P>,
	props: P,
	...children: TypedPreact.ComponentChildren[]
): TypedPreact.VNode<P> {
	let normalizedProps: TypedPreact.NormalizedProps = assign({}, vnode.props),
		key,
		ref,
		i;
	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (arguments.length > 3) {
		children = [children];
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	if (children != null) {
		normalizedProps.children = children;
	}

	return createVNode<typeof vnode.type, P>(
		vnode.type,
		normalizedProps as P,
		key || vnode.key,
		ref || vnode.ref,
		null
	);
}
