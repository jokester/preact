import { options as _options, Fragment } from 'preact';
import type { VNode, Options } from '../../src/internal';

const options = _options as Options;

interface VNodeWithSource extends VNode {
	__source?: { fileName: string; lineNumber: number };
}

/**
 * Get human readable name of the component/dom node
 */
export function getDisplayName(vnode: VNode): string {
	if (vnode.type === Fragment) {
		return 'Fragment';
	} else if (typeof vnode.type == 'function') {
		return (vnode.type as any).displayName || (vnode.type as any).name;
	} else if (typeof vnode.type == 'string') {
		return vnode.type;
	}

	return '#text';
}

/**
 * Used to keep track of the currently rendered `vnode` and print it
 * in debug messages.
 */
let renderStack: VNode[] = [];

/**
 * Keep track of the current owners. An owner describes a component
 * which was responsible to render a specific `vnode`. This exclude
 * children that are passed via `props.children`, because they belong
 * to the parent owner.
 */
let ownerStack: VNode[] = [];

const ownerMap = new WeakMap<VNode, VNode | null>();

/**
 * Get the currently rendered `vnode`
 */
export function getCurrentVNode(): VNode | null {
	return renderStack.length > 0 ? renderStack[renderStack.length - 1] : null;
}

/**
 * If the user doesn't have `@babel/plugin-transform-react-jsx-source`
 * somewhere in his tool chain we can't print the filename and source
 * location of a component. In that case we just omit that, but we'll
 * print a helpful message to the console, notifying the user of it.
 */
let showJsxSourcePluginWarning = true;

/**
 * Check if a `vnode` is a possible owner.
 */
function isPossibleOwner(vnode: VNode): boolean {
	return typeof vnode.type == 'function' && vnode.type != Fragment;
}

/**
 * Return the component stack that was captured up to this point.
 */
export function getOwnerStack(vnode: VNode | null): string {
	const stack: VNode[] = vnode ? [vnode] : [];
	let next = vnode;
	while (next && (next = ownerMap.get(next)!) != null) {
		stack.push(next);
	}

	return stack.reduce((acc, owner) => {
		acc += `  in ${getDisplayName(owner)}`;

		const source = (owner as VNodeWithSource).__source;
		if (source) {
			acc += ` (at ${source.fileName}:${source.lineNumber})`;
		} else if (showJsxSourcePluginWarning) {
			console.warn(
				'Add @babel/plugin-transform-react-jsx-source to get a more detailed component stack. Note that you should not add it to production builds of your App for bundle size reasons.'
			);
		}
		showJsxSourcePluginWarning = false;

		return (acc += '\n');
	}, '');
}

/**
 * Setup code to capture the component trace while rendering. Note that
 * we cannot simply traverse `vnode._parent` upwards, because we have some
 * debug messages for `this.setState` where the `vnode` is `undefined`.
 */
export function setupComponentStack(): void {
	let oldDiff = options._diff;
	let oldDiffed = options.diffed;
	let oldRoot = options._root;
	let oldVNode = options.vnode;
	let oldRender = options._render;

	options.diffed = (vnode: any) => {
		if (isPossibleOwner(vnode)) {
			ownerStack.pop();
		}
		renderStack.pop();
		if (oldDiffed) oldDiffed(vnode);
	};

	options._diff = (vnode: any) => {
		if (isPossibleOwner(vnode)) {
			renderStack.push(vnode);
		}
		if (oldDiff) oldDiff(vnode);
	};

	options._root = (vnode: any, parent: any) => {
		ownerStack = [];
		if (oldRoot) oldRoot(vnode, parent);
	};

	options.vnode = (vnode: any) => {
		ownerMap.set(
			vnode,
			ownerStack.length > 0 ? ownerStack[ownerStack.length - 1] : null
		);
		if (oldVNode) oldVNode(vnode);
	};

	options._render = (vnode: any) => {
		if (isPossibleOwner(vnode)) {
			ownerStack.push(vnode);
		}

		if (oldRender) oldRender(vnode);
	};
}

/**
 * Return the component stack that was captured up to this point.
 */
export function captureOwnerStack(): string {
	return getOwnerStack(getCurrentVNode());
}
