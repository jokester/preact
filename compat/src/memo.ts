import { createElement } from 'preact';
import { shallowDiffers } from './util';
import type { FunctionComponent } from './internal';
import type { Ref } from '../../src/internal';

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 */
export function memo<P extends object>(
	c: FunctionComponent<P>,
	comparer?: (prev: P, next: P) => boolean
): FunctionComponent<P> {
	function shouldUpdate(this: any, nextProps: P & { ref?: Ref<any> }): boolean {
		let ref = this.props.ref;
		let updateRef = ref == nextProps.ref;
		if (!updateRef && ref) {
			(ref as any).call ? (ref as any)(null) : ((ref as any).current = null);
		}

		if (!comparer) {
			return shallowDiffers(this.props, nextProps);
		}

		return !comparer(this.props, nextProps) || !updateRef;
	}

	function Memoed(this: any, props: P) {
		this.shouldComponentUpdate = shouldUpdate;
		return createElement(c as any, props);
	}
	Memoed.displayName =
		'Memo(' + ((c as any).displayName || (c as any).name) + ')';
	(Memoed as any).prototype = { isReactComponent: true };
	(Memoed as any).type = c;
	return Memoed as unknown as FunctionComponent<P>;
}
