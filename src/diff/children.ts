import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import type {
	VNode,
	Component,
	PreactElement,
	ComponentChildren
} from '../internal';
import {
	EMPTY_OBJ,
	EMPTY_ARR,
	INSERT_VNODE,
	MATCHED,
	UNDEFINED,
	NULL
} from '../constants';
import { isArray } from '../util';
import { getDomSibling } from '../component';

/**
 * Diff the children of a virtual node
 */
export function diffChildren(
	parentDom: PreactElement,
	renderResult: ComponentChildren[],
	newParentVNode: VNode,
	oldParentVNode: VNode,
	globalContext: object,
	namespace: string,
	excessDomChildren: Array<PreactElement | null> | null,
	commitQueue: Component[],
	oldDom: PreactElement | null,
	isHydrating: boolean,
	refQueue: any[],
	doc: Document
): PreactElement | null {
	let i: number,
		oldVNode: VNode,
		childVNode: VNode,
		newDom: PreactElement | null,
		firstChildDom: PreactElement | null | undefined;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren: VNode[] =
		(oldParentVNode && oldParentVNode._children) ||
		(EMPTY_ARR as unknown as VNode[]);

	let newChildrenLength = renderResult.length;

	oldDom = constructNewChildrenArray(
		newParentVNode,
		renderResult,
		oldChildren,
		oldDom,
		newChildrenLength
	);

	for (i = 0; i < newChildrenLength; i++) {
		childVNode = newParentVNode._children![i];
		if (childVNode == NULL) continue;

		// At this point, constructNewChildrenArray has assigned _index to be the
		// matchingIndex for this VNode's oldVNode (or -1 if there is no oldVNode).
		if (childVNode._index == -1) {
			oldVNode = EMPTY_OBJ as unknown as VNode;
		} else {
			oldVNode =
				oldChildren[childVNode._index] || (EMPTY_OBJ as unknown as VNode);
		}

		// Update childVNode._index to its final index
		childVNode._index = i;

		// Morph the old element into the new one, but don't append it to the dom yet
		let result = diff(
			parentDom,
			childVNode,
			oldVNode,
			globalContext,
			namespace,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating,
			refQueue,
			doc
		);

		// Adjust DOM nodes
		newDom = childVNode._dom;
		if (childVNode.ref && oldVNode.ref != childVNode.ref) {
			if (oldVNode.ref) {
				applyRef(oldVNode.ref, NULL, childVNode);
			}
			refQueue.push(
				childVNode.ref,
				childVNode._component || newDom,
				childVNode
			);
		}

		if (firstChildDom == NULL && newDom != NULL) {
			firstChildDom = newDom;
		}

		let shouldPlace = childVNode._flags & INSERT_VNODE;
		if (shouldPlace || oldVNode._children === childVNode._children) {
			oldDom = insert(childVNode, oldDom, parentDom, shouldPlace);
		} else if (typeof childVNode.type == 'function' && result !== UNDEFINED) {
			oldDom = result;
		} else if (newDom) {
			oldDom = newDom.nextSibling as PreactElement | null;
		}

		// Unset diffing flags
		childVNode._flags &= ~(INSERT_VNODE | MATCHED);
	}

	newParentVNode._dom = firstChildDom!;

	return oldDom;
}

