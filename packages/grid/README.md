# @forestry-pixi/grid

PixiJS grid component for forestry-pixi with counter-scaling support.

## Installation

```bash
yarn add @forestry-pixi/grid
```

## Components

### PixiGrid

PixiJS Container that renders an infinite grid using TilingSprite. The grid automatically adjusts line thickness to maintain 1px visual thickness regardless of zoom level. Grid spacing scales naturally with zoom. Automatically doubles grid spacing when visual spacing < 16px to avoid overly dense gridlines.

```typescript
import { PixiGrid } from '@forestry-pixi/grid';
import { Application } from 'pixi.js';

const app = new Application();
await app.init();

// Create grid with main grid and optional major grid
const grid = new PixiGrid({
  grid: {
    x: 50,        // Horizontal spacing
    y: 50,        // Vertical spacing
    color: 0xcccccc,
    alpha: 0.5,
  },
  gridMajor: {    // Optional major grid
    x: 200,
    y: 200,
    color: 0x999999,
    alpha: 0.7,
  },
  artboard: {     // Optional artboard
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    color: 0x000000,
    alpha: 1,
  },
});

// Add to zoom/pan container (should be at bottom)
zoomPanContainer.addChildAt(grid, 0);

// Update grid scale when parent zooms
grid.updateScale(zoomPanContainer.scale.x);
```

**Options:**
- `grid: GridLineOptions` - Main grid configuration (required)
  - `x: number` - Horizontal spacing in pixels
  - `y: number` - Vertical spacing in pixels
  - `color: number` - Hex color of grid lines
  - `alpha: number` - Opacity (0-1)
- `gridMajor?: GridLineOptions` - Optional major grid configuration
- `artboard?: ArtboardOptions` - Optional artboard configuration
  - `x: number` - X position
  - `y: number` - Y position
  - `width: number` - Width in pixels
  - `height: number` - Height in pixels
  - `color: number` - Hex color of border
  - `alpha: number` - Opacity (0-1)

**Features:**
- Two independent textures for grid and gridMajor (lazy-loaded)
- Grid sprites use lazy getters (created on first access)
- Artboard is a Graphics rect with stroke only (no fill)
- Line thickness adjusts to maintain 1px visual thickness at any zoom level
- Grid spacing scales naturally with zoom (zooming in shows more detail, zooming out shows less)
- Automatically doubles spacing when visual spacing < 16px to avoid overly dense gridlines

## Managers

### GridManager

Forestry-based grid manager that automatically listens to zoom/pan events and redraws the grid efficiently.

```typescript
import { GridManager } from '@forestry-pixi/grid';
import { Application } from 'pixi.js';
import { createRootContainer, createZoomPan, makeStageZoomable, makeStageDraggable } from '@forestry-pixi/rootContainer-container';

const app = new Application();
await app.init();

// Set up zoom/pan
const { rootContainer } = createRootContainer(app);
const { zoomPan } = createZoomPan(app, rootContainer);
makeStageZoomable(app, zoomPan);
makeStageDraggable(app, zoomPan);

// Create grid manager - it will automatically handle zoom/pan events
const gridManager = new GridManager({
  gridSpec: {
    grid: { x: 50, y: 50, color: 0xcccccc, alpha: 0.5 },
    gridMajor: { x: 200, y: 200, color: 0x999999, alpha: 0.7 },
    artboard: { x: 0, y: 0, width: 800, height: 600, color: 0x000000, alpha: 1 },
  },
  application: app,
  zoomPanContainer: zoomPan,
});

// Update grid spec dynamically
gridManager.updateGridSpec({
  grid: { x: 100, y: 100 },
});

// Cleanup when done
gridManager.cleanup();
```

**Features:**
- Automatically listens to `stage-zoom` and `stage-drag` events
- Uses dirty/ticker pattern for efficient rendering:
  1. Events mark the grid as dirty
  2. Ticker checks dirty flag each frame
  3. If dirty, redraws and clears flag
- Lazy getters for textures and sprites (created on first access)
- Resizes tiling sprites to cover screen based on zoom/pan
- Manages grid lifecycle (creation, updates, cleanup)

## Controllers

### GridStore

Forestry4-based state controller for managing grid configuration.

```typescript
import { GridStore } from '@forestry-pixi/grid';

const gridStore = new GridStore({
  grid: {
    x: 50,
    y: 50,
    color: 0xcccccc,
    alpha: 0.5,
  },
  gridMajor: {
    x: 200,
    y: 200,
    color: 0x999999,
    alpha: 0.7,
  },
  artboard: {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    color: 0x000000,
    alpha: 1,
  },
});

// Update grid
gridStore.updateGrid({ x: 100, y: 100 });

// Update major grid
gridStore.updateGridMajor({ x: 400, y: 400, alpha: 0.8 });

// Remove major grid
gridStore.updateGridMajor(null);

// Update artboard
gridStore.updateArtboard({ width: 1000, height: 800 });

// Remove artboard
gridStore.updateArtboard(null);

// Subscribe to changes
gridStore.subscribe((value) => {
  console.log('Grid config:', value);
  // Update PixiGrid instance based on new config
});
```

### API

**Methods:**
- `setRows(rows: number)` - Set number of rows
- `setCols(cols: number)` - Set number of columns
- `setGap(gap: number)` - Set gap between cells
- `setDimensions(width, height)` - Set grid dimensions
- `setCellDimensions(cellWidth, cellHeight)` - Set cell dimensions
- `updateGrid(updates)` - Update multiple properties
- `getTotalCells()` - Get total number of cells
- `getCellPosition(index)` - Get row/col from index
- `getCellIndex(row, col)` - Get index from row/col
- `getCellCoordinates(row, col)` - Get pixel coordinates

**Types:**
```typescript
interface GridStoreValue {
  rows: number;
  cols: number;
  gap: number;
  width?: number;
  height?: number;
  cellWidth?: number;
  cellHeight?: number;
}
```

## License

MIT

