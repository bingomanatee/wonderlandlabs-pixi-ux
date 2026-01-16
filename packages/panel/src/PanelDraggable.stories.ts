import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics, Container } from 'pixi.js';
import { PanelStore } from './PanelStore';
import { makePanelDraggable } from './makePanelDraggable';
import type { PanelData } from './types';
import type { PanelDragEvent } from './makePanelDraggable';

interface PanelDraggableArgs {}

const meta: Meta<PanelDraggableArgs> = {
  title: 'Panel/Panel Draggable',
  tags: ['autodocs'],
  render: (args) => {
    const wrapper = document.createElement('div');

    // Add instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Drag the blue-bordered panels around. Every other panel is draggable.';
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
      backgroundColor: 0xf5f5f5,
      antialias: true,
    }).then(() => {
      container.appendChild(app.canvas);
      
      // Create panel store
      const panelStore = new PanelStore();
      
      // Container for all panels
      const panelsContainer = new Container();
      app.stage.addChild(panelsContainer);
      
      // Track panel graphics and draggable instances by ID
      const panelGraphics = new Map<string, Graphics>();
      const draggableInstances = new Map<string, { destroy: () => void }>();
      
      // Pre-create 6 panels in a grid
      const panelConfigs = [
        { id: 'panel-1', x: 100, y: 100, color: { r: 1, g: 0.7, b: 0.7 }, draggable: false },
        { id: 'panel-2', x: 250, y: 100, color: { r: 0.7, g: 1, b: 0.7 }, draggable: true },
        { id: 'panel-3', x: 400, y: 100, color: { r: 0.7, g: 0.7, b: 1 }, draggable: false },
        { id: 'panel-4', x: 100, y: 250, color: { r: 1, g: 1, b: 0.7 }, draggable: true },
        { id: 'panel-5', x: 250, y: 250, color: { r: 1, g: 0.7, b: 1 }, draggable: false },
        { id: 'panel-6', x: 400, y: 250, color: { r: 0.7, g: 1, b: 1 }, draggable: true },
      ];

      panelConfigs.forEach((config, index) => {
        panelStore.addPanel({
          id: config.id,
          x: config.x,
          y: config.y,
          width: 120,
          height: 100,
          order: index,
          style: {
            background: {
              isVisible: true,
              fill: config.color,
              opacity: 0.8,
            },
            stroke: {
              isVisible: true,
              // Blue border for draggable panels, gray for non-draggable
              color: config.draggable ? { r: 0, g: 0.4, b: 1 } : { r: 0.5, g: 0.5, b: 0.5 },
              width: config.draggable ? 3 : 1,
              opacity: 1,
            },
          },
        });
      });
      
      // Function to create a panel graphic
      const createPanelGraphic = (panel: PanelData): Graphics => {
        const graphic = new Graphics();

        // Draw background if visible
        if (panel.style.background.isVisible) {
          const bg = panel.style.background;
          graphic.rect(0, 0, panel.width, panel.height);
          graphic.fill({
            color: {
              r: bg.fill.r * 255,
              g: bg.fill.g * 255,
              b: bg.fill.b * 255,
            },
            alpha: bg.opacity,
          });
        }

        // Draw stroke if visible
        if (panel.style.stroke.isVisible) {
          const stroke = panel.style.stroke;
          graphic.rect(0, 0, panel.width, panel.height);
          graphic.stroke({
            color: {
              r: stroke.color.r * 255,
              g: stroke.color.g * 255,
              b: stroke.color.b * 255,
            },
            width: stroke.width,
            alpha: stroke.opacity,
          });
        }

        graphic.x = panel.x;
        graphic.y = panel.y;
        graphic.zIndex = panel.order;
        graphic.label = panel.id;

        return graphic;
      };
      
      // Create graphics for all panels
      panelConfigs.forEach((config) => {
        const panel = panelStore.getPanel(config.id);
        if (panel) {
          const graphic = createPanelGraphic(panel);
          panelGraphics.set(config.id, graphic);
          panelsContainer.addChild(graphic);
          
          // Make every other panel draggable (panels 2, 4, 6)
          if (config.draggable) {
            const draggable = makePanelDraggable(app, panelStore, config.id, graphic);
            draggableInstances.set(config.id, draggable);
          }
        }
      });
      
      // Listen to drag events
      app.stage.on('panel-drag', (event: PanelDragEvent) => {
        console.log(`${event.type}: panel=${event.panelId}, pos=(${event.position.x.toFixed(1)}, ${event.position.y.toFixed(1)})`);
      });
      
      // Sort children by zIndex
      panelsContainer.sortChildren();
      
      // Cleanup on destroy
      return () => {
        draggableInstances.forEach(instance => instance.destroy());
        app.destroy(true);
      };
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<PanelDraggableArgs>;

export const Default: Story = {};

