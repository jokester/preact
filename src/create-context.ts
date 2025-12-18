import { enqueueRender } from './component';
import { NULL, COMPONENT_FORCE } from './constants';
import type { Component, PreactContext, ComponentChildren } from './internal';

export let i = 0;

interface ContextProviderProps<T> {
	value: T;
	children: ComponentChildren;
}

interface ContextComponent<T> {
	(this: any, props: ContextProviderProps<T>): ComponentChildren;
	_id: string;
	_defaultValue: T;
	Consumer: (props: {
		children: (value: T) => ComponentChildren;
	}) => ComponentChildren;
	Provider: ContextComponent<T>;
	_contextRef: ContextComponent<T>;
}

export function createContext<T>(defaultValue: T): PreactContext {
	function Context(
		this: Component & { sub: (c: Component) => void },
		props: ContextProviderProps<T>
	): ComponentChildren {
		if (!this.getChildContext) {
			let subs: Set<Component> | null = new Set();
			let ctx: Record<string, Component> = {};
			ctx[(Context as unknown as ContextComponent<T>)._id] = this;

			this.getChildContext = () => ctx;

			this.componentWillUnmount = () => {
				subs = NULL;
			};

			(this as any).shouldComponentUpdate = function (
				_props: ContextProviderProps<T>
			) {
				if ((this as any).props.value != _props.value) {
					subs!.forEach(c => {
						c._bits |= COMPONENT_FORCE;
						enqueueRender(c);
					});
				}
			};

			this.sub = (c: Component) => {
				subs!.add(c);
				let old = c.componentWillUnmount;
				c.componentWillUnmount = () => {
					if (subs) {
						subs.delete(c);
					}
					if (old) old.call(c);
				};
			};
		}

		return props.children;
	}

	(Context as unknown as ContextComponent<T>)._id = '__cC' + i++;
	(Context as unknown as ContextComponent<T>)._defaultValue = defaultValue;

	(Context as any).Consumer = (
		props: { children: (value: T) => ComponentChildren },
		contextValue: T
	) => {
		return props.children(contextValue);
	};

	// we could also get rid of _contextRef entirely
	(Context as unknown as ContextComponent<T>).Provider =
		(Context as unknown as ContextComponent<T>)._contextRef =
		((Context as unknown as ContextComponent<T>).Consumer as any).contextType =
			Context as unknown as ContextComponent<T>;

	return Context as unknown as PreactContext;
}
