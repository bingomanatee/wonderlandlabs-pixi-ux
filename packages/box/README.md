# @wonderlandlabs-pixi-ux/box

Composable layout primitives for PixiJS containers.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/box
```

## What You Get

- `BoxStore`: base rectangular container with padding, style, and masking.
- `BoxLeafStore`: single-content box (`Graphics`, `Sprite`, or `Text`).
- `BoxListStore`: row/column layout with gap and alignment.
- `BoxTextStore`: text box with optional hug sizing.

## Basic Usage

```ts
import { Application, Graphics } from 'pixi.js';
import { BoxLeafStore } from '@wonderlandlabs-pixi-ux/box';

const app = new Application();
await app.init({ width: 800, height: 600 });

const card = new BoxLeafStore({
  id: 'card',
  x: 120,
  y: 80,
  xDef: { sizeMode: 'px', size: 280, align: 'center' },
  yDef: { sizeMode: 'px', size: 140, align: 'center' },
  padding: { top: 12, right: 12, bottom: 12, left: 12 },
  style: {
    fill: { color: { r: 0.12, g: 0.14, b: 0.2 }, alpha: 1 },
    stroke: { color: { r: 0.75, g: 0.8, b: 0.92 }, width: 2, alpha: 1 },
    borderRadius: 10,
  },
}, app);

const dot = new Graphics();
dot.circle(0, 0, 18);
dot.fill(0xffb347);
card.setContent(dot);

app.stage.addChild(card.container);
card.kickoff();
```

## List Layout Example

```ts
import { BoxListStore, BoxTextStore } from '@wonderlandlabs-pixi-ux/box';

const row = new BoxListStore({
  id: 'row',
  x: 100,
  y: 260,
  direction: 'horizontal',
  gap: 10,
  gapMode: 'between',
  xDef: { sizeMode: 'hug' },
  yDef: { sizeMode: 'hug' },
  padding: { top: 8, right: 8, bottom: 8, left: 8 },
}, app);

row.addChild(new BoxTextStore({ id: 'a', text: 'One' }, app));
row.addChild(new BoxTextStore({ id: 'b', text: 'Two' }, app));
row.addChild(new BoxTextStore({ id: 'c', text: 'Three' }, app));

app.stage.addChild(row.container);
row.kickoff();
```

## Core Config Shape

```ts
{
  id: string,
  x?: number,
  y?: number,
  xDef?: { sizeMode: 'px' | 'percent' | 'percentFree' | 'fill' | 'hug', size?: number, align?: 'start' | 'center' | 'end', min?: number, max?: number },
  yDef?: { sizeMode: 'px' | 'percent' | 'percentFree' | 'fill' | 'hug', size?: number, align?: 'start' | 'center' | 'end', min?: number, max?: number },
  padding?: { top?: number, right?: number, bottom?: number, left?: number },
  style?: { fill?: {...}, stroke?: {...}, borderRadius?: number },
  noMask?: boolean,
}
```

Notes:
- `fill` is normalized internally to `percentFree` with weight `1`.
- `hug` computes dimensions from content/children + padding.
- `BoxListStore` adds `direction`, `gap`, and `gapMode`.

## Useful Methods

- `setPosition(x, y)`
- `setSize(width, height)`
- `setPadding(padding)`
- `setStyle(style)`
- `markDirty()`
- `cleanup()`

`BoxLeafStore`:
- `setContent(content)`
- `content`

`BoxListStore`:
- `addChild(child)`
- `removeChild(child)`
- `children`
- `setDirection(direction)`
- `setGap(gap)`
- `setGapMode(gapMode)`

`BoxTextStore`:
- `setText(text)`
- `setTextStyle(textStyle)`
- `textDisplay`

## Helpers

- `uniformPadding(value)`
- `symmetricPadding(vertical, horizontal)`
- `resolveMeasurement(...)`
- `resolveSizeValue(...)`
