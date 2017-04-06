# Files.md

#### Notations used in preact

- VNode: "value" of jsx template. Parallels to React [Element](https://facebook.github.io/react/blog/2015/12/18/react-components-elements-and-instances.html)


#### Files

Files are listed by functionality: VNode / Component

```text
 LOC | File                              | Content
-----+-----------------------------------+------------------------------
     |                                   | ** VNode ** / 100 LOC
  66 | src/h.js                          | create VNode from jsx literal
  19 | src/clone-element.js              | clone VNode
  14 | src/vnode.js                      | VNode i.e. Holder for (nodeName / attrs / key / children)
-----+-----------------------------------+------------------------------
     |                                   | **Component** / 120 LOC
 102 | src/component.js                  | Base component class
  24 | src/linked-state.js               | create "linkedStateHandler", function that call setState() with value extracted from event
-----+-----------------------------------+------------------------------
     |                                   | **VDOM ???** / 800 LOC
  20 | src/render.js                     | Entrypoint for rendering
  22 | src/render-queue.js               | Queue for dirty elements
  25 | src/vdom/functional-component.js  | Util for Functional Components (detect / expand)
  25 | src/dom/recycler.js               | A object pool for DOM elements
 100 | src/dom/index.js                  |
  32 | src/vdom/component-recycler.js    |
 283 | src/vdom/component.js             |
 322 | src/vdom/diff.js                  | MAIN CODE for (vdom-dom diff) **TODO**
  49 | src/vdom/index.js                 | Util for DOM / VDOM
-----+-----------------------------------+------------------------------
     |                                   | **Global** / 150 LOC
  27 | src/options.js                    | singleton object for options / global callbacks
  20 | src/constants.js                  | constants
  27 | src/preact.js                     | Module entrypoint
  68 | src/util.js                       | util
-----+-----------------------------------+------------------------------
1245 | total                             |
```
