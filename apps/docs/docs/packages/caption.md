---
title: "caption"
description: "Package README for @wonderlandlabs-pixi-ux/caption"
---
# @wonderlandlabs-pixi-ux/caption

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`caption` is for dialogue and annotation UI where readability and pointer geometry matter.
It packages speech and thought-bubble variants into one API so you can drop narrative UI into scenes quickly.

Caption bubbles for PixiJS with:

- rectangular text boxes with optional corner radius
- oval speech bubbles
- thought bubbles (ellipse + border circles)
- optional pointer triangles that aim toward a speaker point
- text and background styling APIs

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/caption @wonderlandlabs-pixi-ux/style-tree
```

## Shared Runtime Setup

`caption` depends on `@wonderlandlabs-pixi-ux/utils` for `PixiProvider`, uses `box` for inner text/content placement, and can resolve theme values from `style-tree` while keeping bubble edges and pointer geometry custom.
Before creating a `CaptionStore`, read the shared provider guidance in [utils docs](/packages/utils) and initialize `PixiProvider` at app boot with `PixiProvider.init(Pixi)`.
Style naming in `caption` still deviates from the shared [Style DSL](/packages/style-tree-style-dsl). The current `bubble.*` keys are work in progress and are intended to migrate toward `background.*` / `border.*`.

## Basic usage

```ts
import * as Pixi from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { CaptionStore } from '@wonderlandlabs-pixi-ux/caption';

PixiProvider.init(Pixi);

const app = new Pixi.Application();
await app.init({ width: 800, height: 600 });

const caption = new CaptionStore({
  id: 'npc-caption',
  text: 'Follow me.',
  x: 160,
  y: 120,
  shape: 'oval',
  pointer: {
    enabled: true,
    speaker: { x: 420, y: 300 },
    baseWidth: 16,
    length: 28,
  },
  backgroundStyle: {
    fill: { color: { r: 0.1, g: 0.1, b: 0.1 }, alpha: 0.95 },
    stroke: { color: { r: 1, g: 1, b: 1 }, width: 2, alpha: 0.9 },
  },
  textStyle: {
    fontSize: 20,
    fill: 0xffffff,
    align: 'center',
    wordWrap: true,
  },
}, app, undefined, PixiProvider.shared);

app.stage.addChild(caption.container);
```

## Notes

- `pointer.speaker` is in the same coordinate space as the caption's parent container.
- Pointer tails always terminate at `pointer.speaker`.
- `pointer.baseWidth` controls tail thickness per-caption.
- `autoSize` defaults to `true` and sizes the bubble around text + padding.
- Calling `setSize(width, height)` turns `autoSize` off for manual sizing.
- `shape: 'thought'` uses `thought.edgeCircleCount` and `thought.edgeCircleRadiusRatio` to control border circles.
- Circle radius is computed as `min(width, height) * edgeCircleRadiusRatio`.
- `styleTree` / `styleDef` can theme `padding`, `bubble.radius`, `bubble.fill.*`, `bubble.stroke.*`, and `label.font.*` under `caption` or shape-specific paths like `caption.thought.*`.
- Those `bubble.*` paths are transitional and do not yet match the canonical DSL.
