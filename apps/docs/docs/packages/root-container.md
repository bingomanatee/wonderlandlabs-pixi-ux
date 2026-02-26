---
title: root-container
description: Package README for @wonderlandlabs-pixi-ux/root-container
---
# @wonderlandlabs-pixi-ux/root-container

`root-container` gives you a stable scene foundation with centered coordinates and camera-like movement.
It is the baseline for Pixi experiences that need zooming, panning, and predictable world-space math.

Root/zoom-pan container utilities for PixiJS.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/root-container
```

## Basic Usage

```ts
import { Application } from 'pixi.js';
import {
  createRootContainer,
  createZoomPan,
  makeStageDraggable,
  makeStageZoomable,
} from '@wonderlandlabs-pixi-ux/root-container';

const app = new Application();
await app.init({ width: 1200, height: 800 });

const { root, destroy: destroyRoot } = createRootContainer(app);
app.stage.addChild(root); // manual mount
const { zoomPan, destroy: destroyZoomPan } = createZoomPan(app, root);
root.addChild(zoomPan); // manual mount

const drag = makeStageDraggable(app, zoomPan);
const zoom = makeStageZoomable(app, zoomPan, {
  minZoom: 0.25,
  maxZoom: 6,
  zoomSpeed: 0.1,
});

zoom.setZoom(1.5);
console.log('zoom:', zoom.getZoom());

// Later:
drag.destroy();
zoom.destroy();
destroyZoomPan();
destroyRoot();
```

## Exported APIs

### `createRootContainer(app)`

Returns:
- `stage`: app stage
- `root`: centered root container (origin at screen center)
- `destroy()`: removes listeners and destroys root

Note: `createRootContainer` does not auto-mount. Add `root` to stage manually.

### `createZoomPan(app, root?)`

Returns:
- `zoomPan`: container for world/content
- `destroy()`: removes and destroys zoomPan

Note: `createZoomPan` does not auto-mount. Add `zoomPan` to a parent manually.

### `makeStageDraggable(app, container)`

Returns:
- `destroy()`

Emits `stage-drag` events on `app.stage`:

```ts
{ type: 'drag-start' | 'drag-move' | 'drag-end', position: { x, y } }
```

### `makeStageZoomable(app, container, options?)`

Options:

```ts
{ minZoom?: number, maxZoom?: number, zoomSpeed?: number }
```

Returns:
- `setZoom(zoom)`
- `getZoom()`
- `destroy()`

Emits `stage-zoom` events on `app.stage`:

```ts
{ type: 'zoom', zoom: number, mousePosition: { x, y } }
```
