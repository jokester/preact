import { options, Fragment } from 'preact';
import type { VNode } from '../../src/internal';
import { encodeEntities } from './utils';

let vnodeId = 0;

const isArray = Array.isArray;

/**
 * @fileoverview
 * This file exports various methods that implement Babel's "automatic" JSX runtime API:
 * - jsx(type, props, key)
 * - jsxs(type, props, key)
 * - jsxDEV(type, props, key, __source, __self)
 *
 * The implementation of createVNode here is optimized for performance.
 * Benchmarks: https://esbench.com/bench/5f6b54a0b4632100a7dcd2b3
 */

interface VNodeWithSource extends VNode {
	__source?: unknown;
	__self?: unknown;
}

/**
 * JSX.Element factory used by Babel's {runtime:"automatic"} JSX transform
 */
function createVNode(
	type: VNode['type'],
	props: Record<string, any> | null,
	key?: string | number | null,
	_isStaticChildren?: unknown,
	__source?: unknown,
	__self?: unknown
): VNodeWithSource {
	if (!props) props = {};
	// We'll want to preserve `ref` in props to get rid of the need for
	// forwardRef components in the future, but that should happen via
	// a separate PR.
	let normalizedProps: Record<string, any> = props,
		ref: any,
		i: string;

	if ('ref' in normalizedProps && typeof type != 'function') {
		normalizedProps = {};
		for (i in props) {
			if (i == 'ref') {
				ref = props[i];
			} else {
				normalizedProps[i] = props[i];
			}
		}
	}

	const vnode: VNodeWithSource = {
		type,
		props: normalizedProps as any,
		key: key ?? null,
		ref: ref ?? null,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_component: null,
		constructor: undefined,
		_original: --vnodeId,
		_index: -1,
		_flags: 0,
		__source,
		__self
	};

	if (options.vnode) options.vnode(vnode as any);
	return vnode;
}

/**
 * Create a template vnode. This function is not expected to be
 * used directly, but rather through a precompile JSX transform
 */
function jsxTemplate(
	templates: string[],
	...exprs: Array<string | null | VNode>
): VNode {
	const vnode = createVNode(Fragment, { tpl: templates, exprs });
	// Bypass render to string top level Fragment optimization
	// @ts-ignore
	vnode.key = vnode._vnode;
	return vnode;
}

const JS_TO_CSS: Record<string, string> = {};
const CSS_REGEX = /[A-Z]/g;

/**
 * Unwrap potential signals.
 */
function normalizeAttrValue(value: any): any {
	return value !== null &&
		typeof value === 'object' &&
		typeof value.valueOf === 'function'
		? value.valueOf()
		: value;
}

/**
 * Serialize an HTML attribute to a string. This function is not
 * expected to be used directly, but rather through a precompile
 * JSX transform
 */
function jsxAttr(name: string, value: any): string {
	if ((options as any).attr) {
		const result = (options as any).attr(name, value);
		if (typeof result === 'string') return result;
	}

	value = normalizeAttrValue(value);

	if (name === 'ref' || name === 'key') return '';
	if (name === 'style' && typeof value === 'object') {
		let str = '';
		for (let prop in value) {
			let val = value[prop];
			if (val != null && val !== '') {
				const cssName =
					prop[0] == '-'
						? prop
						: JS_TO_CSS[prop] ||
							(JS_TO_CSS[prop] = prop.replace(CSS_REGEX, '-$&').toLowerCase());

				str = str + cssName + ':' + val + ';';
			}
		}
		return name + '="' + encodeEntities(str) + '"';
	}

	if (
		value == null ||
		value === false ||
		typeof value === 'function' ||
		typeof value === 'object'
	) {
		return '';
	} else if (value === true) return name;

	return name + '="' + encodeEntities('' + value) + '"';
}

/**
 * Escape a dynamic child passed to `jsxTemplate`. This function
 * is not expected to be used directly, but rather through a
 * precompile JSX transform
 */
function jsxEscape(
	value: any
): string | null | VNode | Array<string | null | VNode> {
	if (
		value == null ||
		typeof value === 'boolean' ||
		typeof value === 'function'
	) {
		return null;
	}

	if (typeof value === 'object') {
		// Check for VNode
		if (value.constructor === undefined) return value;

		if (isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				value[i] = jsxEscape(value[i]);
			}
			return value;
		}
	}

	return encodeEntities('' + value);
}

export {
	createVNode as jsx,
	createVNode as jsxs,
	createVNode as jsxDEV,
	Fragment,
	// precompiled JSX transform
	jsxTemplate,
	jsxAttr,
	jsxEscape
};
