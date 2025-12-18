import { assign } from './util';
import type { Ref } from '../../src/internal';

export const REACT_FORWARD_SYMBOL = Symbol.for('react.forward_ref');

export type ForwardRefRenderFunction<T, P = {}> = (
	props: P,
	ref: Ref<T> | null
) => any;

/**
 * Pass ref down to a child. This is mainly used in libraries with HOCs that
 * wrap components. Using `forwardRef` there is an easy way to get a reference
 * of the wrapped component instead of one of the wrapper itself.
 */
export function forwardRef<T, P = {}>(
	fn: ForwardRefRenderFunction<T, P>
): (props: P & { ref?: Ref<T> }) => any {
	function Forwarded(props: P & { ref?: Ref<T> }) {
		let clone = assign({}, props);
		delete (clone as any).ref;
		return fn(clone as P, props.ref || null);
	}

	// mobx-react checks for this being present
	(Forwarded as any).$$typeof = REACT_FORWARD_SYMBOL;
	// mobx-react heavily relies on implementation details.
	// It expects an object here with a `render` property,
	// and prototype.render will fail. Without this
	// mobx-react throws.
	(Forwarded as any).render = fn;

	(Forwarded as any).prototype = { isReactComponent: true };
	Forwarded.displayName =
		'ForwardRef(' + ((fn as any).displayName || fn.name) + ')';

	return Forwarded;
}
