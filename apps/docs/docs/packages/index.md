---
title: NPM Packages
description: individual packages
---

This section is the package reference index for `@wonderlandlabs-pixi-ux`.
Each package has a dedicated page, and each page mirrors the package README so docs stay close to source.

## Package Index

| Package | Summary | Repository |
| --- | --- | --- |
| [box](./box) | Tree-based layout engine for measurable areas, alignment, constraints, and BoxTree traversal. | [packages/box](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/box) |
| [button](./button) | Button store that composes BoxTree layout with StyleTree-driven visual states. | [packages/button](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/button) |
| [caption](./caption) | Caption/speech/thought bubble rendering with configurable geometry and text styling. | [packages/caption](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/caption) |
| [drag](./drag) | Drag interaction state controller that normalizes pointer-driven movement workflows. | [packages/drag](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/drag) |
| [grid](./grid) | Zoom-aware Pixi grid rendering manager for infinite canvas and artboard use cases. | [packages/grid](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/grid) |
| [resizer](./resizer) | Interactive resize handles and rectangle mutation flow for Pixi containers. | [packages/resizer](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/resizer) |
| [root-container](./root-container) | Root container utilities for centered stage coordinates with zoom/pan behavior. | [packages/root-container](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/root-container) |
| [style-tree](./style-tree) | Hierarchical style matching engine keyed by noun paths and state selectors. | [packages/style-tree](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/style-tree) |
| [ticker-forest](./ticker-forest) | Forestry base class that schedules dirty-state resolve work on a Pixi ticker. | [packages/ticker-forest](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/ticker-forest) |
| [toolbar](./toolbar) | Toolbar composition store for arranging and styling groups of buttons. | [packages/toolbar](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/toolbar) |
| [window](./window) | Window manager and window store primitives with titlebar, drag, and resize support. | [packages/window](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/window) |

## Cross Dependencies

- **style-tree** is used _directly_  in  box, button, caption, window. 
- **box** is used by caption, window, and button. 
- **drag** and **resizer** is used by window. 
- **ticker-forest** is used _directly_ by box
- **button** is used _directly_ by toolbar

the other modules are free-standing and not used directly by the other modules; they may however be used by stories.
