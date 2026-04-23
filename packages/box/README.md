# @wonderlandlabs-pixi-ux/box

`box` is a render-agnostic layout tree. It gives you deterministic 2D layout
for area, alignment, constraints, and ordering without tying your state to Pixi objects.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/box pixi.js
```

`pixi.js` is a peer dependency. Runtime rendering goes through `PixiProvider`, either by passing `pixi` explicitly or by initializing `PixiProvider.shared` before calling the Pixi renderer.

## Shared Runtime Setup

`box` depends on `@wonderlandlabs-pixi-ux/utils` for `PixiProvider`.
Before using the Pixi render path in production, Storybook, or integration tests, read the shared provider guidance in [utils docs](/packages/utils) and initialize `PixiProvider` at app boot with `PixiProvider.init(Pixi)`.
For style naming, treat `box` as the baseline implementation of the shared [Style DSL](/packages/style-tree-style-dsl): `background.*`, `border.*`, `label.font.*`, `padding`, and `gap`.

## Basic Usage

```ts
import {
  ALIGN,
  BoxTree,
  UNIT_BASIS,
} from '@wonderlandlabs-pixi-ux/box';

const layout = new BoxTree({
  id: 'root',
  styleName: 'button',
  globalVerb: [],
  area: {
    x: 60,
    y: 50,
    width: { mode: UNIT_BASIS.PX, value: 720 },
    height: { mode: UNIT_BASIS.PX, value: 340 },
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
        width: { mode: UNIT_BASIS.PERCENT, value: 1 },
        height: { mode: UNIT_BASIS.PX, value: 60 },
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
        width: { mode: UNIT_BASIS.PX, value: 24 },
        height: { mode: UNIT_BASIS.PX, value: 24 },
        px: 's',
        py: 's',
      },
      align: { x: 's', y: 's', direction: 'column' },
    },
  },
});

layout.toggleGlobalVerb('disabled');
layout.getChild('icon')?.toggleModeVerb('selected');
```

## Children Ordering

`children` config can currently be provided as either a `Map` or a plain object.
If child order matters, prefer `Map`.

Plain object input is normalized with `Object.entries(...)`, so normal string keys keep creation order,
but numeric-like keys such as `"0"`, `"1"`, and `"2"` follow JavaScript object key ordering rules before conversion.
`Map` preserves insertion order exactly.

## Ux Assignment

`BoxTree` defaults to the built-in Pixi UX map. Override with `assignUx(ux, applyToChildren?)`:

```ts
import { BoxUxPixi } from '@wonderlandlabs-pixi-ux/box';

layout.styles = styles;
layout.assignUx((box) => new BoxUxPixi(box));
layout.render();
```

`addChild()` inherits the UX map function from its parent.

Constructor shortcut:

```ts
const layout = new BoxTree({
  id: 'root',
  area: { x: 0, y: 0, width: 200, height: 100 },
  ux: (box) => new BoxUxPixi(box),
});
layout.styles = styles;
```

## Style Resolution

The preferred style vocabulary for `box` is the shared [Style DSL](/packages/style-tree-style-dsl).
Use this package as the baseline reference for structural style nouns such as `background.*`, `border.*`, `label.font.*`, `padding`, and `gap`.

Each node has a `styleName` and optional state verbs:

- `styleName`: style noun for the node
- `modeVerb`: node-local states such as `hover`, `selected`, or `active`
- `globalVerb`: root-wide states shared by descendants such as `disabled` or `readonly`

When you call `resolveStyle(styleManager, extraStates?)`, `BoxTree` queries:

1. Hierarchical path first such as `button.icon` or `toolbar.button.label`
2. Atomic fallback such as `icon` or `label`

With combined states:

- `globalVerb + modeVerb + extraStates`

## Default Ux

Use `BoxUxPixi` for default Pixi rendering.

It:

- creates a container when none is provided
- uses public `content: MapEnhanced` (`Map<string, unknown>`)
- sets `content.$box` to the owning box
- exposes `ux.getContainer(key)` for child UX handoff
- exposes `ux.attach(targetContainer?)`
- creates default layers keyed by `BOX_RENDER_CONTENT_ORDER`
- lets you extend layer ordering via `BOX_UX_ORDER`, `setUxOrder(...)`, and `getUxOrder(...)`
- clears and rebuilds the children layer each render cycle
- draws background and stroke from resolved style props
- honors `box.isVisible` without discarding render content
- injects non-empty content items sorted by `zIndex`

```ts
import { Graphics } from 'pixi.js';
import {
  BOX_RENDER_CONTENT_ORDER,
  BoxTree,
  BoxUxPixi,
} from '@wonderlandlabs-pixi-ux/box';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const styles = fromJSON({
  panel: {
    bgColor: { $*: 0x2d3a45 },
    bgStrokeColor: { $*: 0x8fd3ff },
    bgStrokeSize: { $*: 2 },
  },
});

const root = new BoxTree({
  id: 'root',
  styleName: 'panel',
  area: { x: 20, y: 20, width: 220, height: 120 },
});

root.styles = styles;
const ux = new BoxUxPixi(root);
root.render();
ux.attach(app.stage);

const custom = new Graphics();
custom.zIndex = 76;
custom.visible = true;
ux.content.set('CUSTOM', custom);
ux.content.get('OVERLAY')?.visible = true;
```

## Override Points

`BoxUxBase` is the renderer-agnostic lifecycle base.
`BoxUxPixi` extends it with Pixi-specific container, graphics, and content behavior.

Build custom rendering by returning your own UX object from `assignUx((box) => ...)`:

- extend `BoxUxBase` for a non-Pixi renderer
- extend `BoxUxPixi` for Pixi customization

See [Box Styles and Composition](./README.STYLES_COMPOSITION.md) for the renderer-facing contract.
That topic doc describes the current `box` renderer contract and is the reference point the other packages should converge toward.

## Optional Pixi Geometry Preview

```ts
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { boxTreeToPixi } from '@wonderlandlabs-pixi-ux/box';

PixiProvider.init(Pixi);

const graphics = await boxTreeToPixi(layout, {
  includeRoot: true,
  fill: 0x2d3a45,
  fillAlpha: 0.35,
  stroke: 0x8fd3ff,
  strokeAlpha: 0.9,
  strokeWidth: 2,
});
```

For tests, pass `pixi: new PixiProvider(PixiProvider.fallbacks)` and inspect the returned tree without creating a live Pixi canvas.

## Public API Snapshot

- `BoxTree`
- `BoxUx`
- `BoxUxMapFn`
- `BoxRenderer`
- `BoxRenderMapFn`
- `MapEnhanced`
- `BoxUxBase`
- `BoxUxPixi`
- `BoxTreeRenderer`
- `BOX_UX_ORDER`, `getUxOrder`, `setUxOrder`
- `BOX_RENDER_CONTENT_ORDER`
- `createBoxTreeState`
- `resolveTreeMeasurement`
- `resolveMeasurementPx`
- `resolveConstraintValuePx`
- `applyAxisConstraints`
- `boxTreeToPixi`
- `boxTreeToSvg`
- `pathToString`, `pathString`, `combinePaths`
- `ALIGN`, `AXIS`, `UNIT_BASIS`, `SIZE_MODE`, `SIZE_MODE_INPUT`

## Status

This package is mid-refactor.

The active architecture is the simplified `BoxStore` and `ComputeAxis` path in `src/`.

## Test Artifacts

The `ComputeAxis` tests generate:

- SVG diagrams for layout inspection
- HTML tables for readable scenario metadata

These artifacts are written under `packages/box/test/artifacts` and are ignored by the package-level `.gitignore`.
