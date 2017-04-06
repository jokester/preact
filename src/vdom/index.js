import { clone, isString, isFunction, toLowerCase } from '../util';
import { isFunctionalComponent } from './functional-component';


/** Check if two nodes are equivalent.
 *	@param {Element} node a native DOM element
 *	@param {VNode} vnode
 *	@private
 */
export function isSameNodeType(node, vnode) {
	if (isString(vnode)) {
    // when vnode is but a text: return whether node is Text (Text: constructor of document.createTextNode(""))
		return node instanceof Text;
	}
	if (isString(vnode.nodeName)) {
    // when node is a (dom component): return whether they have same nodeName
		return !node._componentConstructor && isNamedNode(node, vnode.nodeName);
	}
	if (isFunction(vnode.nodeName)) {
    // when node have a (constructor of component): compare to constructor of vnode component
    // else: return whether vnode is a functional component
		return (node._componentConstructor ? node._componentConstructor===vnode.nodeName : true) || isFunctionalComponent(vnode);
	}
}


export function isNamedNode(node, nodeName) {
	return node.normalizedNodeName===nodeName || toLowerCase(node.nodeName)===toLowerCase(nodeName);
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
export function getNodeProps(vnode) {
  // props := attributes + children
	let props = clone(vnode.attributes);
	props.children = vnode.children;

	let defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps) {
		for (let i in defaultProps) {
			if (props[i]===undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}
