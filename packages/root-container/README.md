# @forestry-pixi/rootContainer-container

Root container system with centered origin and zoom/pan support for PixiJS applications.

## Features

- **createRootContainer**: Factory function that centers the origin at screen width/2, height/2 and automatically handles resize events
- **createZoomPan**: Factory function that handles user interactions for panning (drag) and zooming (mousewheel)
- **createZoomPanDraggable**: Factory function that adds stage-level drag support with event emission
- Zoom around mouse position
- Configurable zoom limits and speed
- Can enable/disable pan and zoom independently
- Clean functional API - no class extension
- Ticker-based updates for clean PixiJS rendering
- Event emission for drag state changes

## Usage

```typescript
import { Application } from 'pixi.js';
import {
  createRootContainer,
  createZoomPan,
  createZoomPanDraggable,
  type StageZoomEvent
} from '@forestry-pixi/rootContainer-container';

const app = new Application();
await app.init({ resizeTo: window });

// Create rootContainer container (centers origin)
const { rootContainer, destroy: destroyRoot } = createRootContainer(app);

// Create zoom/pan container
const { zoomPan, getZoom, setZoom, reset, destroy: destroyZoomPan } = createZoomPan(
  app, // Application instance
  rootContainer, // optional parent container
  {
    minZoom: 0.5,
    maxZoom: 5,
    zoomSpeed: 0.1,
    enablePan: true,
    enableZoom: true,
  }
);

// Add stage-level drag support with event emission
const { destroy: destroyDraggable } = createZoomPanDraggable(app, zoomPan);

// Listen to stage-zoom events
app.stage.on('stage-zoom', (event: StageZoomEvent) => {
  console.log(`${event.type}: zoom=${event.zoom}, pos=(${event.position.x}, ${event.position.y})`);

  // Example: Change display during drag
  if (event.type === 'zoom-start') {
    // User started dragging
  } else if (event.type === 'zoom-move') {
    // User is dragging
  } else if (event.type === 'zoom-end') {
    // User stopped dragging
  }
});

// Add your content to the zoomPan container
zoomPan.addChild(yourContent);

// Use utility functions
console.log(`Current zoom: ${getZoom()}`);
setZoom(2.0);
reset(); // Reset to default zoom and pan

// Cleanup when done
destroyDraggable();
destroyZoomPan();
destroyRoot();
```

## API

### createRootContainer

```typescript
function createRootContainer(app: Application): RootContainerResult
```

Creates a container that centers the origin at screen center and listens to resize events.

**Returns:**
- `stage: Container` - The app.stage reference
- `rootContainer: Container` - The rootContainer container (centered)
- `destroy: () => void` - Cleanup function

### createZoomPan

```typescript
function createZoomPan(
  app: Application,
  rootContainer?: Container,
  options?: ZoomPanOptions
): ZoomPanResult
```

Creates a zoom/pan container with user interaction handlers. All container updates happen in ticker handlers for clean PixiJS rendering.

**Parameters:**
- `app: Application` - The PixiJS Application instance
- `rootContainer?: Container` - Optional parent container (from createRootContainer)
- `options?: ZoomPanOptions` - Configuration options

**Options:**
- `minZoom?: number` - Minimum zoom level (default: 0.1)
- `maxZoom?: number` - Maximum zoom level (default: 10)
- `zoomSpeed?: number` - Zoom speed multiplier (default: 0.1)
- `enablePan?: boolean` - Enable panning (default: true)
- `enableZoom?: boolean` - Enable zooming (default: true)

**Returns:**
- `stage: Container` - The stage reference
- `zoomPan: Container` - The zoom/pan container
- `reset: () => void` - Reset zoom and pan to default
- `setZoom: (zoom: number) => void` - Set zoom level
- `getZoom: () => number` - Get current zoom level
- `destroy: () => void` - Cleanup function

### createZoomPanDraggable

```typescript
function createZoomPanDraggable(
  app: Application,
  zoomPan: Container
): ZoomPanDraggableResult
```

Makes a zoom/pan container draggable via stage pointer events. Emits `'stage-zoom'` events to the application's event stream. All container updates happen in ticker handlers for clean PixiJS rendering.

**Parameters:**
- `app: Application` - The PixiJS Application instance
- `zoomPan: Container` - The zoom/pan container to make draggable

**Returns:**
- `destroy: () => void` - Cleanup function

**Events:**

The function emits `'stage-zoom'` events on `app.stage` with the following structure:

```typescript
interface StageZoomEvent {
  type: 'zoom-start' | 'zoom-move' | 'zoom-end';
  zoom: number;
  position: { x: number; y: number };
}
```

- `zoom-start` - Emitted when user starts dragging
- `zoom-move` - Emitted during drag movement
- `zoom-end` - Emitted when user stops dragging

## Architecture

```
app.stage
  └── rootContainer (origin at screen center, handles resize)
      └── zoomPan (handles user pan/zoom)
          └── Your content here
```

