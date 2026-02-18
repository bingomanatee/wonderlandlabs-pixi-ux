# @wonderlandlabs-pixi-ux/drag

Drag state controller for PixiJS in wonderlandlabs-pixi-ux.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/drag
```

## Usage

### DragStore

Forestry4-based state controller for managing drag state with PixiJS.

```typescript
import { DragStore } from '@wonderlandlabs-pixi-ux/drag';
import { Application } from 'pixi.js';

const app = new Application();

const dragStore = new DragStore({
  app,
  callbacks: {
    onDragStart: (itemId, x, y) => {
      console.log('Drag started:', itemId, x, y);
    },
    onDrag: (state) => {
      console.log('Dragging:', state.draggedItemId, state.deltaX, state.deltaY);
      // Update your container position
      const pos = dragStore.getCurrentItemPosition();
      if (pos) {
        container.position.set(pos.x, pos.y);
      }
    },
    onDragEnd: () => {
      console.log('Drag ended');
    },
  },
});

// Start dragging
dragStore.startDrag('item-1', 100, 100, 50, 50);

// Update drag position
dragStore.updateDrag(150, 150);

// End dragging
dragStore.endDrag();

// Check state
const isDragging = dragStore.value.isDragging;
const isItemDragging = dragStore.isItemDragging('item-1');
const position = dragStore.getCurrentItemPosition();
```

### API

**Methods:**
- `setCallbacks(callbacks)` - Set drag callbacks
- `startDrag(itemId, clientX, clientY, itemX?, itemY?)` - Start dragging
- `updateDrag(clientX, clientY)` - Update drag position
- `endDrag()` - End dragging (triggers onDragEnd)
- `cancelDrag()` - Cancel dragging (no callback)
- `getCurrentItemPosition()` - Get current item position
- `isItemDragging(itemId)` - Check if specific item is dragging

**Types:**
```typescript
interface DragStoreValue {
  isDragging: boolean;
  draggedItemId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  initialItemX: number;
  initialItemY: number;
  isDragEnding: boolean;
  dirty: boolean;
}

interface DragCallbacks {
  onDragStart?: (itemId: string, x: number, y: number) => void;
  onDrag?: (state: DragStoreValue) => void;
  onDragEnd?: () => void;
}

interface DragStoreConfig {
  app: Application;
  callbacks?: DragCallbacks;
}
```

## License

MIT

