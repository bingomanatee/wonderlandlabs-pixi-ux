import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics, Text } from 'pixi.js';
import { createRootContainer } from './RootContainer';
import { createZoomPan } from './ZoomPanContainer';
import { createZoomPanDraggable, type StageZoomEvent } from './ZoomPanDraggable';

interface ZoomPanArgs {}

const meta: Meta<ZoomPanArgs> = {
  title: 'Root Container/Zoom Pan',
  tags: ['autodocs'],
  render: (args) => {
    const wrapper = document.createElement('div');

    // Add instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Drag to pan, scroll to zoom. The origin is centered at screen center. Try resizing the window!';
    instructions.style.marginBottom = '10px';
    instructions.style.fontFamily = 'sans-serif';
    instructions.style.fontSize = '14px';
    wrapper.appendChild(instructions);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    wrapper.appendChild(container);

    // Create PixiJS application
    const app = new Application();

    // Initialize the app
    app.init({
      resizeTo: container,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(() => {
      container.appendChild(app.canvas);

      // Create root container (centers origin)
      const { root } = createRootContainer(app);

      // Create zoom/pan container
      const { zoomPan, getZoom } = createZoomPan(app, root, {
        minZoom: 0.5,
        maxZoom: 5,
        zoomSpeed: 0.1,
      });

      // Make it draggable via stage and listen to events
      createZoomPanDraggable(app, zoomPan);

      // Listen to stage-zoom events
      app.stage.on('stage-zoom', (event: StageZoomEvent) => {
        console.log(`Stage zoom event: ${event.type}, zoom: ${event.zoom.toFixed(2)}`);

        // Example: Change cursor during drag
        if (event.type === 'zoom-start') {
          app.canvas.style.cursor = 'grabbing';
        } else if (event.type === 'zoom-end') {
          app.canvas.style.cursor = 'grab';
        }
      });

      // Add a grid to show the coordinate system
      const gridSize = 50;
      const gridExtent = 500;
      const gridGraphics = new Graphics();

      // Draw grid lines
      for (let x = -gridExtent; x <= gridExtent; x += gridSize) {
        const isAxis = x === 0;
        gridGraphics.moveTo(x, -gridExtent);
        gridGraphics.lineTo(x, gridExtent);
        gridGraphics.stroke({
          color: isAxis ? 0xff0000 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      for (let y = -gridExtent; y <= gridExtent; y += gridSize) {
        const isAxis = y === 0;
        gridGraphics.moveTo(-gridExtent, y);
        gridGraphics.lineTo(gridExtent, y);
        gridGraphics.stroke({
          color: isAxis ? 0x00ff00 : 0xcccccc,
          width: isAxis ? 2 : 1,
          alpha: isAxis ? 1 : 0.5,
        });
      }

      zoomPan.addChild(gridGraphics);

      // Add origin marker
      const originMarker = new Graphics();
      originMarker.circle(0, 0, 10);
      originMarker.fill({ color: 0x0000ff, alpha: 0.8 });
      zoomPan.addChild(originMarker);

      // Add origin label
      const originLabel = new Text({
        text: 'Origin (0, 0)',
        style: {
          fontSize: 16,
          fill: 0x000000,
        },
      });
      originLabel.position.set(15, -5);
      zoomPan.addChild(originLabel);

      // Add some colored squares at different positions
      const squares = [
        { x: 100, y: 100, color: 0xff6b6b, label: '(100, 100)' },
        { x: -100, y: 100, color: 0x4ecdc4, label: '(-100, 100)' },
        { x: 100, y: -100, color: 0xffe66d, label: '(100, -100)' },
        { x: -100, y: -100, color: 0x95e1d3, label: '(-100, -100)' },
      ];

      squares.forEach(({ x, y, color, label }) => {
        const square = new Graphics();
        square.rect(-25, -25, 50, 50);
        square.fill({ color, alpha: 0.8 });
        square.position.set(x, y);
        zoomPan.addChild(square);

        const text = new Text({
          text: label,
          style: {
            fontSize: 12,
            fill: 0x000000,
          },
        });
        text.anchor.set(0.5);
        text.position.set(x, y);
        zoomPan.addChild(text);
      });

      // Add zoom level display
      const zoomDisplay = new Text({
        text: `Zoom: ${getZoom().toFixed(2)}x`,
        style: {
          fontSize: 14,
          fill: 0x000000,
        },
      });
      zoomDisplay.position.set(-app.screen.width / 2 + 10, -app.screen.height / 2 + 10);
      root.addChild(zoomDisplay);

      // Update zoom display on wheel
      zoomPan.on('wheel', () => {
        zoomDisplay.text = `Zoom: ${getZoom().toFixed(2)}x`;
      });
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ZoomPanArgs>;

export const Default: Story = {};

export const BasicDragging: Story = {
  render: () => {
    const wrapper = document.createElement('div');

    // Add instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Drag anywhere to pan the viewport. Notice the reference graphics move together.';
    instructions.style.marginBottom = '10px';
    instructions.style.fontFamily = 'sans-serif';
    instructions.style.fontSize = '14px';
    wrapper.appendChild(instructions);

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '600px';
    wrapper.appendChild(container);

    // Create PixiJS application
    const app = new Application();

    // Initialize the app
    app.init({
      resizeTo: container,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    }).then(() => {
      container.appendChild(app.canvas);

      // Add STATIC elements directly to stage (before root)
      // These will NOT move when dragging - they show the stage is stationary
      const staticLayer = new Graphics();
      staticLayer.eventMode = 'none'; // Make it non-interactive so it doesn't block events
      staticLayer.label = 'StaticLayer';

      const { width, height } = app.screen;

      // Draw a subtle grid
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        staticLayer.moveTo(x, 0);
        staticLayer.lineTo(x, height);
        staticLayer.stroke({ color: 0x2a2a3e, width: 1, alpha: 0.3 });
      }

      for (let y = 0; y <= height; y += gridSize) {
        staticLayer.moveTo(0, y);
        staticLayer.lineTo(width, y);
        staticLayer.stroke({ color: 0x2a2a3e, width: 1, alpha: 0.3 });
      }

      // Add corner markers (STATIC - attached to stage)
      const cornerSize = 20;
      const corners = [
        { x: 0, y: 0, label: 'TL' },
        { x: width - cornerSize, y: 0, label: 'TR' },
        { x: 0, y: height - cornerSize, label: 'BL' },
        { x: width - cornerSize, y: height - cornerSize, label: 'BR' },
      ];

      corners.forEach(({ x, y, label }) => {
        staticLayer.rect(x, y, cornerSize, cornerSize);
        staticLayer.fill({ color: 0xff0000, alpha: 0.5 });

        const text = new Text({
          text: label,
          style: { fontSize: 10, fill: 0xffffff },
        });
        text.position.set(x + 5, y + 5);
        text.eventMode = 'none';
        staticLayer.addChild(text);
      });

      // Add big label
      const staticLabel = new Text({
        text: '🔒 STATIC LAYER (attached to stage - does NOT move)',
        style: {
          fontSize: 14,
          fill: 0xff6666,
          fontWeight: 'bold',
        },
      });
      staticLabel.position.set(width / 2 - 200, 20);
      staticLabel.eventMode = 'none';
      staticLayer.addChild(staticLabel);

      app.stage.addChild(staticLayer);

      // Create root container (centers origin)
      const { root } = createRootContainer(app);

      // Create zoom/pan container (zoom disabled for this example)
      const { zoomPan } = createZoomPan(app, root, {
        enableZoom: false,
        enablePan: false, // We'll use stage dragging instead
      });

      // Make it draggable via stage
      createZoomPanDraggable(app, zoomPan);

      // Add reference graphics

      // Center crosshair
      const crosshair = new Graphics();
      crosshair.moveTo(-20, 0);
      crosshair.lineTo(20, 0);
      crosshair.moveTo(0, -20);
      crosshair.lineTo(0, 20);
      crosshair.stroke({ color: 0xffffff, width: 2 });
      crosshair.circle(0, 0, 5);
      crosshair.fill({ color: 0xff0000 });
      zoomPan.addChild(crosshair);

      // Add some reference circles in a pattern
      const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xa8e6cf, 0xffd3b6];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 150;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const circle = new Graphics();
        circle.circle(0, 0, 30);
        circle.fill({ color: colors[i], alpha: 0.8 });
        circle.position.set(x, y);
        zoomPan.addChild(circle);

        const label = new Text({
          text: `${i + 1}`,
          style: {
            fontSize: 20,
            fill: 0xffffff,
            fontWeight: 'bold',
          },
        });
        label.anchor.set(0.5);
        label.position.set(x, y);
        zoomPan.addChild(label);
      }

      // Add a rectangle frame
      const frame = new Graphics();
      frame.rect(-200, -200, 400, 400);
      frame.stroke({ color: 0x666666, width: 2, alpha: 0.5 });
      zoomPan.addChild(frame);

      // Add position display
      const posDisplay = new Text({
        text: `Position: (0, 0)`,
        style: {
          fontSize: 14,
          fill: 0xffffff,
        },
      });
      posDisplay.position.set(-app.screen.width / 2 + 10, -app.screen.height / 2 + 10);
      root.addChild(posDisplay);

      // Update position display on drag
      app.stage.on('stage-zoom', (event: StageZoomEvent) => {
        if (event.type === 'zoom-move' || event.type === 'zoom-end') {
          posDisplay.text = `Position: (${Math.round(event.position.x)}, ${Math.round(event.position.y)})`;
        }
      });
    });

    return wrapper;
  },
};

