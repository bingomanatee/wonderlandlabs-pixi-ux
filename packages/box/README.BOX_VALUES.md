# BoxTree Value Model

This document describes the current value model for `BoxTree` in `@wonderlandlabs-pixi-ux/box`.

## Scope

This is for the new tree/value geometry model in:

- `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/BoxTree.ts`
- `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/types.boxtree.ts`
- `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/types.ts`
- `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/sizeUtils.ts`

## State Schema

```ts
type Measurement = { mode: 'px' | '%'; value: number };

type AxisConstrain = {
  min?: number; // px
  max?: number; // px
};

type BoxContent = {
  type: 'text' | 'url';
  value: string;
};

type BoxTreeState = {
  area: {
    x: number;
    y: number;
    width: Measurement;
    height: Measurement;
    px?: 's' | 'c' | 'e'; // optional pivot-x, aliases: < | >
    py?: 's' | 'c' | 'e'; // optional pivot-y, aliases: < | >
  };
  align: {
    x: 's' | 'c' | 'e' | 'f';
    y: 's' | 'c' | 'e' | 'f';
    direction: 'row' | 'column';
  };
  order: number;
  absolute: boolean;
  constrain?: { x?: AxisConstrain; y?: AxisConstrain };
  content?: BoxContent;
  style?: BoxStyle;
  id?: string;
  children?: Map<string, BoxTreeState>;
};
```

## Core Rules

- `x` and `y` are local (container-relative) coordinates.
- `absX` and `absY` are world-space coordinates.
- Root config must explicitly provide `area.x` and `area.y` (even `0, 0`) to define anchor origin.
- `state.area.width` and `state.area.height` are measurements (`px` or `%`).
- `state.area.px` and `state.area.py` are optional pivot axes and default to `s`.
- `align.direction` controls child flow axis and defaults to `column`.
- `order` controls sibling ordering (ascending; ties sorted by child key).
- `absolute: true` means the node uses its own area position/sizing and ignores align-driven positioning/fill behavior.
- `content` is optional structured payload for text or url content metadata (`{ type: 'text' | 'url', value: string }`).
- For layout/rendering, read geometry from local getters (`x`, `y`, `width`, `height`, `area`) instead of raw state values.
- Children are stored in `Map<string, BoxTreeState>`.
- Child branches are passively created with Forestry wildcard branch params (`'*'`).

## Zod Schemas

The model is now Zod-first. Types are inferred from schemas and values are gated through parsing.

Primary schemas in `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/types.boxtree.ts`:

- `AxisSchema`
- `AlignKeywordSchema`
- `AlignInputSchema`
- `AreaPivotKeywordSchema`
- `AreaPivotInputSchema`
- `BoxAreaSchema`
- `DirectionSchema`
- `BoxAlignSchema`
- `BoxConstrainSchema`
- `BoxTreeNodeStateSchema`
- `BoxTreeNodeConfigSchema`

Primary schemas in `/Users/davidedelhart/Documents/repos/forestry-pixi/packages/box/src/types.ts`:

- `SizeModeSchema`
- `MeasurementConfigSchema`
- `MeasurementSchema`
- `PxValueSchema`
- `AxisConstraintSchema`

## Align Semantics

Accepted input values:

- `s` (`start`)
- `c` (`center`)
- `e` (`end`)
- `f` (`fill`)
- Aliases:
- `<` -> `s`
- `|` -> `c`
- `>` -> `e`
- `<>` -> `f`

Readable constants are exported for config readability:

```ts
import { ALIGN } from '@wonderlandlabs-pixi-ux/box';

const align = {
  x: ALIGN.RIGHT,
  y: ALIGN.MIDDLE,
};
```

Meaning:

- `s`: place child at parent start edge (+ local `area.x/y` offset).
- `c`: center child in parent (+ local offset).
- `e`: place child at parent end edge (- local offset).
- `f`: size child to parent axis size, position like `s`.

## Pivot Semantics (`area.px` / `area.py`)

Accepted values:

