# @wonderlandlabs-pixi-ux/observe-drag

`observe-drag` enforces a single active drag owner per Pixi stage.

## Behavior

1. A `pointerdown` is accepted only when no active pointer is in progress.
2. Accepted drags forward matching `pointermove` events (`pointerId` must match the accepted down).
3. `pointerup`, `pointerupoutside`, or `pointercancel` ends the active drag and releases ownership.
4. Competing `pointerdown` events while busy call `onBlocked`.

## API

```ts
import observeDrag from '@wonderlandlabs-pixi-ux/observe-drag';

const observeDown = observeDrag({stage: app.stage});

const sub = observeDown<DragContext>(target, {
  onDown(event) {
    return {pointerId: event.pointerId, startX: event.global.x, startY: event.global.y};
  },
  onDrag(event, context) {
    // move updates for the active pointer
  },
  onUp(event, context) {
    // drag finished
  },
  onBlocked(event) {
    // another drag currently owns the stage
  },
  onError(error, phase, event) {
    // listener threw; handle safely
  },
});

// cleanup
sub.unsubscribe();
```

## Notes

- You do not need to re-subscribe after each `pointerup`; one subscription handles repeated drag cycles.
- `onDown` can return any context object; that same object is passed into `onDrag` and `onUp`.
- `onError` is reserved for thrown listener errors and internal callback failures. Busy contention uses `onBlocked`, not `onError`.
