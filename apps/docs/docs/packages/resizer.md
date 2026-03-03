---
title: resizer
description: Package README for @wonderlandlabs-pixi-ux/resizer
---
# @wonderlandlabs-pixi-ux/resizer

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/resizer](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/resizer)

`resizer` adds editor-style handles so users can adjust bounds directly on screen.
It standardizes rectangle updates and release callbacks for windowing and design-tool workflows.

Resize handles and drag helpers for PixiJS containers.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/resizer
```

## Primary API

- `enableHandles(container, rect, config): ResizerStore`
- `ResizerStore`
- `trackDrag(target, callbacks, stage?)`

## Basic Usage

```ts
import { Application, Container, Graphics, Rectangle } from 'pixi.js';
import { enableHandles } from '@wonderlandlabs-pixi-ux/resizer';

const app = new Application();
await app.init({ width: 900, height: 600 });

const box = new Container();
const shape = new Graphics();
shape.rect(0, 0, 240, 140).fill(0x4da3ff);
box.addChild(shape);
app.stage.addChild(box);

const handles = enableHandles(box, new Rectangle(80, 80, 240, 140), {
  app,
  mode: 'EDGE_AND_CORNER',
  size: 12,
  color: { r: 0.2, g: 0.6, b: 1 },
  constrain: false,
  drawRect: (rect) => {
    box.position.set(rect.x, rect.y);
    shape.clear().rect(0, 0, rect.width, rect.height).fill(0x4da3ff);
  },
  onRelease: (rect) => {
    console.log('final', rect.width, rect.height);
  },
  rectTransform: ({ rect, phase, handle }) => {
    const snap = (value) => Math.round(value / 20) * 20;
    return new Rectangle(snap(rect.x), snap(rect.y), snap(rect.width), snap(rect.height));
  },
  onTransformedRect: (rawRect, transformedRect, phase) => {
    if (phase === 'drag') {
      // Optional preview for snapped/augmented coordinates while dragging.
    }
  },
});

// Optional helpers:
handles.setVisible(true);
handles.setRect(new Rectangle(100, 100, 300, 160));
```

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
  rectTransform?: (params: { rect: Rectangle, phase: 'drag' | 'release', handle: HandlePosition | null }) => Rectangle | Rect,
  onTransformedRect?: (rawRect: Rectangle, transformedRect: Rectangle, phase: 'drag' | 'release') => void,
}
```

## `mode` Behavior

- `ONLY_CORNER`: Shows 4 handles at the corners (`top-left`, `top-right`, `bottom-left`, `bottom-right`).
- `ONLY_EDGE`: Shows 4 handles at edge midpoints (`top-center`, `middle-right`, `bottom-center`, `middle-left`).
- `EDGE_AND_CORNER`: Shows all 8 handles.

Choose `mode` based on the interaction model you want:

- Corner-only is usually best for freeform diagonal resizing.
- Edge-only is useful when users should primarily resize width/height independently.
- Full mode is best for editor-like UX where all resize affordances are visible.

## Hook Notes

All hooks are optional. If you omit them, resizing still works with the default rectangle updates.

- `drawRect(rect, container)`
  - Called during resolve after internal rectangle state changes.
  - Use this to redraw your target visuals from current rectangle state.

- `onRelease(rect)`
  - Called once when drag ends.
  - If `rectTransform` is provided, this receives the transformed/committed rectangle.
  - If `rectTransform` is omitted, this receives the raw dragged rectangle.

- `rectTransform({ rect, phase, handle })`
  - Called with a single object argument:
    - `rect`: raw rectangle for this phase.
    - `phase`: `'drag' | 'release'`.
    - `handle`: active `HandlePosition` while dragging, otherwise `null`.
  - Return a `Rectangle` or `Rect`.
  - `'drag'` phase is for preview logic.
  - `'release'` phase is committed to store state before `onRelease`.

- `onTransformedRect(rawRect, transformedRect, phase)`
  - Called when `rectTransform` is present.
  - Useful for overlay/preview visuals (for example snapping guides or marching-ants previews).
  - During `'drag'`, transformed output is preview-only unless you choose to render it.
  - During `'release'`, transformed output is the value being committed.

`rectTransform` is applied when drag ends (`phase: 'release'`), and the transformed rectangle is committed to store state.
When provided with `onTransformedRect`, the same transform can be previewed during drag (`phase: 'drag'`) for augmented overlays/snapping guides.

## `ResizerStore` Methods

- `setRect(rect)`
- `setVisible(visible)`
- `removeHandles()`
- `asRect`
- `getColor()`

## `trackDrag` Utility

`trackDrag` is exported independently if you need plain drag tracking without resize handles.

```ts
trackDrag(target, {
  onDragStart: (e) => {},
  onDragMove: (dx, dy, e) => {},
  onDragEnd: (e) => {},
}, stage);
```
