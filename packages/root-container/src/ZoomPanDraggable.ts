import type { Application, Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import { Point } from 'pixi.js';

export interface ZoomPanDraggableResult {
  destroy: () => void;
}

/**
 * Stage zoom event data
 */
export interface StageZoomEvent {
  type: 'zoom-start' | 'zoom-move' | 'zoom-end';
  zoom: number;
  position: { x: number; y: number };
}

/**
 * Makes a zoom/pan container draggable via stage pointer events.
 * Emits 'stage-zoom' events to the application's event stream.
 * All container updates happen in ticker handlers for clean PixiJS updates.
 * 
 * @param app - The PixiJS Application instance
 * @param zoomPan - The zoom/pan container to make draggable
 * @returns Object with destroy function
 */
export function createZoomPanDraggable(
  app: Application,
  zoomPan: PixiContainer
): ZoomPanDraggableResult {
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
        zoomPan.position.set(pendingPosition.x, pendingPosition.y);

        // Emit zoom-move event
        app.stage.emit('stage-zoom', {
          type: 'zoom-move',
          zoom: zoomPan.scale.x,
          position: { x: zoomPan.position.x, y: zoomPan.position.y },
        } as StageZoomEvent);

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

    // Emit zoom-end event
    app.stage.emit('stage-zoom', {
      type: 'zoom-end',
      zoom: zoomPan.scale.x,
      position: { x: zoomPan.position.x, y: zoomPan.position.y },
    } as StageZoomEvent);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    isDragging = true;

    const position = event.global;
    dragStart.set(position.x, position.y);
    dragOffset.set(zoomPan.position.x, zoomPan.position.y);

    // Attach move/up listeners only when dragging starts
    app.stage.on('pointermove', onDragMove);
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    // Emit zoom-start event
    app.stage.emit('stage-zoom', {
      type: 'zoom-start',
      zoom: zoomPan.scale.x,
      position: { x: zoomPan.position.x, y: zoomPan.position.y },
    } as StageZoomEvent);
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

