import { h } from './h';
import { cloneElement } from './clone-element';
import { Component } from './component';
import { render } from './render';
import { rerender } from './render-queue';
import options from './options';

export default {
	// h(): jsx literal -> VNode (VNode.js)
	// class VNode: POJO to hold nodeName / attr / children
	h,
	// shallow copy a VNode
	cloneElement,
  // base class for Component
	Component,
	// top-layer render: diff dom and a element tree
	render,
	// render all dirty components
	rerender,
  // global options singleton
	options
};

export {
	h,
	cloneElement,
	Component,
	render,
	rerender,
	options
};
