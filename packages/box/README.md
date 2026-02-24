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
import { BoxTree, ALIGN, MEASUREMENT_MODE } from '@wonderlandlabs-pixi-ux/box';

const root = new BoxTree({
  value: {
    id: 'root',
    area: {
      x: 0,
      y: 0,
      width: { mode: MEASUREMENT_MODE.PIXELS, value: 400 },
      height: { mode: MEASUREMENT_MODE.PIXELS, value: 200 },
      px: 's',
      py: 's',
    },
    align: {
      x: ALIGN.S,
      y: ALIGN.S,
      direction: 'column',
    },
  },
});

root.$set('children.card', {
  id: 'card',
  area: {
    x: 12,
    y: 8,
    width: { mode: MEASUREMENT_MODE.PERCENT, value: 0.5 },
    height: { mode: MEASUREMENT_MODE.PIXELS, value: 48 },
    px: 's',
    py: 's',
  },
  align: { x: 's', y: 's', direction: 'column' },
});
```

## Public API

- `BoxTree`
- `createBoxTreeState`
- `resolveTreeMeasurement`
- `resolveMeasurementPx`
- `resolveConstraintValuePx`
- `applyAxisConstraints`
- `boxTreeToPixi`
- `boxTreeToSvg`
- `pathToString`, `pathString`, `combinePaths`
- `ALIGN`, `AXIS`, `MEASUREMENT_MODE`, `SIZE_MODE`, `SIZE_MODE_INPUT`

## Data Model

Use the exported BoxTree schemas/types in `src/types.boxtree.ts` and measurement schemas in `src/types.ts` as the source of truth.
