import { createElement, render } from 'preact';
import type { VNode, PreactElement, Component } from './internal';

function ContextProvider(this: any, props: { context: any; children: any }) {
	this.getChildContext = () => props.context;
	return props.children;
}

/**
 * Portal component
 */
function Portal(this: Component, props: { _vnode: VNode; _container: any }) {
	const _this = this;
	let container = props._container;

	_this.componentWillUnmount = function () {
		render(null, (_this as any)._temp);
		(_this as any)._temp = null;
		(_this as any)._container = null;
	};

	// When we change container we should clear our old container and
	// indicate a new mount.
	if ((_this as any)._container && (_this as any)._container !== container) {
		(_this as any).componentWillUnmount();
	}

	if (!(_this as any)._temp) {
		// Ensure the element has a mask for useId invocations
		let root = (_this as any)._vnode;
		while (root !== null && !root._mask && root._parent !== null) {
			root = root._parent;
		}

		(_this as any)._container = container;

		// Create a fake DOM parent node that manages a subset of `container`'s children:
		(_this as any)._temp = {
			nodeType: 1,
			parentNode: container,
			childNodes: [],
			_children: { _mask: root._mask },
			ownerDocument: container.ownerDocument,
			insertBefore(child: Node, before: Node | null) {
				(this as any).childNodes.push(child);
				(_this as any)._container.insertBefore(child, before);
			}
		};
	}

	// Render our wrapping element into temp.
	render(
		createElement(ContextProvider as any, {
			context: (_this as any).context,
			children: props._vnode
		}),
		(_this as any)._temp
	);
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 */
export function createPortal(vnode: VNode, container: PreactElement): VNode {
	const el = createElement(Portal as any, {
		_vnode: vnode,
		_container: container
	}) as VNode;
	(el as any).containerInfo = container;
	return el;
}
