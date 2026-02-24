# @wonderlandlabs-pixi-ux/box

Tree-first box layout model built on Forestry branches.

## Status

- Public API is `BoxTree` + BoxTree measurement/alignment utilities.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/box
```

## Basic Usage

```ts
import {
  ALIGN,
  BoxTree,
  MEASUREMENT_MODE,
} from '@wonderlandlabs-pixi-ux/box';

const layout = new BoxTree({
  id: 'root',
  styleName: 'button',
  globalVerb: [],
  area: {
    x: 60,
    y: 50,
    width: { mode: MEASUREMENT_MODE.PX, value: 720 },
    height: { mode: MEASUREMENT_MODE.PX, value: 340 },
    px: 's',
    py: 's',
  },
  align: {
    x: ALIGN.START,
    y: ALIGN.START,
    direction: 'column',
  },
  children: {
    header: {
      styleName: 'header',
      area: {
        x: 0,
        y: 0,
        width: { mode: MEASUREMENT_MODE.PERCENT, value: 1 },
        height: { mode: MEASUREMENT_MODE.PX, value: 60 },
        px: 's',
        py: 's',
      },
      align: { x: 's', y: 's', direction: 'row' },
    },
    icon: {
      styleName: 'icon',
      modeVerb: ['hover'],
      area: {
        x: 0,
        y: 0,
        width: { mode: MEASUREMENT_MODE.PX, value: 24 },
        height: { mode: MEASUREMENT_MODE.PX, value: 24 },
        px: 's',
        py: 's',
      },
      align: { x: 's', y: 's', direction: 'column' },
    },
  },
});

const icon = layout.getChild('icon');
icon?.toggleModeVerb('selected');
layout.toggleGlobalVerb('disabled');
```

## Ux Assignment

`BoxTree` defaults to the built-in Pixi UX map. Override with `assignUx(ux, applyToChildren?)`:

```ts
import { BoxTreeUx } from '@wonderlandlabs-pixi-ux/box';

layout.styles = styles;
layout.assignUx((box) => new BoxTreeUx(box));
layout.render(); // calls ux.init() once, then ux.render()
```

`addChild()` inherits the parent UX map function automatically.

Constructor shortcut:

```ts
const layout = new BoxTree({
  id: 'root',
  area: { x: 0, y: 0, width: 200, height: 100 },
  ux: (box) => new BoxTreeUx(box),
});
layout.styles = styles;
```

## Style Definitions

`BoxTree` integrates with a shared style manager by way of `styleName` and verbs:

- `styleName` is the noun for that node (`button`, `icon`, `label`, ...)
- `modeVerb` is node-local state (`hover`, `selected`, ...)
- `globalVerb` is root-level state shared by all descendants (`disabled`, ...)

Use `resolveStyle(styleManager, extraStates?)` to query styles. Resolution order is:

1. Hierarchical nouns (`button.icon`, `toolbar.button.label`, ...)
2. Fallback to atomic noun (`icon`, `label`, ...)

Combined state list is:

- `globalVerb + modeVerb + extraStates`

```ts
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const styles = fromJSON({
  button: {
    icon: {
      fill: {
        $*: { color: { r: 0.2, g: 0.2, b: 0.2 }, alpha: 1 },
        $disabled: { color: { r: 0.45, g: 0.45, b: 0.45 }, alpha: 1 },
      },
    },
  },
  icon: {
    fill: {
      $*: { color: { r: 1, g: 1, b: 1 }, alpha: 1 },
    },
  },
});

