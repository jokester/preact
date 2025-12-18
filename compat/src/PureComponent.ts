import { Component } from 'preact';
import { shallowDiffers } from './util';

/**
 * Component class with a predefined `shouldComponentUpdate` implementation
 */
export function PureComponent(this: any, p: any, c: any): void {
	this.props = p;
	this.context = c;
}
PureComponent.prototype = new (Component as any)();
// Some third-party libraries check if this property is present
(PureComponent.prototype as any).isPureReactComponent = true;
PureComponent.prototype.shouldComponentUpdate = function (
	this: any,
	props: any,
	state: any
): boolean {
	return shallowDiffers(this.props, props) || shallowDiffers(this.state, state);
};
