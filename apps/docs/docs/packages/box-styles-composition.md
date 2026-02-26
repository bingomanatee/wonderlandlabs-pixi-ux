---
title: box styles and composition
description: Style keys, layering, and composition behavior for the default BoxUxPixi.
---

# Box Styles and Composition

This page documents how the default `BoxUxPixi` composes layers and how styles are resolved. 

Every root BoxTree has a style value set in options from `@wonderlandlabs-pixi-ux/style-tree` that defines how the 
background and border of the box is visualized: colors, stroke color and width, and alpha. Individual children are
given styleNames, and styleVerbs that can be changed do interaction (hover, click, etc.) to give visual cues.

In the style tree you can style specific paths such as `topPanel.button` or generic wildcards such as `topPanel.*.button`.
You can also create tree-wide targets like `icon` that are true for icons throughout the tree regardless of location. 

The principles here are similar to the specificity pattern in CSS: you can create a generic color like
`button.bgColor` and an override like `button.bgColor + hover` with "verbs" that reflect specific interaction situations
or state changes like `disabled` or `primary`. 

## Style Resolution

Each node contributes:

- `styleName`
- `modeVerb[]`
- root `globalVerb[]`

The UX resolves each style property using this order:

1. Hierarchical property path (`button.icon.bgColor`)
2. Hierarchical object (`button.icon` -> `bgColor`)
3. Atomic property path (`icon.bgColor`)
4. Atomic object (`icon` -> `bgColor`)

State list used in lookups:

- `globalVerb + modeVerb`

## Default Style Properties

The default UX reads:

- `bgColor`
- `bgAlpha`
- `bgStrokeColor`
- `bgStrokeAlpha`
- `bgStrokeSize`

## UX pairing

the BoxTree state is renderer-agnostic; it is not designed to be specific to a particular rendering system (HTML, PIXI,
three.js, SVG...) but to have universal positioning and sizing for any number of systems. 

Each box has a specific .ux class that renders all the content for the box; by default it is the PIXI based renderer.
That renderer produces a __background graphic__ for coloring a rectangle behind all the content, a __child collection__
for injecting all the children of the associated BoxTree, and an __overlay container__ for the graphic that asserts a 
border outline over all the other parts of the layer. 

### Custom Layers

A custom system can add other layers around these ones, for instance, for a shadow or a tinted cover; these can be injected
into the content map of the renderer by 

1. creating a custom key(string) to insert content into the content map
2. defining an order for that key
3. manually creating content and injecting it into the content map

You may want to create a superclass of the renderer.

Built-in layer keys (for the PIXI renderer):

- `BOX_RENDER_CONTENT_ORDER.BACKGROUND = 0`
- `BOX_RENDER_CONTENT_ORDER.CHILDREN = 50`
- `BOX_RENDER_CONTENT_ORDER.CONTENT = 75`
- `BOX_RENDER_CONTENT_ORDER.OVERLAY = 100`
- `BOX_UX_ORDER` maps layer names to z-indexes
- `setUxOrder(name, zIndex)` adds/updates a named layer order and throws on duplicate z-index
- `getUxOrder(name)` resolves named layer order

Each render cycle:

1. Built-ins are created if absent
2. Child UX instances are resolved
3. Children container is cleared and repopulated from current child UX containers
4. Optional `box.content` is rendered into the `CONTENT` layer (`text` and image URL content)
5. Background/stroke graphics are redrawn
6. Content map items are sorted by `zIndex` and non-empty items are attached to the root container

Render queueing is handled by `BoxTree` state watchers, not by `BoxUxPixi`.

## Built-in Content Items

- `BACKGROUND`: fill graphic (`bgColor`)
- `CHILDREN`: child UX container host
- `CONTENT`: optional node content host (`box.content`)
- `OVERLAY`: container that holds stroke graphic (`bgStrokeColor`, `bgStrokeSize`)

## Adding Your Own Layers

```ts
import { Graphics } from 'pixi.js';
import { BoxUxPixi } from '@wonderlandlabs-pixi-ux/box';

box.styles = styles;
const ux = new BoxUxPixi(box);
const customLayer = new Graphics();
customLayer.zIndex = 76; // 75 is reserved for CONTENT
customLayer.visible = true;

ux.content.set('CUSTOM', customLayer);
ux.box.render();
```

Use any string key and set `zIndex` on the display object to place custom layers.
