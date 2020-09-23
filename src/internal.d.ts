import * as preact from './index';
import { TypedPreact } from './typed-preact';

export enum HookType {
	useState = 1,
	useReducer = 2,
	useEffect = 3,
	useLayoutEffect = 4,
	useRef = 5,
	useImperativeHandle = 6,
	useMemo = 7,
	useCallback = 8,
	useContext = 9,
	useErrorBoundary = 10,
	// Not a real hook, but the devtools treat is as such
	useDebugvalue = 11
}

export interface DevSource {
	fileName: string;
	lineNumber: number;
}

export namespace TypedPreactInternal {
	export interface Options extends TypedPreact.Options {
		/** Attach a hook that is invoked before render, mainly to check the arguments. */
		_root?(
			vnode: TypedPreact.ComponentChild,
			parent: Element | Document | ShadowRoot | DocumentFragment
		): void;
		/** Attach a hook that is invoked before a vnode is diffed. */
		_diff?(vnode: VNode): void;
		/** Attach a hook that is invoked after a tree was mounted or was updated. */
		_commit?(vnode: VNode, commitQueue: Component[]): void;
		/** Attach a hook that is invoked before a vnode has rendered. */
		_render?(vnode: VNode): void;
		/** Attach a hook that is invoked before a hook's state is queried. */
		_hook?(component: Component, index: number, type: HookType): void;
		/** Bypass effect execution. Currenty only used in devtools for hooks inspection */
		_skipEffects?: boolean;
		/** Attach a hook that is invoked after an error is caught in a component but before calling lifecycle hooks */
		_catchError(error: any, vnode: VNode, oldVNode: VNode | undefined): void;
	}

	export interface FunctionalComponent<P = {}>
		extends TypedPreact.FunctionComponent<P> {
		// Define getDerivedStateFromProps as undefined on FunctionalComponent
		// to get rid of some errors in `diff()`
		getDerivedStateFromProps?: undefined;
	}

	// Redefine ComponentFactory using our new internal FunctionalComponent interface above
	export type ComponentFactory<P> =
		| TypedPreact.ComponentClass<P>
		| FunctionalComponent<P>;

	// @ts-ignore
	export interface PreactElement extends HTMLElement, Text {
		_children?: VNode<any> | null;
		/** Event listeners to support event delegation */
		_listeners: Record<string, (e: Event) => void>;

		// Preact uses this attribute to detect SVG nodes
		ownerSVGElement?: SVGElement | null;

		// style: HTMLElement["style"]; // From HTMLElement

		data?: string | number; // From Text node
	}

	/** FIXME : can we express constraints in TS? */
	export type VNode<P = {}> = MountedVNode<P> | NonMountedVNode<P>;

	type VNodeBase<P> = TypedPreact.VNode<P> & {
		// props that always exist
		// Redefine type here using our internal ComponentFactory type
		type: string | ComponentFactory<P>;
		props: P & { children?: TypedPreact.ComponentChildren };
		constructor: unknown;
		_original?: VNode<P> | null;
	};

	type MountedVNode<P> = VNodeBase<P> & {
		// props when mounted
		_parent: VNode<unknown> & MountedVNode<P>;
		_children: Array<VNode<any>>;
		_depth: number;
		/**
		 * The [first (for Fragments)] DOM child of a VNode
		 */
		_dom: PreactElement;
		/**
		 * The last dom child of a Fragment, or components that return a Fragment
		 */
		_nextDom: PreactElement | null;
		_component: ComponentMounted<P, unknown>;
		_hydrating: boolean | null;
	};

	type NonMountedVNode<P> = VNodeBase<P> & {
		// props when not mounted
		_parent: null;
		_children: null;
		_dom: null;
		_depth: 0;
	};

	export type Component<P = {}, S = {}> =
		| ComponentMounted<P, S>
		| ComponentNonMounted<P, S>;

	type ComponentBase<P, S> = TypedPreact.Component<P, S> & {
		// When component is functional component, this is reset to functional component
		constructor: TypedPreact.ComponentType<P>;
		state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks

		_dirty: boolean;
		_force?: boolean;
		_renderCallbacks: Array<() => void>; // Only class components
		_globalContext?: any;
		_vnode?: VNode<P> | null;
		_nextState?: S | null; // Only class components
		/** Only used in the devtools to later dirty check if state has changed */
		_prevState?: S | null;
		/**
		 * Pointer to the parent dom node. This is only needed for top-level Fragment
		 * components or array returns.
		 */
		_parentDom?: PreactElement | null;
		// Always read, set only when handling error
		_processingException?: Component<any, any> | null;
		// Always read, set only when handling error. This is used to indicate at diffTime to set _processingException
		_pendingError?: Component<any, any> | null;
	};

	type ComponentMounted<P, S> = ComponentBase<P, S> & {
		base: PreactElement;
	};
	type ComponentNonMounted<P, S> = ComponentBase<P, S> & {
		base?: null;
	};

	export interface PreactContext extends TypedPreact.Context<any> {
		_id: string;
		_defaultValue: any;
	}
}