- Canonical: `s`, `c`, `e`
- Aliases: `<`, `|`, `>`

Meaning per axis:

- `s`: anchor is at the start edge of the box on that axis.
- `c`: anchor is at the center of the box on that axis.
- `e`: anchor is at the end edge of the box on that axis.

Resolved local position is:

- `x = anchorX - pivotOffsetX`
- `y = anchorY - pivotOffsetY`
- `pivotOffsetX = 0 | width/2 | width` for `s | c | e`
- `pivotOffsetY = 0 | height/2 | height` for `s | c | e`

## Constrain Semantics

`constrain.x` and `constrain.y` each support:

- `min?: number` (px)
- `max?: number` (px)

### Impossible Ranges

If both `min` and `max` resolve and `min > max`, only `min` is respected.

## Geometry Resolution

Width/height resolution per axis:

1. Compute base size:
- non-absolute + `f` with parent: base = parent axis size
- otherwise: base = resolved local measurement from `state.area.width` / `state.area.height`
2. Resolve axis `min`/`max` constraints.
3. Apply constraints to base.
4. If `min > max`, clamp only to `min`.

Position resolution:

- Root:
- `anchorX = area.x`, `anchorY = area.y`
- `x/y` are derived from `anchor - pivotOffset`
- Non-root:
- local anchor (when `absolute !== true`):
- on flow axis (`x` for `row`, `y` for `column`): `flowOffset + area.x/y`
- `s`/`f`: offset
- `c`: `(parentSize - childSize)/2` + offset
- `e`: `(parentSize - childSize)` - offset
- local anchor (when `absolute === true`):
- always `area.x` / `area.y` (align offsets are ignored)
- local `x`/`y`:
- `anchor - pivotOffset`
- world `absX`/`absY`:
- `parent.absX + x`, `parent.absY + y`

## Practical Notes

- Root nodes generally own explicit `area` dimensions.
- `state.area.width` / `state.area.height` are measurements.
- Numeric measurement input is valid and treated as px shorthand (`12` -> `{ mode: 'px', value: 12 }`).
- `order` defaults to `0`; `absolute` defaults to `false`.
- Child constrained sizing uses plain px min/max values.
- `setWidthPx` / `setHeightPx` write measurement `{ mode: 'px', value }`.
- `setWidthPercent` / `setHeightPercent` write measurement `{ mode: '%', value }`.
- `resolveMeasurement(measurement, { axis, parentPixels })` resolves a full measurement object directly.

## Config Example

```json
{
  "id": "root",
  "area": {
    "x": 10,
    "y": 20,
    "width": { "mode": "px", "value": 400 },
    "height": { "mode": "px", "value": 200 }
  },
  "align": { "x": "s", "y": "s", "direction": "column" },
  "children": {
    "bubble": {
      "content": { "type": "text", "value": "Hello there" },
      "area": {
        "x": 5,
        "y": 6,
        "px": ">",
        "py": "<",
        "width": { "mode": "%", "value": 0.2 },
        "height": { "mode": "px", "value": 30 }
      },
      "align": { "x": "e", "y": "c", "direction": "column" },
      "constrain": {
        "x": {
          "min": 40
        }
      }
    }
  }
}
```

Notes for this example:

- `align` short forms are canonical (`s`, `c`, `e`, `f`).
- `width` can be `%` and is resolved against parent width.
- `constrain.x.min` is a px value and is applied directly.

## Measurement Alias: `/`

For config input, you can also provide ratio measurements:

- `{ "mode": "/", "value": 2, "base": 3 }` means `2/3`, normalized to `{ "mode": "%", "value": 0.666... }`.
- `base` is required for `/` measurements.
- `base` must be `>= value`.
- `base` must be `> 0`.

Readable size mode constants are also exported:

```ts
import { MEASUREMENT_MODE as SIZE } from '@wonderlandlabs-pixi-ux/box';

const area = {
  width: { mode: SIZE.FRACTION, value: 2, base: 3 },
  height: { mode: SIZE.PERCENT, value: 0.25 },
};
```
