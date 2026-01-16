import type { Application, Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import { Point } from 'pixi.js';

export interface StageDraggableResult {
  destroy: () => void;
}

/**
 * Stage drag event data
 */
export interface StageDragEvent {
  type: 'drag-start' | 'drag-move' | 'drag-end';
  position: { x: number; y: number };
}

/**
 * Makes a container draggable via stage-level pointer events.
 * Listens on app.stage so dragging works anywhere on the canvas.
 * Emits 'stage-drag' events to the application's event stream.
 * All container updates happen in ticker handlers for clean PixiJS updates.
 *
 * @param app - The PixiJS Application instance
 * @param container - The container to make draggable
 * @returns Object with destroy function
 */
export function makeStageDraggable(
  app: Application,
  container: PixiContainer
): StageDraggableResult {
  let isDragging = false;
  const dragStart = new Point();
  const dragOffset = new Point();
  
  // Pending updates to apply in ticker
  let pendingPosition: { x: number; y: number } | null = null;
  
  const onDragMove = (event: FederatedPointerEvent) => {
    const position = event.global;
    const dx = position.x - dragStart.x;
    const dy = position.y - dragStart.y;

    // Queue position update for next ticker
    pendingPosition = {
      x: dragOffset.x + dx,
      y: dragOffset.y + dy,
    };

    // Schedule ticker update
    app.ticker.addOnce(() => {
      if (pendingPosition) {
        container.position.set(pendingPosition.x, pendingPosition.y);

        // Emit drag-move event
        app.stage.emit('stage-drag', {
          type: 'drag-move',
          position: { x: container.position.x, y: container.position.y },
        } as StageDragEvent);

        pendingPosition = null;
      }
    });
  };

  const onDragEnd = () => {
    isDragging = false;
    pendingPosition = null;

    // Remove move/up listeners
    app.stage.off('pointermove', onDragMove);
    app.stage.off('pointerup', onDragEnd);
    app.stage.off('pointerupoutside', onDragEnd);

    // Emit drag-end event
    app.stage.emit('stage-drag', {
      type: 'drag-end',
      position: { x: container.position.x, y: container.position.y },
    } as StageDragEvent);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    // Prevent multiple simultaneous drags
    if (isDragging) return;

    isDragging = true;

    const position = event.global;
    dragStart.set(position.x, position.y);
    dragOffset.set(container.position.x, container.position.y);

    // Attach move/up listeners only when dragging starts
    app.stage.on('pointermove', onDragMove);
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    // Emit drag-start event
    app.stage.emit('stage-drag', {
      type: 'drag-start',
      position: { x: container.position.x, y: container.position.y },
    } as StageDragEvent);
  };

  // Make stage interactive and attach pointerdown listener
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', onDragStart);
  
  // Cleanup function
  const destroy = () => {
    app.stage.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    app.stage.off('pointermove', onDragMove);
    app.stage.off('pointerup', onDragEnd);
    app.stage.off('pointerupoutside', onDragEnd);
    pendingPosition = null;
    isDragging = false;
  };
  
  return {
    destroy,
  };
}

