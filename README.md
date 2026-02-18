# Pixi Utils - Yarn Berry Monorepo

A Yarn Berry (v4) monorepo with workspace packages for grid, drag, window, toolbar, and related Pixi utilities.

## Structure

```
wonderlandlabs-pixi-ux/
├── packages/
│   ├── grid/          # Grid component with configurable rows/cols
│   ├── window/        # Window system with drag/resize support
│   ├── caption/       # Caption bubbles and thought balloons
│   └── drag/          # Drag hook utilities
└── apps/
    └── demo/          # Vite React demo application
```

## Features

- **Yarn Berry (v4.0.2)** with `node-modules` linker for traditional node_modules everywhere
- **TypeScript** support across all packages
- **Workspace dependencies** using `workspace:^` protocol
- **Vite** for fast development and building

## Getting Started

### Prerequisites

- Node.js 18+ 
- Corepack enabled (comes with Node.js 16.10+)

### Installation

```bash
# Enable corepack if not already enabled
corepack enable

# Install dependencies
yarn install
```

### Development

```bash
# Start the demo app in development mode
yarn dev

# Build all packages
yarn build

# Clean all build artifacts
yarn clean
```

## Packages

### @wonderlandlabs-pixi-ux/grid

Grid component with configurable size and Forestry state controller.

**Component:**
```tsx
import { Grid } from '@wonderlandlabs-pixi-ux/grid';

<Grid rows={3} cols={3} gap={16}>
  {/* children */}
</Grid>
```

**Controller:**
```tsx
import { GridStore } from '@wonderlandlabs-pixi-ux/grid';

const gridStore = new GridStore({ rows: 4, cols: 4, gap: 10 });
gridStore.setRows(5);
```

### @wonderlandlabs-pixi-ux/drag

Drag hook and Forestry state controller for drag functionality.

**Hook:**
```tsx
import { useDrag } from '@wonderlandlabs-pixi-ux/drag';

const { isDragging, position, dragHandlers } = useDrag({
  onDragStart: () => console.log('Started'),
  onDragEnd: () => console.log('Ended')
});
```

**Controller:**
```tsx
import { DragStore } from '@wonderlandlabs-pixi-ux/drag';

const dragStore = new DragStore({
  onDragStart: (id, x, y) => console.log('Drag started'),
  onDrag: (id, x, y, dx, dy) => console.log('Dragging'),
  onDragEnd: (id, x, y) => console.log('Drag ended')
});
```

## Demo App

The demo app (`apps/demo`) showcases core package integrations:

- Adjust grid size (rows/columns) with input controls
- Responsive grid layout

## Forestry Controllers

All packages include Forestry4-based state controllers for reactive state management:

- **GridStore** - Manage grid configuration with rows, columns, and cell calculations
- **DragStore** - Manage drag state with callbacks

See [CONTROLLERS.md](./CONTROLLERS.md) for detailed documentation and examples.

## Scripts

- `yarn dev` - Start the demo app in development mode
- `yarn build` - Build all packages and apps
- `yarn clean` - Remove all dist folders
- `yarn workspace <workspace-name> <command>` - Run commands in specific workspaces

## Configuration

### Yarn Berry

The project uses Yarn Berry with the following configuration (`.yarnrc.yml`):

```yaml
nodeLinker: node-modules
enableGlobalCache: false
```

This ensures traditional `node_modules` folders are created in each workspace.

## License

MIT
