---
title: observe-drag
description: Package README for @wonderlandlabs-pixi-ux/observe-drag
---

# @wonderlandlabs-pixi-ux observe-drag

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/observe-drag](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux/tree/main/packages/observe-drag)

`observe-drag` enforces a single active drag owner per Pixi stage.

## Behavior

1. A `pointerdown` is accepted only when no active pointer is in progress.
2. Accepted drags forward matching `pointermove` events (`pointerId` must match the accepted down).
3. `pointerup`, `pointerupoutside`, or `pointercancel` ends the active drag and releases ownership.
4. Competing `pointerdown` events while busy call `onBlocked`.

## Usage

`dragTargetDecorator` wraps your listeners and handles Pixi container movement with default assumptions:

1. target is a Pixi `Container`-like object (`position`, optional `parent.toLocal`)
2. pointer coordinates come from Pixi events (`event.global`)
3. movement is calculated in parent-local space when possible (`parent.toLocal(globalPoint)`)

### 1. Simple Dragging

```ts
import observeDrag, {dragTargetDecorator} from '@wonderlandlabs-pixi-ux/observe-drag';

const observeDown = observeDrag({stage: app.stage});
const sub = observeDown(target, dragTargetDecorator(), {dragTarget: myContainer});
```

### 2. Custom Listeners

```ts
const sub = observeDown(
  target,
  dragTargetDecorator({
    listeners: {
      onStart(event, dragTarget) {
        // optional domain setup
      },
      onMove(event, context, dragTarget) {
        // extra side effects after default movement
      },
      onUp(event, context, dragTarget) {
        // drag finished
      },
      onBlocked(event, dragTarget) {
        // another drag currently owns the stage
      },
      onError(error, phase, event, dragTarget) {
        // listener threw; handle safely
      },
    },
  }),
  {
    dragTarget: myContainer,
    getDragTarget(downEvent) {
      // optional dynamic target resolution
      return downEvent.pointerId === 2 ? altContainer : myContainer;
    },
    debug: new Map([
      ['down.accepted', console.log],
      ['pointer.busy', console.warn],
    ]),
  },
);
```

### 3. Snapping / Transform

```ts
const sub = observeDown(
  target,
  dragTargetDecorator({
    transformPoint(point) {
      return {
        x: Math.round(point.x / 10) * 10,
        y: Math.round(point.y / 10) * 10,
      };
    },
  }),
  {dragTarget: myContainer},
);
```

### Optional Zero-Arg Decorator

```ts
const sub = observeDown(target, dragTargetDecorator(), {dragTarget: boxContainer});

sub.unsubscribe();
```

## Notes

- You do not need to re-subscribe after each `pointerup`; one subscription handles repeated drag cycles.
- Returning context from `onStart` is optional.
- Receiving context in `onMove` and `onUp` is optional; if `onStart` returns nothing, context is `undefined`.
- If returned, `onStart` context can be any object and is passed into `onMove` and `onUp`.
- Core observe-drag does not move targets by itself; use `dragTargetDecorator()` for default target motion, or move the target in your own listeners.
- Subscription options support `dragTarget` (static) and `getDragTarget(downEvent, context)` (dynamic), and that resolved target is passed to callbacks.
- `dragTargetDecorator()` provides default Pixi container dragging using parent-local coordinates, then delegates to your wrapped listeners.
- `dragTargetDecorator()` works with no parameters.
- `debug` is part of the options object (`{ debug: Map<...> }`), not a separate third-arg overload.
- `onError` is reserved for thrown listener errors and internal callback failures. Busy contention uses `onBlocked`, not `onError`.
