import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';
import type { VNode, Component, PreactElement } from './internal';
import {
	COMPONENT_FORCE,
	COMPONENT_DIRTY,
	MODE_HYDRATE,
	NULL
} from './constants';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 */
export function BaseComponent(
	this: Component,
	props: object,
	context: object
): void {
	this.props = props;
	this.context = context;
	this._bits = 0;
}

/**
 * Update component state and schedule a re-render.
 */
BaseComponent.prototype.setState = function (
	this: Component,
	update: object | ((s: object, p: object) => object),
	callback?: () => void
): void {
	// only clone state when copying to nextState the first time.
	let s: any;
	if (this._nextState != NULL && this._nextState != this.state) {
		s = this._nextState;
	} else {
		s = this._nextState = assign({}, this.state);
	}

	if (typeof update == 'function') {
		// Some libraries like `immer` mark the current state as readonly,
		// preventing us from mutating it, so we need to clone it. See #2716
		update = update(assign({}, s), this.props);
	}

	if (update) {
		assign(s, update);
	} else {
		return;
	}

	if (this._vnode) {
		if (callback) {
			this._stateCallbacks.push(callback);
		}
		enqueueRender(this);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 */
BaseComponent.prototype.forceUpdate = function (
	this: Component,
	callback?: () => void
): void {
	if (this._vnode) {
		// Set render mode so that we can differentiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		this._bits |= COMPONENT_FORCE;
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](https://jasonformat.com/wtf-is-jsx).
 */
BaseComponent.prototype.render = Fragment;

/**
 * Get the next DOM sibling for a VNode
 */
export function getDomSibling(
	vnode: VNode,
	childIndex?: number | null
): PreactElement | null {
	if (childIndex == NULL) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._index + 1)
			: NULL;
	}

	let sibling: VNode | null;
	for (; childIndex < vnode._children!.length; childIndex++) {
		sibling = vnode._children![childIndex];

		if (sibling != NULL && sibling._dom != NULL) {
			// Since updateParentDomPointers keeps _dom pointer correct,
			// we can rely on _dom to tell us if this subtree contains a
			// rendered DOM node, and what the first rendered DOM node is
			return sibling._dom;
		}
	}

	// If we get here, we have not found a DOM node in this vnode's children.
	// We must resume from this vnode's sibling (in it's parent _children array)
	// Only climb up and search the parent if we aren't searching through a DOM
	// VNode (meaning we reached the DOM parent of the original vnode that began
	// the search)
	return typeof vnode.type == 'function' ? getDomSibling(vnode) : NULL;
}

/**
 * Trigger in-place re-rendering of a component.
 */
function renderComponent(component: Component): void {
	let oldVNode = component._vnode!,
		oldDom = oldVNode._dom,
		commitQueue: Component[] = [],
		refQueue: any[] = [];

	const parentDom = component._parentDom;
	if (parentDom) {
		const newVNode = assign({}, oldVNode) as VNode;
		newVNode._original = oldVNode._original + 1;
		if (options.vnode) options.vnode(newVNode as any);

		diff(
			parentDom,
			newVNode,
			oldVNode,
			component._globalContext,
			parentDom.namespaceURI!,
			oldVNode._flags & MODE_HYDRATE ? [oldDom!] : NULL,
			commitQueue,
			oldDom == NULL ? getDomSibling(oldVNode) : oldDom,
			!!(oldVNode._flags & MODE_HYDRATE),
			refQueue,
			parentDom.ownerDocument
		);

		newVNode._original = oldVNode._original;
		newVNode._parent!._children![newVNode._index] = newVNode;
		commitRoot(commitQueue, newVNode, refQueue);
		oldVNode._parent = oldVNode._dom = NULL;

		if (newVNode._dom != oldDom) {
			updateParentDomPointers(newVNode);
		}
	}
}

function updateParentDomPointers(vnode: VNode | null): void {
	if ((vnode = vnode!._parent) != NULL && vnode._component != NULL) {
		vnode._dom = NULL;
		for (let i = 0; i < vnode._children!.length; i++) {
			let child = vnode._children![i];
			if (child != NULL && child._dom != NULL) {
				vnode._dom = child._dom;
				break;
			}
		}

		return updateParentDomPointers(vnode);
	}
}

/**
 * The render queue
 */
let rerenderQueue: Component[] = [];

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */

let prevDebounce: typeof options.debounceRendering,
	rerenderCount = 0;

export function resetRenderCount(): void {
	rerenderCount = 0;
}

/**
 * Enqueue a rerender of a component
 */
export function enqueueRender(c: Component): void {
	if (
		(!(c._bits & COMPONENT_DIRTY) &&
			(c._bits |= COMPONENT_DIRTY) &&
			rerenderQueue.push(c) &&
			!rerenderCount++) ||
		prevDebounce != options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || queueMicrotask)(process);
	}
}

const depthSort = (a: Component, b: Component): number =>
	a._vnode!._depth! - b._vnode!._depth!;

/** Flush the render queue by rerendering all queued components */
function process(): void {
	let c: Component | undefined,
		l = 1;

	// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
	// process() calls from getting scheduled while `queue` is still being consumed.
	while (rerenderQueue.length) {
		// Keep the rerender queue sorted by (depth, insertion order). The queue
		// will initially be sorted on the first iteration only if it has more than 1 item.
		//
		// New items can be added to the queue e.g. when rerendering a provider, so we want to
		// keep the order from top to bottom with those new items so we can handle them in a
		// single pass
		if (rerenderQueue.length > l) {
			rerenderQueue.sort(depthSort);
		}

		c = rerenderQueue.shift();
		l = rerenderQueue.length;

		if (c!._bits & COMPONENT_DIRTY) {
			renderComponent(c!);
		}
	}

	rerenderCount = 0;
}