function constructNewChildrenArray(
	newParentVNode: VNode,
	renderResult: ComponentChildren[],
	oldChildren: VNode[],
	oldDom: PreactElement | null,
	newChildrenLength: number
): PreactElement | null {
	let i: number;
	let childVNode: VNode;
	let oldVNode: VNode | null;

	let oldChildrenLength = oldChildren.length,
		remainingOldChildren = oldChildrenLength;

	let skew = 0;

	newParentVNode._children = new Array(newChildrenLength);
	for (i = 0; i < newChildrenLength; i++) {
		// @ts-expect-error We are reusing the childVNode variable to hold both the
		// pre and post normalized childVNode
		childVNode = renderResult[i];

		if (
			childVNode == NULL ||
			typeof childVNode == 'boolean' ||
			typeof childVNode == 'function'
		) {
			(newParentVNode._children as any)[i] = NULL;
			continue;
		}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
		// it's own DOM & etc. pointers
		else if (
			typeof childVNode == 'string' ||
			typeof childVNode == 'number' ||
			// eslint-disable-next-line valid-typeof
			typeof childVNode == 'bigint' ||
			(childVNode as any).constructor == String
		) {
			childVNode = newParentVNode._children![i] = createVNode(
				NULL as any,
				childVNode as any,
				NULL,
				NULL,
				NULL
			);
		} else if (isArray(childVNode)) {
			childVNode = newParentVNode._children![i] = createVNode(
				Fragment as any,
				{ children: childVNode },
				NULL,
				NULL,
				NULL
			);
		} else if (
			(childVNode as VNode).constructor == UNDEFINED &&
			(childVNode as VNode)._depth! > 0
		) {
			// VNode is already in use, clone it. This can happen in the following
			// scenario:
			//   const reuse = <div />
			//   <div>{reuse}<span />{reuse}</div>
			childVNode = newParentVNode._children![i] = createVNode(
				(childVNode as VNode).type,
				(childVNode as VNode).props,
				(childVNode as VNode).key,
				(childVNode as VNode).ref ? (childVNode as VNode).ref : NULL,
				(childVNode as VNode)._original
			);
		} else {
			newParentVNode._children![i] = childVNode as VNode;
		}

		const skewedIndex = i + skew;
		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth! + 1;

		// Temporarily store the matchingIndex on the _index property so we can pull
		// out the oldVNode in diffChildren. We'll override this to the VNode's
		// final index after using this property to get the oldVNode
		const matchingIndex = (childVNode._index = findMatchingIndex(
			childVNode,
			oldChildren,
			skewedIndex,
			remainingOldChildren
		));

		oldVNode = NULL;
		if (matchingIndex != -1) {
			oldVNode = oldChildren[matchingIndex];
			remainingOldChildren--;
			if (oldVNode) {
				oldVNode._flags |= MATCHED;
			}
		}

		// Here, we define isMounting for the purposes of the skew diffing
		// algorithm. Nodes that are unsuspending are considered mounting and we detect
		// this by checking if oldVNode._original == null
		if (oldVNode == NULL || oldVNode._original == NULL) {
			if (matchingIndex == -1) {
				// When the array of children is growing we need to decrease the skew
				// as we are adding a new element to the array.
				// Example:
				// [1, 2, 3] --> [0, 1, 2, 3]
				// oldChildren   newChildren
				//
				// The new element is at index 0, so our skew is 0,
				// we need to decrease the skew as we are adding a new element.
				// The decrease will cause us to compare the element at position 1
				// with value 1 with the element at position 0 with value 0.
				//
				// A linear concept is applied when the array is shrinking,
				// if the length is unchanged we can assume that no skew
				// changes are needed.
				if (newChildrenLength > oldChildrenLength) {
					skew--;
				} else if (newChildrenLength < oldChildrenLength) {
					skew++;
				}
			}

			// If we are mounting a DOM VNode, mark it for insertion
			if (typeof childVNode.type != 'function') {
				childVNode._flags |= INSERT_VNODE;
			}
		} else if (matchingIndex != skewedIndex) {
			// When we move elements around i.e. [0, 1, 2] --> [1, 0, 2]
			// --> we diff 1, we find it at position 1 while our skewed index is 0 and our skew is 0
			//     we set the skew to 1 as we found an offset.
			// --> we diff 0, we find it at position 0 while our skewed index is at 2 and our skew is 1
			//     this makes us increase the skew again.
			// --> we diff 2, we find it at position 2 while our skewed index is at 4 and our skew is 2
			//
			// this becomes an optimization question where currently we see a 1 element offset as an insertion
			// or deletion i.e. we optimize for [0, 1, 2] --> [9, 0, 1, 2]
			// while a more than 1 offset we see as a swap.
			// We could probably build heuristics for having an optimized course of action here as well, but
			// might go at the cost of some bytes.
			//
			// If we wanted to optimize for i.e. only swaps we'd just do the last two code-branches and have
			// only the first item be a re-scouting and all the others fall in their skewed counter-part.
			// We could also further optimize for swaps
			if (matchingIndex == skewedIndex - 1) {
				skew--;
			} else if (matchingIndex == skewedIndex + 1) {
				skew++;
			} else {
				if (matchingIndex > skewedIndex) {
					skew--;
				} else {
					skew++;
				}

				// Move this VNode's DOM if the original index (matchingIndex) doesn't
				// match the new skew index (i + new skew)
				// In the former two branches we know that it matches after skewing
				childVNode._flags |= INSERT_VNODE;
			}
		}
	}

	// Remove remaining oldChildren if there are any. Loop forwards so that as we
	// unmount DOM from the beginning of the oldChildren, we can adjust oldDom to
	// point to the next child, which needs to be the first DOM node that won't be
	// unmounted.
	if (remainingOldChildren) {
		for (i = 0; i < oldChildrenLength; i++) {
			oldVNode = oldChildren[i];
			if (oldVNode != NULL && (oldVNode._flags & MATCHED) == 0) {
				if (oldVNode._dom == oldDom) {
					oldDom = getDomSibling(oldVNode);
				}

				unmount(oldVNode, oldVNode);
			}
		}
	}

	return oldDom;
}

