import { Component } from '../component';

/** Retains a pool of Components for re-use, keyed on component name.
 *	Note: since component names are not unique or even necessarily available, these are primarily a form of sharding.
 *	@private
 */
const components = {};

// (components[component.name] ||= []) << component
export function collectComponent(component) {
	let name = component.constructor.name,
		list = components[name];
	if (list) list.push(component);
	else components[name] = [component];
}


export function createComponent(Ctor, props, context) {
	let inst = new Ctor(props, context),
		list = components[Ctor.name];
	// Ctor其实可以不继承Component?
	Component.call(inst, props, context);
	if (list) {
		for (let i=list.length; i--; ) {
			if (list[i].constructor===Ctor) {
				// 从list中找到有相同constructor的instance, list[i]
				// 把list[i]的nextBase移到inst, 从list中删掉list[i]
				inst.nextBase = list[i].nextBase;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}
