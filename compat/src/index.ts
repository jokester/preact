import {
	createElement,
	render as preactRender,
	cloneElement as preactCloneElement,
	createRef,
	Component,
	createContext,
	Fragment
} from 'preact';
import {
	useState,
	useId,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue
} from 'preact/hooks';
import {
	useInsertionEffect,
	startTransition,
	useDeferredValue,
	useSyncExternalStore,
	useTransition
} from './hooks';
import { PureComponent } from './PureComponent';
import { memo } from './memo';
import { forwardRef } from './forwardRef';
import { Children } from './Children';
import { Suspense, lazy } from './suspense';
import { createPortal } from './portals';
import {
	hydrate,
	render,
	REACT_ELEMENT_TYPE,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
} from './render';
import type {
	VNode,
	PreactElement,
	Component as CompatComponent
} from './internal';

const version = '18.3.1'; // trick libraries to think we are react

/**
 * Legacy version of createElement.
 */
function createFactory(type: VNode['type']): (...args: any[]) => any {
	return createElement.bind(null, type as any);
}

/**
 * Check if the passed element is a valid (p)react node.
 */
function isValidElement(element: any): boolean {
	return !!element && element.$$typeof === REACT_ELEMENT_TYPE;
}

/**
 * Check if the passed element is a Fragment node.
 */
function isFragment(element: any): boolean {
	return isValidElement(element) && element.type === Fragment;
}

/**
 * Check if the passed element is a Memo node.
 */
function isMemo(element: any): boolean {
	return (
		!!element &&
		!!element.displayName &&
		(typeof element.displayName === 'string' ||
			element.displayName instanceof String) &&
		element.displayName.startsWith('Memo(')
	);
}

/**
 * Wrap `cloneElement` to abort if the passed element is not a valid element and apply
 * all vnode normalizations.
 */
function cloneElement(element: VNode): VNode {
	if (!isValidElement(element)) return element;
	// eslint-disable-next-line prefer-rest-params
	return (preactCloneElement as any).apply(null, arguments);
}

/**
 * Remove a component tree from the DOM, including state and event handlers.
 */
function unmountComponentAtNode(container: PreactElement): boolean {
	if ((container as any)._children) {
		preactRender(null, container as any);
		return true;
	}
	return false;
}

/**
 * Get the matching DOM node for a component
 */
function findDOMNode(component: CompatComponent | Node): PreactElement | null {
	return (
		(component &&
			(((component as any)._vnode && (component as any)._vnode._dom) ||
				((component as any).nodeType === 1 && component))) ||
		null
	);
}

/**
 * In React, `flushSync` flushes the entire tree and forces a rerender. It's
 * implmented here as a no-op.
 */
const flushSync = <Arg, Result>(
	callback: (arg: Arg) => Result,
	arg?: Arg
): Result => callback(arg as Arg);

/**
 * In React, `unstable_batchedUpdates` is a legacy feature that was made a no-op
 * outside of legacy mode in React 18 and a no-op across the board in React 19.
 */
function unstable_batchedUpdates<Arg, Result>(
	callback: (arg: Arg) => Result,
	arg?: Arg
): Result {
	return callback(arg as Arg);
}

/**
 * Strict Mode is not implemented in Preact, so we provide a stand-in for it
 * that just renders its children without imposing any restrictions.
 */
const StrictMode = Fragment;

// compat to react-is
export const isElement = isValidElement;

export * from 'preact/hooks';
export {
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	isFragment,
	isMemo,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	flushSync,
	unstable_batchedUpdates,
	useInsertionEffect,
	startTransition,
	useDeferredValue,
	useSyncExternalStore,
	useTransition,
	StrictMode,
	Suspense,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

// React copies the named exports to the default one.
export default {
	useState,
	useId,
	useReducer,
	useEffect,
	useLayoutEffect,
	useInsertionEffect,
	useTransition,
	useDeferredValue,
	useSyncExternalStore,
	startTransition,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	isElement,
	isFragment,
	isMemo,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	flushSync,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};
