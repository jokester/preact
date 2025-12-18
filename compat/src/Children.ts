import { toChildArray, ComponentChild, ComponentChildren } from 'preact';

const mapFn = (
	children: ComponentChildren,
	fn: (child: ComponentChild, index: number) => ComponentChild,
	context?: any
): ComponentChild[] | null => {
	if (children == null) return null;
	return toChildArray(toChildArray(children).map(fn.bind(context)));
};

// This API is completely unnecessary for Preact, so it's basically passthrough.
export const Children = {
	map: mapFn,
	forEach: mapFn,
	count(children: ComponentChildren): number {
		return children ? toChildArray(children).length : 0;
	},
	only(children: ComponentChildren): ComponentChild {
		const normalized = toChildArray(children);
		if (normalized.length !== 1) throw 'Children.only';
		return normalized[0];
	},
	toArray: toChildArray
};
