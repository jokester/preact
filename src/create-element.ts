import options from './options';
import { TypedPreact } from './typed-preact';
import { TypedPreactInternal } from './internal';
import { EMPTY_OBJ } from './constants';
import { presume } from './util';

/**
 * Create an virtual node (used for JSX)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * constructor for this virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {Array<import('.').ComponentChildren>} [children] The children of the virtual node
 * @returns {import('./internal').VNode}
 */
export function createElement<
	C extends string | TypedPreact.ComponentType<P>,
	P extends TypedPreact.NormalizedProps
>(
	type: C,
	props: P | null | undefined,
	...children: TypedPreact.ComponentChildren[]
): TypedPreact.VNode<P> {
	let normalizedProps: TypedPreact.NormalizedProps = {} as any,
		key,
		ref: undefined | TypedPreact.Ref<any>,
		i;
	for (i in props || EMPTY_OBJ) {
		presume<TypedPreact.NormalizedProps>(props);
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
	}

	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (i = 3; i < arguments.length; i++) {
			(children as TypedPreact.ComponentChild[]).push(
				arguments[i] as TypedPreact.ComponentChild
			);
		}
	}
	if (children != null) {
		normalizedProps.children = children;
	}

	// If a Component VNode, check for and apply defaultProps
	// Note: type may be undefined in development, must never error here.
	if (
		typeof type == 'function' &&
		(type as TypedPreact.ComponentClass<P>).defaultProps != null
	) {
		const t = type as TypedPreact.ComponentClass<P>;
		for (i in t.defaultProps) {
			if (normalizedProps[i] === undefined) {
				normalizedProps[i] = t.defaultProps![i];
			}
		}
	}

	return createVNode<C, P>(type, normalizedProps as P, key, ref, null);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @param {import('./internal').VNode["ref"]} ref The ref property that will
 * receive a reference to its created child
 * @returns {import('./internal').VNode}
 */
export function createVNode<
	C extends string | TypedPreact.ComponentType<P>,
	P extends TypedPreact.NormalizedProps
>(
	type: C,
	props: P,
	key: string | number | undefined,
	ref: TypedPreact.Ref<any> | null | undefined,
	original: null
): TypedPreact.VNode<P> {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	const vnode: TypedPreactInternal.VNode<P> = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		// _nextDom must be initialized to undefined b/c it will eventually
		// be set to dom.nextSibling which can return `null` and it is important
		// to be able to distinguish between an uninitialized _nextDom and
		// a _nextDom that has been set to `null`
		_nextDom: null,
		_component: null,
		_hydrating: null,
		constructor: undefined,
		_original: original
	};

	if (original == null) vnode._original = vnode;
	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

export function createRef() {
	return { current: null };
}

export const Fragment: TypedPreact.FunctionComponent<TypedPreact.NormalizedProps> = props => {
	return props.children as TypedPreact.VNode<any> | null;
};

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is import('./internal').VNode}
 */
export const isValidElement = (vnode: TypedPreact.VNode) =>
	vnode != null && vnode.constructor === undefined;
