import type { Meta, StoryObj } from '@storybook/html';
import { Application, Container, Graphics, Rectangle, Text } from 'pixi.js';
import { enableHandles } from './enableHandles';
import { ResizerStore } from './ResizerStore';
import type { HandleMode } from './types';

interface ResizerArgs {
  constrain: boolean;
  handleSize: number;
}

const meta: Meta<ResizerArgs> = {
  title: 'Resizer/Resizer',
  argTypes: {
    constrain: {
      control: { type: 'boolean' },
      description: 'Constrain aspect ratio during resize',
    },
    handleSize: {
      control: { type: 'range', min: 8, max: 24, step: 2 },
      description: 'Size of resize handles in pixels',
    },
  },
  render: (args) => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';

    // Create PixiJS app
    const app = new Application();
    app.init({ 
      width: 800, 
      height: 600, 
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(() => {
      wrapper.appendChild(app.canvas);

      // Create boxes with different colors and modes
      const boxes = [
        { x: 100, y: 100, width: 150, height: 100, color: 0xff6b6b, label: 'Red Box', mode: 'ONLY_CORNER' as HandleMode },
        { x: 300, y: 150, width: 120, height: 120, color: 0x4ecdc4, label: 'Cyan Box', mode: 'ONLY_EDGE' as HandleMode },
        { x: 500, y: 200, width: 180, height: 80, color: 0xffe66d, label: 'Yellow Box', mode: 'EDGE_AND_CORNER' as HandleMode },
      ];

      let activeControls: ResizerStore | null = null;

      boxes.forEach(boxConfig => {
        // Create container for the box at 0,0
        const boxContainer = new Container();
        boxContainer.position.set(0, 0);
        app.stage.addChild(boxContainer);

        // Create box graphic using full rect coordinates
        const boxGraphic = new Graphics();
        boxGraphic.rect(boxConfig.x, boxConfig.y, boxConfig.width, boxConfig.height);
        boxGraphic.fill({ color: boxConfig.color, alpha: 0.7 });
        boxGraphic.stroke({ color: 0x333333, width: 2 });
        boxContainer.addChild(boxGraphic);

        // Add label (box name)
        const labelText = new Text({
          text: boxConfig.label,
          style: {
            fontSize: 16,
            fill: 0x000000,
          },
        });
        labelText.anchor.set(0.5);
        labelText.position.set(boxConfig.x + boxConfig.width / 2, boxConfig.y + boxConfig.height / 2 - 10);
        boxContainer.addChild(labelText);

        // Add mode label (smaller font)
        const modeText = new Text({
          text: `(${boxConfig.mode})`,
          style: {
            fontSize: 11,
            fill: 0x666666,
          },
        });
        modeText.anchor.set(0.5);
        modeText.position.set(boxConfig.x + boxConfig.width / 2, boxConfig.y + boxConfig.height / 2 + 10);
        boxContainer.addChild(modeText);

        // Make box interactive
        boxContainer.eventMode = 'static';
        boxContainer.cursor = 'pointer';

        // Click handler to activate handles
        boxContainer.on('pointerdown', (event) => {
          event.stopPropagation();

          // Remove previous handles if any
          if (activeControls) {
            activeControls.removeHandles();
          }

          // Enable handles on this box using full rect coordinates
          const rect = new Rectangle(boxConfig.x, boxConfig.y, boxConfig.width, boxConfig.height);
          activeControls = enableHandles(boxContainer, rect, {
            app,
            drawRect: (newRect, container) => {
              // Update box graphic using full rect coordinates
              boxGraphic.clear();
              boxGraphic.rect(newRect.x, newRect.y, newRect.width, newRect.height);
              boxGraphic.fill({ color: boxConfig.color, alpha: 0.7 });
              boxGraphic.stroke({ color: 0x333333, width: 2 });

              // Update label position (main title)
              labelText.position.set(newRect.x + newRect.width / 2, newRect.y + newRect.height / 2 - 10);

              // Update mode text position (subtitle)
              modeText.position.set(newRect.x + newRect.width / 2, newRect.y + newRect.height / 2 + 10);
            },
            onRelease: (finalRect) => {
              // Resize complete
            },
            size: args.handleSize,
            color: { r: 0.2, g: 0.6, b: 1 },
            constrain: args.constrain,
            mode: boxConfig.mode,
          });
        });
      });

      // Click on stage to deselect
      app.stage.eventMode = 'static';
      app.stage.on('pointerdown', () => {
        if (activeControls) {
          activeControls.removeHandles();
          activeControls = null;
        }
      });
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<ResizerArgs>;

export const PersistMode: Story = {
  args: {
    constrain: false,
    handleSize: 12,
  },
};