function insert(
	parentVNode: VNode,
	oldDom: PreactElement | null,
	parentDom: PreactElement,
	shouldPlace: number
): PreactElement | null {
	// Note: VNodes in nested suspended trees may be missing _children.
	if (typeof parentVNode.type == 'function') {
		let children = parentVNode._children;
		for (let i = 0; children && i < children.length; i++) {
			if (children[i]) {
				// If we enter this code path on sCU bailout, where we copy
				// oldVNode._children to newVNode._children, we need to update the old
				// children's _parent pointer to point to the newVNode (parentVNode
				// here).
				children[i]._parent = parentVNode;
				oldDom = insert(children[i], oldDom, parentDom, shouldPlace);
			}
		}

		return oldDom;
	} else if (parentVNode._dom != oldDom) {
		if (shouldPlace) {
			if (oldDom && parentVNode.type && !(oldDom as any).parentNode) {
				oldDom = getDomSibling(parentVNode);
			}
			(parentDom as any).insertBefore(parentVNode._dom, oldDom || NULL);
		}
		oldDom = parentVNode._dom;
	}

	do {
		oldDom = oldDom && (oldDom.nextSibling as PreactElement | null);
	} while (oldDom != NULL && (oldDom as any).nodeType == 8);

	return oldDom;
}

/**
 * Flatten and loop through the children of a virtual node
 */
export function toChildArray(
	children: ComponentChildren,
	out?: VNode[]
): VNode[] {
	out = out || [];
	if (children == NULL || typeof children == 'boolean') {
	} else if (isArray(children)) {
		(children as any[]).some((child: any) => {
			toChildArray(child, out);
		});
	} else {
		out.push(children as VNode);
	}
	return out;
}

function findMatchingIndex(
	childVNode: VNode,
	oldChildren: VNode[],
	skewedIndex: number,
	remainingOldChildren: number
): number {
	const key = childVNode.key;
	const type = childVNode.type;
	let oldVNode = oldChildren[skewedIndex];
	const matched = oldVNode != NULL && (oldVNode._flags & MATCHED) == 0;

	// We only need to perform a search if there are more children
	// (remainingOldChildren) to search. However, if the oldVNode we just looked
	// at skewedIndex was not already used in this diff, then there must be at
	// least 1 other (so greater than 1) remainingOldChildren to attempt to match
	// against. So the following condition checks that ensuring
	// remainingOldChildren > 1 if the oldVNode is not already used/matched. Else
	// if the oldVNode was null or matched, then there could needs to be at least
	// 1 (aka `remainingOldChildren > 0`) children to find and compare against.
	//
	// If there is an unkeyed functional VNode, that isn't a built-in like our Fragment,
	// we should not search as we risk re-using state of an unrelated VNode. (reverted for now)
	let shouldSearch =
		// (typeof type != 'function' || type === Fragment || key) &&
		remainingOldChildren > (matched ? 1 : 0);

	if (
		(oldVNode === NULL && key == null) ||
		(matched && key == oldVNode.key && type == oldVNode.type)
	) {
		return skewedIndex;
	} else if (shouldSearch) {
		let x = skewedIndex - 1;
		let y = skewedIndex + 1;
		while (x >= 0 || y < oldChildren.length) {
			const childIndex = x >= 0 ? x-- : y++;
			oldVNode = oldChildren[childIndex];
			if (
				oldVNode != NULL &&
				(oldVNode._flags & MATCHED) == 0 &&
				key == oldVNode.key &&
				type == oldVNode.type
			) {
				return childIndex;
			}
		}
	}

	return -1;
}
