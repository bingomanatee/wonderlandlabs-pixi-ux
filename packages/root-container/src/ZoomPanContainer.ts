import { Container, Point } from 'pixi.js';
import type { Application, Container as PixiContainer, FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';

export interface ZoomPanOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  enablePan?: boolean;
  enableZoom?: boolean;
}

export interface ZoomPanResult {
  stage: PixiContainer;
  zoomPan: Container;
  reset: () => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  destroy: () => void;
}

/**
 * Creates a zoom/pan container that handles user-triggered pan (drag) and zoom (mousewheel) interactions.
 * All container updates happen in ticker handlers for clean PixiJS updates.
 *
 * @param app - The PixiJS Application instance
 * @param root - Optional parent container (if using RootContainer)
 * @param options - Configuration options
 * @returns Object containing stage, zoomPan container, and utility functions
 */
export function createZoomPan(
  app: Application,
  root?: PixiContainer,
  options: ZoomPanOptions = {}
): ZoomPanResult {
  const zoomPan = new Container();
  zoomPan.label = 'ZoomPanContainer';

  const minZoom = options.minZoom ?? 0.1;
  const maxZoom = options.maxZoom ?? 10;
  const zoomSpeed = options.zoomSpeed ?? 0.1;
  const enablePan = options.enablePan ?? true;
  const enableZoom = options.enableZoom ?? true;

  // State for dragging
  let isDragging = false;
  const dragStart = new Point();
  const dragOffset = new Point();

  // Pending updates to apply in ticker
  let pendingPosition: { x: number; y: number } | null = null;

  // Make interactive
  zoomPan.eventMode = 'static';
  zoomPan.cursor = 'grab';

  // Pan handlers
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
        pendingPosition = null;
      }
    });
  };

  const onDragEnd = () => {
    isDragging = false;
    zoomPan.cursor = 'grab';
    pendingPosition = null;

    // Remove move/up listeners
    zoomPan.off('pointermove', onDragMove);
    zoomPan.off('pointerup', onDragEnd);
    zoomPan.off('pointerupoutside', onDragEnd);
  };

  const onDragStart = (event: FederatedPointerEvent) => {
    isDragging = true;
    zoomPan.cursor = 'grabbing';

    const position = event.global;
    dragStart.set(position.x, position.y);
    dragOffset.set(zoomPan.position.x, zoomPan.position.y);

    // Attach move/up listeners only when dragging starts
    zoomPan.on('pointermove', onDragMove);
    zoomPan.on('pointerup', onDragEnd);
    zoomPan.on('pointerupoutside', onDragEnd);
  };

  // Zoom handler
  const onWheel = (event: FederatedWheelEvent) => {
    event.preventDefault();

    // Get mouse position in world coordinates before zoom
    const mousePosition = new Point(event.global.x, event.global.y);
    const worldPosBefore = zoomPan.toLocal(mousePosition);

    // Calculate new zoom level
    const zoomDelta = event.deltaY > 0 ? (1 - zoomSpeed) : (1 + zoomSpeed);
    const newScale = zoomPan.scale.x * zoomDelta;

    // Clamp zoom level
    const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));

    // Schedule ticker update for zoom
    app.ticker.addOnce(() => {
      zoomPan.scale.set(clampedScale, clampedScale);

      // Get mouse position in world coordinates after zoom
      const worldPosAfter = zoomPan.toLocal(mousePosition);

      // Adjust position to keep same world point under mouse
      zoomPan.position.x += (worldPosAfter.x - worldPosBefore.x) * zoomPan.scale.x;
      zoomPan.position.y += (worldPosAfter.y - worldPosBefore.y) * zoomPan.scale.y;
    });
  };

  // Set up event listeners
  if (enablePan) {
    // Only attach pointerdown initially - move/up are attached on drag start
    zoomPan.on('pointerdown', onDragStart);
  }

  if (enableZoom) {
    zoomPan.on('wheel', onWheel);
  }

  // Add to parent (root or stage)
  const parent = root ?? app.stage;
  parent.addChild(zoomPan);

  // Utility functions
  const reset = () => {
    zoomPan.position.set(0, 0);
    zoomPan.scale.set(1, 1);
  };

  const setZoom = (zoom: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    zoomPan.scale.set(clampedZoom, clampedZoom);
  };

  const getZoom = (): number => {
    return zoomPan.scale.x;
  };

  // Cleanup function
  const destroy = () => {
    zoomPan.off('pointerdown', onDragStart);
    // Also remove move/up listeners in case they're still attached
    zoomPan.off('pointermove', onDragMove);
    zoomPan.off('pointerup', onDragEnd);
    zoomPan.off('pointerupoutside', onDragEnd);
    zoomPan.off('wheel', onWheel);
    pendingPosition = null;
    isDragging = false;
    zoomPan.destroy();
  };

  return {
    stage: app.stage,
    zoomPan,
    reset,
    setZoom,
    getZoom,
    destroy,
  };
}

