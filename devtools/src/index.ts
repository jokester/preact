import { options } from 'preact';
import { initDevTools } from './devtools';

initDevTools();

/**
 * Display a custom label for a custom hook for the devtools panel
 */
export function addHookName<T>(value: T, name: string): T {
	if ((options as any)._addHookName) {
		(options as any)._addHookName(name);
	}
	return value;
}
