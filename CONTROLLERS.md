# Forestry Controllers

This document describes the Forestry-based state controllers available in each package.

## Overview

Each package includes a Forestry4-based controller for managing state:

- **`panel (legacy)`** - `PanelStore` docs retained for historical context (package not in this repo)
- **`@wonderlandlabs-pixi-ux/grid`** - `GridStore` for managing grid configuration
- **`@wonderlandlabs-pixi-ux/drag`** - `DragStore` for managing drag state

All controllers use [@wonderlandlabs/forestry4](https://www.npmjs.com/package/@wonderlandlabs/forestry4) for reactive state management with Zod schemas.

## PanelStore

Manages a collection of panels with position, size, and styling.

### Schema

```typescript
interface PanelData {
  id: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    background: {
      fill: { r: number; g: number; b: number }; // 0..1 (PixiJS format)
      opacity: number; // 0..1
    };
    stroke: {
      isStroke: boolean;
      fill: { r: number; g: number; b: number }; // 0..1 (PixiJS format)
      width: number;
      opacity: number; // 0..1
    };
  };
  title?: string;
  visible: boolean;
}
```

### Usage

```typescript
// Legacy example (panel package is not part of this repository):
// import { PanelStore } from 'legacy-panel-package';

// Create store
const panelStore = new PanelStore();

// Add a panel
panelStore.addPanel({
  id: 'panel-1',
  order: 0,
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  style: {
    fill: '#ffffff',
    fillOpacity: 1,
    stroke: '#cccccc',
    strokeWidth: 1,
    strokeOpacity: 1,
  },
  title: 'My Panel',
  visible: true,
});

// Update panel position
panelStore.updatePanelPosition('panel-1', 150, 150);

// Update panel style
panelStore.updatePanelStyle('panel-1', {
  fill: '#ff0000',
  stroke: '#000000',
});

// Get panels sorted by order
const panels = panelStore.getPanelsArray();

// Subscribe to changes
panelStore.subscribe((value) => {
  console.log('Panels updated:', value.panels);
});

// Remove a panel
panelStore.removePanel('panel-1');
```

### Methods

- `addPanel(panel: PanelData)` - Add a new panel
- `removePanel(id: string)` - Remove a panel
- `updatePanel(id: string, updates: Partial<PanelData>)` - Update panel properties
- `updatePanelPosition(id: string, x: number, y: number)` - Update position
- `updatePanelSize(id: string, width: number, height: number)` - Update size
- `updatePanelStyle(id: string, style: Partial<PanelStyle>)` - Update style
- `updatePanelOrder(id: string, order: number)` - Update order
- `getPanel(id: string)` - Get a specific panel
- `getPanelsArray()` - Get all panels sorted by order
- `getVisiblePanels()` - Get visible panels sorted by order
- `clearPanels()` - Remove all panels
- `getPanelCount()` - Get total panel count

## GridStore

Manages grid configuration with rows, columns, and cell dimensions.

### Schema

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

### Usage

```typescript
import { GridStore } from '@wonderlandlabs-pixi-ux/grid';

// Create store with initial values
const gridStore = new GridStore({
  rows: 4,
  cols: 4,
  gap: 10,
});

// Update grid
gridStore.setRows(5);
gridStore.setCols(5);
gridStore.setGap(15);

// Set dimensions
gridStore.setDimensions(800, 600);
gridStore.setCellDimensions(100, 100);

// Get cell information
const totalCells = gridStore.getTotalCells(); // 25
const position = gridStore.getCellPosition(12); // { row: 2, col: 2 }
const index = gridStore.getCellIndex(2, 2); // 12
const coords = gridStore.getCellCoordinates(2, 2); // { x: 220, y: 220, width: 100, height: 100 }

// Subscribe to changes
gridStore.subscribe((value) => {
  console.log('Grid updated:', value);
});
```

### Methods

- `setRows(rows: number)` - Set number of rows
- `setCols(cols: number)` - Set number of columns
- `setGap(gap: number)` - Set gap between cells
- `setDimensions(width: number, height: number)` - Set grid dimensions
- `setCellDimensions(cellWidth: number, cellHeight: number)` - Set cell dimensions
- `updateGrid(updates: Partial<GridStoreValue>)` - Update multiple properties
- `getTotalCells()` - Get total number of cells
- `getCellPosition(index: number)` - Get row/col from index
- `getCellIndex(row: number, col: number)` - Get index from row/col
- `getCellCoordinates(row: number, col: number)` - Get pixel coordinates

## DragStore

Manages drag state with callbacks for drag events.

### Usage

```typescript
import { DragStore } from '@wonderlandlabs-pixi-ux/drag';

// Create store with callbacks
const dragStore = new DragStore({
  onDragStart: (itemId, x, y) => {
    console.log('Drag started:', itemId, x, y);
  },
  onDrag: (itemId, x, y, deltaX, deltaY) => {
    console.log('Dragging:', itemId, x, y, deltaX, deltaY);
  },
  onDragEnd: (itemId, x, y) => {
    console.log('Drag ended:', itemId, x, y);
  },
});

// Start dragging
dragStore.startDrag('item-1', 100, 100, 50, 50);

// Update drag position
dragStore.updateDrag(150, 150);

// End dragging
dragStore.endDrag();

// Check if dragging
const isDragging = dragStore.value.isDragging;
const isItemDragging = dragStore.isItemDragging('item-1');

// Get current position
const position = dragStore.getCurrentItemPosition();
```

### Methods

- `setCallbacks(callbacks: DragCallbacks)` - Set drag callbacks
- `startDrag(itemId, clientX, clientY, itemX?, itemY?)` - Start dragging
- `updateDrag(clientX, clientY)` - Update drag position
- `endDrag()` - End dragging (triggers onDragEnd)
- `cancelDrag()` - Cancel dragging (no callback)
- `getCurrentItemPosition()` - Get current item position
- `isItemDragging(itemId)` - Check if specific item is dragging
