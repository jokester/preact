import options from './options';
import { defer } from './util';
import { renderComponent } from './vdom/component';

/** Managed queue of dirty components to be re-rendered */

let items = [];

/**
 * insert component to {@link items}
 *
 * Points:
 *  Component that is already _dirty will not be inserted again
 *  Array#push() returns new length of the array. this ensures rerender() is queued only once.
 */
export function enqueueRender(component) {
	if (!component._dirty && (component._dirty = true) && items.push(component)==1) {
		(options.debounceRendering || defer)(rerender);
	}
}


/**
 * render dirty components in turn, and clean render queue.
 */
export function rerender() {
	let p, list = items;
	items = [];
	while ( (p = list.pop()) ) {
		if (p._dirty) renderComponent(p);
	}
}
