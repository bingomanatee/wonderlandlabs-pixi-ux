# Box Styles and Composition

This page documents how the default `BoxTreeUx` composes render layers and which style keys it reads.

Typical flow:

1. `root.styles = styles`
2. `root.assignUx((box) => new BoxTreeUx(box))`
3. `root.render()`

## Style Path Resolution

Each `BoxTree` node has:

- `styleName`
- `modeVerb[]`
- root-level `globalVerb[]`

When UX code resolves a style property:

1. Try hierarchical path + property, e.g. `button.icon.bgColor`
2. Try hierarchical object, e.g. `button.icon` then pick `bgColor`
3. Fallback to atomic path + property, e.g. `icon.bgColor`
4. Fallback to atomic object, e.g. `icon` then pick `bgColor`

State list is:

- `globalVerb + modeVerb`

## Default Style Keys

The default UX reads:

- `bgColor`
- `bgAlpha`
- `bgStrokeColor`
- `bgStrokeAlpha`
- `bgStrokeSize`

From resolved paths, this means keys like:

- `panel.bgColor`
- `button.icon.bgStrokeColor`
- `icon.bgStrokeSize`

## Composition Model

`BoxTreeUx` exposes:

- `content: BoxUxContextMap` (`Map<number, Container | Graphics>` subclass)
- `content.$box` for the owner node
- `content.$render(parentContainer)` for ordered layer injection
- `getContainer(key): unknown` with keys:
  - `ROOT_CONTAINER`, `BACKGROUND_CONTAINER`, `CHILD_CONTAINER`, `OVERLAY_CONTAINER`, `STROKE_CONTAINER`
- `attach(targetContainer?)` to mount root container to a parent (or `ux.app?.stage`)
- `generateStyleMap(box)` -> `{ fill: { color, alpha }, stroke: { color, alpha, width } }`
- `isDirty`, `markDirty()`, `queueRender()`

Default reserved layer keys:

- `BOX_RENDER_CONTENT_ORDER.BACKGROUND = 0`
- `BOX_RENDER_CONTENT_ORDER.CHILDREN = 50`
- `BOX_RENDER_CONTENT_ORDER.OVERLAY = 100`

On every `render()`:

1. Default layers are pre-populated if missing
2. Child UX instances are updated
3. Child container is cleared and rebuilt from current child UX containers
4. Background/stroke are redrawn from styles
5. `content` is iterated by ascending key and non-empty items are attached to the root container

UX also starts a `distinctUntilChanged` subscription against the owning box:

- compares computed `x`, `y`, `width`, `height`, and `generateStyleMap(box)`
- when changed, sets dirty once and queues render

## Built-in Layers

- `BACKGROUND`:
  - `Graphics`
  - draws fill from `bgColor`
- `CHILDREN`:
  - `Container`
  - receives child renderer containers each frame
- `OVERLAY`:
  - `Container`
  - contains stroke `Graphics` drawing from `bgStrokeColor` + `bgStrokeSize`

## Extending With Custom Layers

You can inject custom layers by setting additional `content` entries:

```ts
import { Graphics } from 'pixi.js';
import { BoxTreeUx } from '@wonderlandlabs-pixi-ux/box';

box.styles = styles;
const ux = new BoxTreeUx(box);
const custom = new Graphics();
custom.visible = true;

ux.content.set(75, custom); // between CHILDREN (50) and OVERLAY (100)
ux.box.render();
```

## Notes

- The default UX is intentionally simple: background + children + overlay stroke.
- If you need richer visuals, return a custom UX object from `assignUx`.
