# @wonderlandlabs-pixi-ux/grid

Infinite/grid-artboard renderer for PixiJS using `GridManager`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/grid
```

## What This Package Exports

- `GridManager`
- `GridManagerConfig`
- grid/artboard config types (`GridLineOptions`, `ArtboardOptions`, `GridStoreValue`)

## Basic Usage

```ts
import { Application } from 'pixi.js';
import { createRootContainer, createZoomPan, makeStageDraggable, makeStageZoomable } from '@wonderlandlabs-pixi-ux/root-container';
import { GridManager } from '@wonderlandlabs-pixi-ux/grid';

const app = new Application();
await app.init({ width: 1200, height: 800 });

const { root } = createRootContainer(app);
app.stage.addChild(root); // manual mount
const { zoomPan } = createZoomPan(app, root);
root.addChild(zoomPan); // manual mount
makeStageDraggable(app, zoomPan);
makeStageZoomable(app, zoomPan);

const grid = new GridManager({
  application: app,
  zoomPanContainer: zoomPan,
  gridSpec: {
    grid: { x: 50, y: 50, color: 0xcccccc, alpha: 0.5 },
    gridMajor: { x: 200, y: 200, color: 0x999999, alpha: 0.7 },
    artboard: { x: 0, y: 0, width: 800, height: 600, color: 0x000000, alpha: 1 },
  },
});

// Update on demand.
grid.updateGridSpec({
  grid: { x: 40, y: 40 },
});

// Cleanup when done.
grid.cleanup();
```

## Grid Spec Shape

```ts
{
  grid: { x: number, y: number, color: number, alpha: number },
  gridMajor?: { x: number, y: number, color: number, alpha: number },
  artboard?: { x: number, y: number, width: number, height: number, color: number, alpha: number },
}
```

## Runtime Behavior

- Listens for `stage-zoom` and `stage-drag` events from stage decorators.
- Keeps line thickness visually stable across zoom levels.
- Automatically increases effective spacing at small zoom to reduce visual clutter.
