import { useState, useLayoutEffect, useEffect } from 'preact/hooks';

/**
 * This is taken from https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js#L84
 * on a high level this cuts out the warnings, ... and attempts a smaller implementation
 */
interface Store<T> {
	_value: T;
	_getSnapshot: () => T;
}

export function useSyncExternalStore<T>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => T
): T {
	const value = getSnapshot();

	interface StoreRef {
		_instance: Store<T>;
	}

	const [{ _instance }, forceUpdate] = useState<StoreRef>({
		_instance: { _value: value, _getSnapshot: getSnapshot }
	});

	useLayoutEffect(() => {
		_instance._value = value;
		_instance._getSnapshot = getSnapshot;

		if (didSnapshotChange(_instance)) {
			forceUpdate({ _instance });
		}
	}, [subscribe, value, getSnapshot]);

	useEffect(() => {
		if (didSnapshotChange(_instance)) {
			forceUpdate({ _instance });
		}

		return subscribe(() => {
			if (didSnapshotChange(_instance)) {
				forceUpdate({ _instance });
			}
		});
	}, [subscribe]);

	return value;
}

function didSnapshotChange<T>(inst: Store<T>): boolean {
	const latestGetSnapshot = inst._getSnapshot;
	const prevValue = inst._value;
	try {
		const nextValue = latestGetSnapshot();
		return !Object.is(prevValue, nextValue);
	} catch (error) {
		return true;
	}
}

export function startTransition(cb: () => void): void {
	cb();
}

export function useDeferredValue<T>(val: T): T {
	return val;
}

export function useTransition(): [boolean, typeof startTransition] {
	return [false, startTransition];
}

// TODO: in theory this should be done after a VNode is diffed as we want to insert
// styles/... before it attaches
export const useInsertionEffect = useLayoutEffect;
