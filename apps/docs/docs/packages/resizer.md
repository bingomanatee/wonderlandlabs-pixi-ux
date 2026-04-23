---
title: "resizer"
description: "Package README for @wonderlandlabs-pixi-ux/resizer"
---
# @wonderlandlabs-pixi-ux/resizer

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`resizer` adds editor-style handles so users can adjust bounds directly on screen.
It standardizes rectangle updates and release callbacks for windowing and design-tool workflows.

Resize handles for PixiJS containers.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/resizer
```

## Shared Runtime Setup

`resizer` depends on `@wonderlandlabs-pixi-ux/utils` for `PixiProvider`.
Before creating a `ResizerStore` or calling `enableHandles`, read the shared provider guidance in [utils docs](/packages/utils) and initialize `PixiProvider` at app boot with `PixiProvider.init(Pixi)`.

## Primary API

- `enableHandles(container, rect, config): ResizerStore`
- `ResizerStore`

## Basic Usage

```ts
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { enableHandles } from '@wonderlandlabs-pixi-ux/resizer';

PixiProvider.init(Pixi);

const app = new Pixi.Application();
await app.init({ width: 900, height: 600 });

const box = new Pixi.Container();
const shape = new Pixi.Graphics();
shape.rect(0, 0, 240, 140).fill(0x4da3ff);
box.addChild(shape);
app.stage.addChild(box);

const handles = enableHandles(box, new Pixi.Rectangle(80, 80, 240, 140), {
  app,
  pixi: PixiProvider.shared,
  mode: 'EDGE_AND_CORNER',
  size: 12,
  color: { r: 0.2, g: 0.6, b: 1 },
  minSize: { x: 200, y: 200 },
  drawRect: (rect) => {
    // rect is reported in the resizer coordinate space (see "Coordinate Model")
    box.position.set(rect.x, rect.y);
    shape.clear().rect(0, 0, rect.width, rect.height).fill(0x4da3ff);
  },
  onRelease: (rect) => {
    console.log('final', rect.width, rect.height);
  },
});

handles.setVisible(true);
handles.setRect(new Pixi.Rectangle(100, 100, 300, 160));
```

`resizer` uses the shared or injected `PixiProvider` for runtime Pixi access. In app code and stories, initialize the provider once with your installed Pixi module before creating a `ResizerStore` or calling `enableHandles`.

## Coordinate Model

- `resizer` treats rectangle values as world/frame coordinates.
- Handles are assumed to live on a layer that is not offset or scaled relative to global space.
- `resizer` does not compensate for handle-layer transforms (position/scale/rotation/skew).
- Ideally, use the final front-most container on `app.stage` for handles, or a child of such a container that remains untransformed.
- If your target lives in a transformed local space, convert in your consumer (`drawRect`/`onRelease`).
- `deltaSpace` controls which container pointer deltas are measured in.

## `EnableHandlesConfig`

```ts
{
  app: Application,
  drawRect?: (rect: Rectangle, container: Container) => void,
  onRelease?: (rect: Rectangle) => void,
  size?: number,
  color?: { r: number, g: number, b: number },
  constrain?: boolean,
  mode?: 'ONLY_EDGE' | 'ONLY_CORNER' | 'EDGE_AND_CORNER',
  deltaSpace?: Container,
  minSize?: { x: number, y: number },
}
```

## `mode` Behavior

- `ONLY_CORNER`: Shows 4 handles at the corners (`top-left`, `top-right`, `bottom-left`, `bottom-right`).
- `ONLY_EDGE`: Shows 4 handles at edge midpoints (`top-center`, `middle-right`, `bottom-center`, `middle-left`).
- `EDGE_AND_CORNER`: Shows all 8 handles.

## Hook Notes

- `drawRect(rect, container)`
  - Called during resolve after internal rectangle state changes.
  - Use this to redraw your target visuals from current rectangle state.

- `onRelease(rect)`
  - Called once when drag ends.

## `ResizerStore` Methods

- `setRect(rect)`
- `setVisible(visible)`
- `removeHandles()`
- `asRect`
- `isDragging`
- `isRunning`
- `getColor()`
