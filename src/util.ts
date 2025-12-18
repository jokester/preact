import type { PreactElement } from './internal';
import { EMPTY_ARR } from './constants';

export const isArray = Array.isArray;
export const slice = EMPTY_ARR.slice;
export const assign = Object.assign;

/**
 * Remove a child node from its parent if attached.
 */
export function removeNode(node: PreactElement | null): void {
	if (node && node.parentNode) node.remove!();
}
