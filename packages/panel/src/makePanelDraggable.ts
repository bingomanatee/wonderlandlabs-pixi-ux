import type { Application, Container as PixiContainer, FederatedPointerEvent } from 'pixi.js';
import { Point } from 'pixi.js';
import type { PanelStore } from './PanelStore';

export interface PanelDraggableResult {
  destroy: () => void;
}

/**
 * Panel drag event data
 */
export interface PanelDragEvent {
  type: 'drag-start' | 'drag-move' | 'drag-end';
  panelId: string;
  position: { x: number; y: number };
}

/**
 * Makes a panel draggable via pointer events on its container.
 * Emits 'panel-drag' events to the application's event stream.
 * All position updates happen in ticker handlers for clean PixiJS updates.
 * Updates the PanelStore position on drag.
 * 
 * @param app - The PixiJS Application instance
 * @param panelStore - The PanelStore instance
 * @param panelId - The ID of the panel to make draggable
 * @param panelContainer - The PixiJS container representing the panel
 * @returns Object with destroy function
 */
export function makePanelDraggable(
  app: Application,
  panelStore: PanelStore,
  panelId: string,
  panelContainer: PixiContainer
): PanelDraggableResult {
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
        panelContainer.position.set(pendingPosition.x, pendingPosition.y);
        
        // Update panel store
        panelStore.updatePanelPosition(panelId, pendingPosition.x, pendingPosition.y);
        
        // Emit drag-move event
        app.stage.emit('panel-drag', {
          type: 'drag-move',
          panelId,
          position: { x: pendingPosition.x, y: pendingPosition.y },
        } as PanelDragEvent);
        
        pendingPosition = null;
      }
    });
  };

  const onDragEnd = () => {
    isDragging = false;
    panelContainer.cursor = 'grab';
    pendingPosition = null;
    
    // Remove move/up listeners
    panelContainer.off('pointermove', onDragMove);
    panelContainer.off('pointerup', onDragEnd);
    panelContainer.off('pointerupoutside', onDragEnd);
    
    // Emit drag-end event
    app.stage.emit('panel-drag', {
      type: 'drag-end',
      panelId,
      position: { x: panelContainer.position.x, y: panelContainer.position.y },
    } as PanelDragEvent);
  };
  
  const onDragStart = (event: FederatedPointerEvent) => {
    // Prevent multiple simultaneous drags
    if (isDragging) return;
    
    isDragging = true;
    panelContainer.cursor = 'grabbing';
    
    const position = event.global;
    dragStart.set(position.x, position.y);
    dragOffset.set(panelContainer.position.x, panelContainer.position.y);
    
    // Attach move/up listeners only when dragging starts
    panelContainer.on('pointermove', onDragMove);
    panelContainer.on('pointerup', onDragEnd);
    panelContainer.on('pointerupoutside', onDragEnd);
    
    // Emit drag-start event
    app.stage.emit('panel-drag', {
      type: 'drag-start',
      panelId,
      position: { x: panelContainer.position.x, y: panelContainer.position.y },
    } as PanelDragEvent);
  };
  
  // Make panel container interactive and attach pointerdown listener
  panelContainer.eventMode = 'static';
  panelContainer.cursor = 'grab';
  panelContainer.on('pointerdown', onDragStart);
  
  // Cleanup function
  const destroy = () => {
    panelContainer.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    panelContainer.off('pointermove', onDragMove);
    panelContainer.off('pointerup', onDragEnd);
    panelContainer.off('pointerupoutside', onDragEnd);
    pendingPosition = null;
    isDragging = false;
  };
  
  return {
    destroy,
  };
}

