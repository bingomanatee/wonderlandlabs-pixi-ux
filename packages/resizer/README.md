# @wonderlandlabs-pixi-ux/resizer

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
}
```

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
