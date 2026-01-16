import { Container } from 'pixi.js';
import type { Application, Container as PixiContainer } from 'pixi.js';

export interface ZoomPanResult {
  zoomPan: Container;
  destroy: () => void;
}

/**
 * Creates a simple zoom/pan container with no event handling.
 * Use makeStageDraggable() and makeStageZoomable() decorators to add interactions.
 *
 * @param app - The PixiJS Application instance
 * @param root - Optional parent container (if using RootContainer)
 * @returns Object containing zoomPan container and destroy function
 */
export function createZoomPan(
  app: Application,
  root?: PixiContainer
): ZoomPanResult {
  const zoomPan = new Container();
  zoomPan.label = 'ZoomPanContainer';

  // Add to parent (root or stage)
  const parent = root ?? app.stage;
  parent.addChild(zoomPan);

  // Cleanup function
  const destroy = () => {
    // Remove from parent
    if (zoomPan.parent) {
      zoomPan.parent.removeChild(zoomPan);
    }

    // Destroy container
    zoomPan.destroy();
  };

  return {
    zoomPan,
    destroy,
  };
}

