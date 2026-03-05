---
title: ticker-forest
description: Package README for @wonderlandlabs-pixi-ux/ticker-forest
---
# @wonderlandlabs-pixi-ux/ticker-forest

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/ticker-forest](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/ticker-forest)

`ticker-forest` is the shared render scheduler for the monorepo.
It bridges state changes and frame rendering so Pixi updates always happen inside ticker callbacks.

## Overview

`TickerForest<T>` solves a common issue in Pixi UIs:
state updates can happen at any time, but Pixi display operations are safest when applied in a frame/ticker cycle.

Core flow:
1. Subclasses mark themselves dirty (`makeDirty(...)`).
2. Subclasses call `queueResolve()` once.
3. `TickerForest` runs `resolve()` on the next tick.
4. `clearDirty()` resets dirty flags after render work is done.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/ticker-forest
```

## API

### Constructor

```typescript
constructor(
  args: StoreParams<T>,
  config?: {
    app?: Application;
    ticker?: Ticker;
    container?: Container;
    dirtyOnScale?: boolean | {
      enabled?: boolean;
      watchX?: boolean;
      watchY?: boolean;
      epsilon?: number;
      relativeToRootParent?: boolean;
    };
  } | Application
)
```

- `args`: Forestry config (`value`, `res`, and other Forest options)
- `config.app`: optional `Application`
- `config.ticker`: explicit ticker override
- `config.container`: container used for scale observation/helpers
- `config.dirtyOnScale`: auto-mark dirty when container scale changes

Ticker resolution precedence:
1. Explicit `config.ticker` (or `store.ticker = ...`)
2. `config.app?.ticker`
3. `store.$parent?.ticker`

### `dirtyOnScale` options

`dirtyOnScale: true` uses defaults:
- `watchX: true`
- `watchY: true`
- `epsilon: 0.0001`
- `relativeToRootParent: true`

You can also pass an object:
- `enabled`: turn observer on/off
- `watchX` / `watchY`: choose tracked axes
- `epsilon`: tolerance for `distinctUntilChanged`
- `relativeToRootParent`: if `true`, compare scale relative to top-most parent; if `false`, use local `container.scale`

When scale changes and `isDirty()` is currently `false`, the store performs:
1. `makeDirty({ reason: 'scale' })`
2. `queueResolve()`

### Scale helpers

- `getScale(): { x, y }`
- `getInverseScale(): { x, y }`

`getInverseScale()` is computed directly from `getScale()`, so components can use consistent counter-scaling.

Typical use case:
- keep titlebar content, labels, and handles at stable visual size while zoom changes container scale.

### Required subclass contract

- `isDirty(): boolean`
- `makeDirty(data?: unknown): void`
- `clearDirty(): void`
- `resolve(): void`

### Example: counter-scaled titlebar content

```typescript
protected resolve(): void {
  const inverse = this.getInverseScale();
  const titlebarHeight = this.value.style?.titlebarHeight ?? 30;

  // Keep width aligned to the parent window, but counter-scale Y content.
  this.titlebarBackground.width = this.value.rect.width;
  this.titlebarBackground.height = titlebarHeight * inverse.y;
  this.titlebarContent.scale.set(1, inverse.y);

  // Clip expanded children to the visible titlebar.
  this.titlebarMask.width = this.value.rect.width;
  this.titlebarMask.height = titlebarHeight * inverse.y;
}
```

### Public Methods

- `queueResolve()` - schedule resolve on next ticker frame
- `kickoff()` - schedule initial resolve
- `ticker` getter/setter - explicit ticker control/inheritance
- `cleanup()` - remove ticker observers/listeners

## Minimal subclass example

```typescript
import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Application } from 'pixi.js';

interface MyState {
  dirty: boolean;
  position: { x: number; y: number };
}

class MyStore extends TickerForest<MyState> {
  constructor(app: Application) {
    super(
      { value: { dirty: true, position: { x: 0, y: 0 } } },
      { app, dirtyOnScale: true }
    );
    this.kickoff();
  }

  setPosition(x: number, y: number): void {
    this.mutate(draft => {
      draft.position.x = x;
      draft.position.y = y;
    });
    this.makeDirty({ reason: 'position' });
    this.queueResolve();
  }

  protected isDirty(): boolean {
    return this.value.dirty;
  }

  protected makeDirty(): void {
    this.mutate(draft => {
      draft.dirty = true;
    });
  }

  protected clearDirty(): void {
    this.mutate(draft => {
      draft.dirty = false;
    });
  }

  protected resolve(): void {
    // Pixi mutations here
  }
}
```

## Dependencies

- `@wonderlandlabs/forestry4` - State management
- `pixi.js` - PixiJS rendering engine

## License

MIT