const icon = layout.getChild('icon');
const fillStyle = icon?.resolveStyle(styles, ['pressed']);
```

## Default Ux

`box` ships with `BoxTreeUx`, a default Pixi UX implementation for `BoxTree`.

Behavior:

- Creates a container when `container` is not provided
- Uses public `content: BoxUxContextMap` (a `Map<number, Container | Graphics>` subclass)
- `content.$box` points at the owning `BoxTree`
- `content.$render(parentContainer)` handles ordered layer injection
- Exposes `ux.getContainer(key): unknown` for renderer-to-renderer handoff:
  - `ROOT_CONTAINER`, `BACKGROUND_CONTAINER`, `CHILD_CONTAINER`, `OVERLAY_CONTAINER`, `STROKE_CONTAINER`
- Exposes `ux.attach(targetContainer?)`:
  - attaches root container to `targetContainer`
  - if omitted, uses `ux.app?.stage`
- Pre-populates built-in layers if absent:
  - `BOX_RENDER_CONTENT_ORDER.BACKGROUND = 0`
  - `BOX_RENDER_CONTENT_ORDER.CHILDREN = 50`
  - `BOX_RENDER_CONTENT_ORDER.OVERLAY = 100`
- Rebuilds children layer each render by clearing and re-adding child UX containers
- Draws a background graphic from style props:
  - `[stylePath].bgColor`
  - `[stylePath].bgAlpha`
  - `[stylePath].bgStrokeColor`
  - `[stylePath].bgStrokeAlpha`
  - `[stylePath].bgStrokeSize`
- Exposes `ux.generateStyleMap(box)` with normalized shape:
  - `fill: { color, alpha }`
  - `stroke: { color, alpha, width }`
- Starts a `distinctUntilChanged` watcher on box updates:
  - compares computed `x`, `y`, `width`, `height`, and style map
  - when changed, sets `ux.isDirty = true` and queues a render
- Honors `box.isVisible`:
  - when `false`, hides the container and destroys/clears render content layers
  - when `true` again, layers are recreated on next render
- Iterates `content` by key and injects non-empty items into root container

```ts
import { Graphics } from 'pixi.js';
import {
  BOX_RENDER_CONTENT_ORDER,
  BoxTree,
  BoxTreeUx,
} from '@wonderlandlabs-pixi-ux/box';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const styles = fromJSON({
  button: {
    bgColor: { $*: 0x2d3a45 },
    bgStrokeColor: { $*: 0x8fd3ff },
    bgStrokeSize: { $*: 2 },
    icon: {
      bgColor: { $*: 0x3a4957 },
    },
  },
  icon: {
    bgColor: { $*: 0x222222 },
  },
});

const root = new BoxTree({
  id: 'root',
  styleName: 'button',
  area: { x: 40, y: 30, width: 200, height: 100 },
  children: {
    icon: {
      styleName: 'icon',
      order: 0,
      area: { width: 24, height: 24 },
    },
  },
});

root.styles = styles;
const ux = new BoxTreeUx(root);
root.render();
// manual mount
ux.attach(app.stage);

// custom content layer example:
ux.content.set(75, new Graphics());
ux.content.get(BOX_RENDER_CONTENT_ORDER.OVERLAY)?.visible = true;
const ownerBox = ux.content.$box;
```

## Override Points

`BoxTreeUx` is a UX base class. For custom behavior, return your own UX instance from
`assignUx((box) => ...)`, or wrap the default UX and add layers through `ux.content`.

Detailed style/composition docs:

- [`README.STYLES.md`](./README.STYLES.md)

## Optional Pixi Debug Rendering

If you just want geometry previews, you can use `boxTreeToPixi`:

```ts
import { boxTreeToPixi } from '@wonderlandlabs-pixi-ux/box';

const graphics = await boxTreeToPixi(layout, {
  includeRoot: true,
  fill: 0x2d3a45,
  fillAlpha: 0.35,
  stroke: 0x8fd3ff,
  strokeAlpha: 0.9,
  strokeWidth: 2,
});
```

## Public API

- `BoxTree`
- `BoxUx` (UX object type)
- `BoxUxMapFn`
- `BoxRenderer` (legacy alias of `BoxUx`)
- `BoxRenderMapFn` (legacy alias of `BoxUxMapFn`)
- `BoxUxContextMap`
- `BoxRenderContentMap` (legacy alias of `BoxUxContextMap`)
- `BoxTreeUx`
- `BoxTreeRenderer` (legacy alias of `BoxTreeUx`)
- `BOX_RENDER_CONTENT_ORDER`
- `createBoxTreeState`
- `resolveTreeMeasurement`
- `resolveMeasurementPx`
- `resolveConstraintValuePx`
- `applyAxisConstraints`
- `boxTreeToPixi`
- `boxTreeToSvg`
- `pathToString`, `pathString`, `combinePaths`
- `ALIGN`, `AXIS`, `MEASUREMENT_MODE`, `SIZE_MODE`, `SIZE_MODE_INPUT`
- `TreeStyleNameSchema`, `TreeVerbSchema`, `TreeVerbListSchema`

## Data Model

Use exported BoxTree schemas/types in `src/types.boxtree.ts` and measurement schemas in `src/types.ts` as the source of truth.
