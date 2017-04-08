import { ATTR_KEY } from '../constants';
import { isString, isFunction } from '../util';
import { isSameNodeType, isNamedNode } from './index';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { setAccessor, removeNode } from '../dom/index';
import { createNode, collectNode } from '../dom/recycler';
import { unmountComponent } from './component';
import options from '../options';


/** Queue of components that have been mounted and are awaiting componentDidMount */
export const mounts = [];

/** Diff recursion count, used to track the end of the diff cycle. */
export let diffLevel = 0;

/** Global flag indicating if the diff is currently within an SVG */
let isSvgMode = false;

/** Global flag indicating if the diff is performing hydration */
let hydrating = false;

/** Invoke queued componentDidMount lifecycle methods */
export function flushMounts() {
	let c;
	while ((c=mounts.pop())) {
		if (options.afterMount) options.afterMount(c);
		if (c.componentDidMount) c.componentDidMount();
	}
}


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode` XXX: what if it's falsy?
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@param {XXX: ???} context
 *	@param {XXX: ???} mountAll
 *	@param {Element} parent the new parent to insert dom into
 *	@param {XXX: ???} componentRoot
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export function diff(dom, vnode, context, mountAll, parent, componentRoot) {
	// diffLevel having been 0 here indicates initial entry into the diff (not a subdiff)
	if (!diffLevel++) {
		// when first starting the diff, check if we're diffing an SVG or within an SVG
    // XXX: when we get deeper, isSvgMode will be updated within idiff
		isSvgMode = parent && typeof parent.ownerSVGElement!=='undefined';

		// hydration is indicated by the existing element to be diffed not having a prop cache
    // "水合"
    // XXX: what is a "prop cache?"
		hydrating = dom && !(ATTR_KEY in dom);
	}

	let ret = idiff(dom, vnode, context, mountAll);

	// append the element if its a new parent
  // XXX: a new child? did developit meant "needs a new parent"?
  // XXX: what does idiff return?
	if (parent && ret.parentNode!==parent) parent.appendChild(ret);

	// diffLevel being reduced to 0 means we're exiting the diff
	if (!--diffLevel) {
		hydrating = false;
		// invoke queued componentDidMount lifecycle methods
		if (!componentRoot) flushMounts();
	}

	return ret;
}

/**
 *
 *	@param {Element} dom			The 'base' element to mutate
 *	@returns {Element} created/mutated element
 */
function idiff(dom, vnode, context, mountAll) {
	let ref = vnode && vnode.attributes && vnode.attributes.ref;


	// Resolve ephemeral Pure Functional Components
	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}


	// empty values (null & undefined) render as empty Text nodes
	if (vnode==null) vnode = '';


	// Fast case: Strings create/update Text nodes.
	if (isString(vnode)) {
		// update if it's already a Text node
		if (dom && dom instanceof Text && dom.parentNode) {
			if (dom.nodeValue!=vnode) {
				dom.nodeValue = vnode;
			}
		}
		else {
			// it wasn't a Text node: replace it with one and recycle the old Element
			if (dom) recollectNodeTree(dom);
			dom = document.createTextNode(vnode);
		}

		return dom;
	}


	// If the VNode represents a Component, perform a component diff.
	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context, mountAll);
	}


  // if we are here: both node and vnode are DOM components
  // perform DOMcomponent diff
	let out = dom,
		nodeName = String(vnode.nodeName),	// @TODO this masks undefined component errors as `<undefined>`
		prevSvgMode = isSvgMode,
		vchildren = vnode.children;


	// SVGs have special namespace stuff.
	// This tracks entering and exiting that namespace when descending through the tree.
  // <svg> ----isSvgMode = true ---- <foreignObject> --- isSvgMode = false ---- </foreignObject>
	isSvgMode = nodeName==='svg' ? true : nodeName==='foreignObject' ? false : isSvgMode;


	if (!dom) {
		// case: we had no element to begin with
		// - create an element with the nodeName from VNode
		out = createNode(nodeName, isSvgMode);
	}
	else if (!isNamedNode(dom, nodeName)) {
		// case: Element and VNode had different nodeNames
		// - need to create the correct Element to match VNode
		// - then migrate children from old to new

		out = createNode(nodeName, isSvgMode);

		// move children into the replacement node
		while (dom.firstChild) out.appendChild(dom.firstChild);

		// if the previous Element was mounted into the DOM, replace it inline
		if (dom.parentNode) dom.parentNode.replaceChild(out, dom);

		// recycle the old element (skips non-Element node types) (_component gets recycled too)
		recollectNodeTree(dom);
	} /* else: just reuse out=dom */


	let fc = out.firstChild,
		props = out[ATTR_KEY];

	// Attribute Hydration: if there is no prop cache on the element,
	// ...create it and populate it with the element's attributes.
	if (!props) {
    // out.attributes ->  out[ATTR_KEY}
		out[ATTR_KEY] = props = {};
    // Element.attributes is an array of attribute nodes like {name: "class", value: "sss"}
		for (let a=out.attributes, i=a.length; i--; ) props[a[i].name] = a[i].value;
	}

	// Optimization: fast-path for elements containing a single TextNode:
	if (!hydrating && vchildren && vchildren.length===1 && typeof vchildren[0]==='string' && fc && fc instanceof Text && !fc.nextSibling) {
		if (fc.nodeValue!=vchildren[0]) {
			fc.nodeValue = vchildren[0];
		}
	}
	// otherwise, if there are existing or new children (i.e either vnode or node had children), diff them:
	else if (vchildren && vchildren.length || fc) {
		innerDiffNode(out, vchildren, context, mountAll, !!props.dangerouslySetInnerHTML);
	}


	// Apply attributes/props from VNode to the DOM Element:
	diffAttributes(out, /* desired */ vnode.attributes, /* old */props);


	// invoke original ref (from before resolving Pure Functional Components):
	if (ref) {
		(props.ref = ref)(out);
	}

	isSvgMode = prevSvgMode;

	return out;
}


/** Apply child and attribute changes between a VNode and a DOM Node to the DOM.
 *	@param {Element} dom		Element whose children should be compared & mutated
 *	@param {Array} vchildren	Array of VNodes to compare to `dom.childNodes`
 *	@param {Object} context		Implicitly descendant context object (from most recent `getChildContext()`)
 *	@param {Boolean} mountAll
 *	@param {Boolean} absorb		If `true`, consumes externally created elements similar to hydration
 */
function innerDiffNode(dom, vchildren, context, mountAll, absorb) {
	let originalChildren = dom.childNodes,
		children = [],
		keyed = {},
		keyedLen = 0,
		min = 0,
		len = originalChildren.length,
		childrenLen = 0,
		vlen = vchildren && vchildren.length,
		j, c, vchild, child;

	if (len) {
		for (let i=0; i<len; i++) {
			let child = originalChildren[i],
				props = child[ATTR_KEY],
				key = vlen ? ((c = child._component) ? c.__key : props ? props.key : null) : null;
			if (key!=null) {
				keyedLen++;
				keyed[key] = child;
			}
			else if (hydrating || absorb || props || child instanceof Text) {
				children[childrenLen++] = child;
			}
		}
	}

	if (vlen) {
		for (let i=0; i<vlen; i++) {
			vchild = vchildren[i];
			child = null;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			let key = vchild.key;
			if (key!=null) {
				if (keyedLen && key in keyed) {
					child = keyed[key];
					keyed[key] = undefined;
					keyedLen--;
				}
			}
			// attempt to pluck a node of the same type from the existing children
			else if (!child && min<childrenLen) {
				for (j=min; j<childrenLen; j++) {
					c = children[j];
					if (c && isSameNodeType(c, vchild)) {
						child = c;
						children[j] = undefined;
						if (j===childrenLen-1) childrenLen--;
						if (j===min) min++;
						break;
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = idiff(child, vchild, context, mountAll);

			if (child && child!==dom) {
				if (i>=len) {
					dom.appendChild(child);
				}
				else if (child!==originalChildren[i]) {
					if (child===originalChildren[i+1]) {
						removeNode(originalChildren[i]);
					}
					dom.insertBefore(child, originalChildren[i] || null);
				}
			}
		}
	}


	if (keyedLen) {
		for (let i in keyed) if (keyed[i]) recollectNodeTree(keyed[i]);
	}

	// remove orphaned children
	while (min<=childrenLen) {
		child = children[childrenLen--];
		if (child) recollectNodeTree(child);
	}
}



/** Recursively recycle (or just unmount) a node an its descendants.
 *	@param {Node} node						DOM node to start unmount/removal from FIXME: why not Element?
 *	@param {Boolean} [unmountOnly=false]	If `true`, only triggers unmount lifecycle, skips removal from DOM tree
 */
export function recollectNodeTree(node, unmountOnly) {
	let component = node._component;
	if (component) {
		// if node is owned by a Component, unmount that component (ends up recursing back here)
		unmountComponent(component, !unmountOnly);
	}
	else {
		// If the node's VNode had a ref function, invoke it with null here.
		// (this is part of the React spec, and smart for unsetting references)
		if (node[ATTR_KEY] && node[ATTR_KEY].ref) node[ATTR_KEY].ref(null);

		if (!unmountOnly) {
			collectNode(node);
		}

		// Recollect/unmount all children.
		// - we use .lastChild here because it causes less reflow than .firstChild
		// - it's also cheaper than accessing the .childNodes Live NodeList
		let c;
		while ((c=node.lastChild)) recollectNodeTree(c, unmountOnly);
	}
}



/** Apply differences in attributes from a VNode to the given DOM Element.
 *	@param {Element} dom		Element with attributes to diff `attrs` against
 *	@param {Object} attrs		The desired end-state key-value attribute pairs
 *	@param {Object} old			Current/previous attributes (from previous VNode or element's prop cache)
 *	    "current": when old is just created from dom.attributes, in idiff()
 *	    "previous": when old is not touched by idiff()
 */
function diffAttributes(dom, attrs, old) {
	// remove attributes no longer present on the vnode by setting them to undefined
	let name;
	// remove dom[name] if (name in old) && (old[name] != null) && (!name in attrs)
	for (name in old) {
		if (!(attrs && name in attrs) && old[name]!=null) {
			setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
		}
	}

	// add new & update changed attributes
	// set dom[name] to attr[name] if (name in attrs) && ()
	if (attrs) {
		for (name in attrs) {
			if (name!=='children'		// skip "children"
				&& name!=='innerHTML'	// skip "innerHTML"
				&& (!(name in old) 		// not in old
					|| attrs[name]!== /* in old but different value */
						// when name is value / checked: compare with dom[name]
					   (name==='value' || name==='checked' ? dom[name] : old[name])))  {

				setAccessor(/* element */dom, /* name of attr */name, /* prev value*/old[name],
					/* new value */old[name] = attrs[name], isSvgMode);
			}
		}
	}
}
