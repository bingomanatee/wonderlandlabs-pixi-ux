import { Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';

/**
 * Callbacks for drag events
 */
export interface TrackDragCallbacks {
  /** Called when drag starts */
  onDragStart?: (event: FederatedPointerEvent) => void;
  /** Called during drag with delta values */
  onDragMove?: (deltaX: number, deltaY: number, event: FederatedPointerEvent) => void;
  /** Called when drag ends */
  onDragEnd?: (event: FederatedPointerEvent) => void;
}

/**
 * Result from trackDrag
 */
export interface TrackDragResult {
  /** Remove all event listeners and clean up */
  destroy: () => void;
}

/**
 * Track drag events on a PixiJS container.
 *
 * Pattern:
 * - pointerdown on target element starts drag
 * - pointermove/pointerup listeners attached to stage (or target if no stage) during drag
 * - Listeners removed when drag ends
 *
 * @param target - The PixiJS container to track drag on
 * @param callbacks - Drag event callbacks
 * @param stage - Optional stage to attach move/up listeners to (for global tracking)
 * @returns Object with destroy function
 */
export function trackDrag(
  target: PixiContainer,
  callbacks: TrackDragCallbacks = {},
  stage?: PixiContainer
): TrackDragResult {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Use stage for move/up listeners if provided, otherwise use target
  const moveUpTarget = stage || target;

  const onDragMove = (event: FederatedPointerEvent) => {
    if (!isDragging) return;

    const deltaX = event.global.x - dragStartX;
    const deltaY = event.global.y - dragStartY;

    callbacks.onDragMove?.(deltaX, deltaY, event);
  };

  const onDragEnd = (event: FederatedPointerEvent) => {
    if (!isDragging) return;

    isDragging = false;

    // Remove move/up listeners from stage or target
    moveUpTarget.off('pointermove', onDragMove);
    moveUpTarget.off('pointerup', onDragEnd);
    moveUpTarget.off('pointerupoutside', onDragEnd);

    callbacks.onDragEnd?.(event);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    // Prevent multiple simultaneous drags
    if (isDragging) return;

    isDragging = true;
    dragStartX = event.global.x;
    dragStartY = event.global.y;

    // Attach move/up listeners to stage (or target) when dragging starts
    moveUpTarget.on('pointermove', onDragMove);
    moveUpTarget.on('pointerup', onDragEnd);
    moveUpTarget.on('pointerupoutside', onDragEnd);

    callbacks.onDragStart?.(event);
  };

  // Make target interactive and attach pointerdown listener
  target.eventMode = 'static';
  target.on('pointerdown', onDragStart);

  // Cleanup function
  const destroy = () => {
    target.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    moveUpTarget.off('pointermove', onDragMove);
    moveUpTarget.off('pointerup', onDragEnd);
    moveUpTarget.off('pointerupoutside', onDragEnd);
    isDragging = false;
  };

  return {
    destroy,
  };
}

