import { resetRenderCount } from '../component';
import type { VNode, Component, ComponentType, ErrorInfo } from '../internal';
import {
	NULL,
	COMPONENT_DIRTY,
	COMPONENT_PENDING_ERROR,
	COMPONENT_PROCESSING_EXCEPTION,
	COMPONENT_FORCE
} from '../constants';

/**
 * Find the closest error boundary to a thrown error and call it
 */
export function _catchError(
	error: any,
	vnode: VNode,
	_oldVNode?: VNode,
	errorInfo?: ErrorInfo
): void {
	let component: Component | null;
	let ctor: ComponentType;
	let handled: number;

	for (; (vnode = vnode._parent!); ) {
		if (
			(component = vnode._component) &&
			!(component._bits & COMPONENT_PROCESSING_EXCEPTION)
		) {
			component._bits |= COMPONENT_FORCE;
			try {
				ctor = component.constructor;

				if (ctor && (ctor as any).getDerivedStateFromError != NULL) {
					component.setState((ctor as any).getDerivedStateFromError(error));
					handled = component._bits & COMPONENT_DIRTY;
				}

				if ((component as any).componentDidCatch != NULL) {
					(component as any).componentDidCatch(error, errorInfo || {});
					handled = component._bits & COMPONENT_DIRTY;
				}

				// This is an error boundary. Mark it as having bailed out, and whether it was mid-hydration.
				if (handled!) {
					component._bits |= COMPONENT_PENDING_ERROR;
					return;
				}
			} catch (e) {
				error = e;
			}
		}
	}

	// Reset rerender count to 0, so that the next render will not be skipped
	// when we leverage prefresh
	resetRenderCount();
	throw error;
}
