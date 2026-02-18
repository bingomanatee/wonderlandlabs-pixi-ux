# @wonderlandlabs-pixi-ux/ticker-forest

Abstract base class for Forestry state management that synchronizes state changes with PixiJS rendering via the ticker pattern.

## Overview

This class solves the problem of PixiJS artifacts that occur when PixiJS operations are performed outside of ticker handlers. While Forestry state changes are synchronous, PixiJS-centric effects must be encapsulated inside ticker handlers to work correctly.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/ticker-forest
```

## Pattern

1. Subclass manages its own state (including dirty flags)
2. Subclass calls `this.queueResolve()` when PixiJS updates are needed
3. Base class schedules a ticker callback for the next frame (manages resolveQueued internally)
4. Ticker calls `isDirty()`, then `resolve()`, then `clearDirty()`

## Usage

Subclasses must implement:
- `isDirty()` - Return true if PixiJS operations are needed
- `clearDirty()` - Clear the dirty flag after resolve
- `resolve()` - Perform PixiJS operations

### Example

```typescript
import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Application } from 'pixi.js';

interface MyState {
  position: { x: number; y: number };
  dirty: boolean;
}

class MyStore extends TickerForest<MyState> {
  constructor(app: Application) {
    super({ value: { position: { x: 0, y: 0 }, dirty: false } }, app);
  }

  updatePosition(x: number, y: number) {
    this.mutate(draft => {
      draft.position.x = x;
      draft.position.y = y;
      draft.dirty = true;
    });
    this.queueResolve();
  }

  protected isDirty(): boolean {
    return this.value.dirty;
  }

  protected clearDirty(): void {
    this.mutate(draft => { draft.dirty = false; });
  }

  protected resolve(): void {
    // Perform PixiJS operations here
    const { position } = this.value;
    this.sprite.position.set(position.x, position.y);
  }
}
```

## API

### Constructor

```typescript
constructor(args: StoreParams<T>, application: Application)
```

- `args` - The Forestry configuration object (includes `{value: ..., res: ...}` and other Forest options)
- `application` - The PixiJS Application instance (ticker accessed via `app.ticker`)

### Protected Methods

#### `queueResolve(): void`

Queue a resolve operation for the next ticker frame. Uses `ticker.addOnce()` to ensure the resolve happens once on the next frame. Subclasses should call this after calling `markDirty()`.

#### `kickoff(): void`

Trigger an initial resolve on the next ticker frame. Subclasses should call this in their constructor after initialization to ensure initial PixiJS operations are performed.

### Abstract Methods (Must Implement)

#### `isDirty(): boolean`

Check if the state is dirty and needs PixiJS updates. Subclasses implement this to return their dirty flag.

#### `clearDirty(): void`

Clear the dirty flag after resolve. Subclasses implement this.

#### `resolve(): void`

Perform PixiJS operations. This method is called inside a ticker handler, ensuring that PixiJS operations are synchronized with the rendering loop.

### Public Methods

#### `cleanup(): void`

Cleanup method to remove ticker listeners. Subclasses should call `super.cleanup()` in their cleanup/destroy methods.

## Dependencies

- `@wonderlandlabs/forestry4` - State management
- `pixi.js` - PixiJS rendering engine

## License

MIT

