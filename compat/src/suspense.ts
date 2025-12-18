import {
	Component,
	createElement,
	options as _options,
	Fragment
} from 'preact';
import {
	MODE_HYDRATE,
	FORCE_PROPS_REVALIDATE,
	COMPONENT_FORCE
} from '../../src/constants';
import { assign } from './util';
import type {
	VNode,
	Component as CompatComponent,
	SuspenseComponent,
	SuspenseState
} from './internal';
import type { Options } from '../../src/internal';

const options = _options as Options;

export interface SuspenseProps {
	children?: any;
	fallback?: any;
}

const oldCatchError = options._catchError;
options._catchError = function (
	error: any,
	newVNode: VNode,
	oldVNode: VNode | undefined,
	errorInfo: any
) {
	if (error.then) {
		let component: CompatComponent | undefined;
		let vnode: VNode | null = newVNode;

		for (; (vnode = (vnode as any)._parent); ) {
			if (
				(component = (vnode as any)._component) &&
				(component as any)._childDidSuspend
			) {
				if ((newVNode as any)._dom == null) {
					(newVNode as any)._dom = (oldVNode as any)._dom;
					(newVNode as any)._children = (oldVNode as any)._children;
				}
				// Don't call oldCatchError if we found a Suspense
				return (component as any)._childDidSuspend(error, newVNode);
			}
		}
	}
	oldCatchError!(error, newVNode as any, oldVNode as any, errorInfo);
};

const oldUnmount = options.unmount;
options.unmount = function (vnode: VNode) {
	const component = (vnode as any)._component as CompatComponent | undefined;
	if (component && component._onResolve) {
		component._onResolve();
	}

	if (oldUnmount) oldUnmount(vnode as any);
};

function detachedClone(
	vnode: VNode | null,
	detachedParent: any,
	parentDom: any
): VNode | null {
	if (vnode) {
		if ((vnode as any)._component && (vnode as any)._component.__hooks) {
			(vnode as any)._component.__hooks._list.forEach((effect: any) => {
				if (typeof effect._cleanup == 'function') effect._cleanup();
			});

			(vnode as any)._component.__hooks = null;
		}

		vnode = assign({}, vnode) as VNode;
		if ((vnode as any)._component != null) {
			if ((vnode as any)._component._parentDom === parentDom) {
				(vnode as any)._component._parentDom = detachedParent;
			}

			(vnode as any)._component._bits |= COMPONENT_FORCE;

			(vnode as any)._component = null;
		}

		(vnode as any)._children =
			(vnode as any)._children &&
			(vnode as any)._children.map((child: VNode) =>
				detachedClone(child, detachedParent, parentDom)
			);
	}

	return vnode;
}

function removeOriginal(
	vnode: VNode | null,
	detachedParent: any,
	originalParent: any
): VNode | null {
	if (vnode && originalParent) {
		if (typeof vnode.type == 'string') {
			(vnode as any)._flags |= FORCE_PROPS_REVALIDATE;
		}

		(vnode as any)._original = null;
		(vnode as any)._children =
			(vnode as any)._children &&
			(vnode as any)._children.map((child: VNode) =>
				removeOriginal(child, detachedParent, originalParent)
			);

		if ((vnode as any)._component) {
			if ((vnode as any)._component._parentDom === detachedParent) {
				if ((vnode as any)._dom) {
					originalParent.appendChild((vnode as any)._dom);
				}
				(vnode as any)._component._bits |= COMPONENT_FORCE;
				(vnode as any)._component._parentDom = originalParent;
			}
		}
	}

	return vnode;
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense(this: SuspenseComponent): void {
	// we do not call super here to golf some bytes...
	this._pendingSuspensionCount = 0;
	this._suspenders = null!;
	this._detachOnNextRender = null;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
Suspense.prototype = new (Component as any)();

/**
 * @this {SuspenseComponent}
 */
(Suspense.prototype as any)._childDidSuspend = function (
	this: SuspenseComponent,
	promise: Promise<any>,
	suspendingVNode: VNode
): void {
	const suspendingComponent = (suspendingVNode as any)
		._component as CompatComponent;

	const c = this;

	if (c._suspenders == null) {
		c._suspenders = [];
	}
	c._suspenders.push(suspendingComponent);

	let resolved = false;
	const onResolved = () => {
		if (resolved) return;

		resolved = true;
		suspendingComponent._onResolve = undefined;

		onSuspensionComplete();
	};

	suspendingComponent._onResolve = onResolved;

	const onSuspensionComplete = () => {
		if (!--c._pendingSuspensionCount) {
			// If the suspension was during hydration we don't need to restore the
			// suspended children into the _children array
			if (c.state._suspended) {
				const suspendedVNode = c.state._suspended;
				(c as any)._vnode._children[0] = removeOriginal(
					suspendedVNode,
					(suspendedVNode as any)._component._parentDom,
					(suspendedVNode as any)._component._originalParentDom
				);
			}

			c.setState({ _suspended: (c._detachOnNextRender = null) });

			let suspended: CompatComponent | undefined;
			while ((suspended = c._suspenders.pop())) {
				suspended.forceUpdate();
			}
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup
	 * to remain on screen and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallback -> component flow would occour.
	 */
	if (
		!c._pendingSuspensionCount++ &&
		!((suspendingVNode as any)._flags & MODE_HYDRATE)
	) {
		c.setState({
			_suspended: (c._detachOnNextRender = (c as any)._vnode._children[0])
		});
	}
	promise.then(onResolved, onResolved);
};

Suspense.prototype.componentWillUnmount = function (
	this: SuspenseComponent
): void {
	this._suspenders = [];
};

/**
 * @this {SuspenseComponent}
 */
Suspense.prototype.render = function (
	this: SuspenseComponent,
	props: SuspenseProps,
	state: SuspenseState
): any[] {
	if (this._detachOnNextRender) {
		// When the Suspense's _vnode was created by a call to createVNode
		// (i.e. due to a setState further up in the tree)
		// it's _children prop is null, in this case we "forget" about the parked vnodes to detach
		if ((this as any)._vnode._children) {
			const detachedParent = document.createElement('div');
			const detachedComponent = (this as any)._vnode._children[0]._component;
			(this as any)._vnode._children[0] = detachedClone(
				this._detachOnNextRender,
				detachedParent,
				(detachedComponent._originalParentDom = detachedComponent._parentDom)
			);
		}

		this._detachOnNextRender = null;
	}

	return [
		createElement(Fragment, null, state._suspended ? null : props.children),
		state._suspended && createElement(Fragment, null, props.fallback)
	];
};

export function lazy<T extends { default: any }>(
	loader: () => Promise<T>
): (props: any) => any {
	let prom: Promise<T> | undefined;
	let component: any = null;
	let error: any;
	let resolved: boolean;

	function Lazy(props: any) {
		if (!prom) {
			prom = loader();
			prom.then(
				exports => {
					if (exports) {
						component = exports.default || exports;
					}
					resolved = true;
				},
				e => {
					error = e;
					resolved = true;
				}
			);
		}

		if (error) {
			throw error;
		}

		if (!resolved) {
			throw prom;
		}

		return component ? createElement(component, props) : null;
	}

	Lazy.displayName = 'Lazy';
	return Lazy;
}
