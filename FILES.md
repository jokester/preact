
```text
-----+---------------------------------+-------------------
     |                                 |
 LOC | filename                        | comment
-----+---------------------------------+-------------------
  60 | src/h.js                        | JSX reviver
   2 | src/vnode.js                    | VNode
  10 | src/clone-element.js            | clone of VNode
     |                                 | JSX / V-DOM Element: 160 LOC
-----+---------------------------------+-------------------
 108 | src/dom/index.js                | DOM modifying
  20 | src/render.js                   | Diff entrypoint
 303 | src/vdom/diff.js                | VDOM-DOM diff
  50 | src/vdom/index.js               | VDOM utils
     |                                 | Rendering (w/o component): 500LOC
-----+---------------------------------+-------------------
  81 | src/component.js                | Base class of Component
  49 | src/vdom/component-recycler.js  |
 274 | src/vdom/component.js           |
  21 | src/render-queue.js             |
     |                                 | Rendering (w/ component): 520LOC
-----+---------------------------------+-------------------
  13 | src/constants.js                |
  27 | src/options.js                  | options / hooks
  26 | src/preact.js                   | Overall Entrypoint
  10 | src/util.js                     |
 754 | src/preact.d.ts                 |
   9 | src/preact.js.flow              |
-----+---------------------------------+-------------------
1817 | total                           |
```
