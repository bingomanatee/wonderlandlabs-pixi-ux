import type { Meta, StoryObj } from '@storybook/html';
import { Application, Graphics } from 'pixi.js';

interface WindowArgs {}

const meta: Meta<WindowArgs> = {
  title: 'Window/Window',
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '600px';

    // Create PixiJS app
    const app = new Application();
    app.init({
      width: 1000,
      height: 600,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    }).then(() => {
      wrapper.appendChild(app.canvas);

      // Create three simple colored boxes at specific rect dimensions

      // Blue box at (50, 50) with size 250x200
      const blueBox = new Graphics();
      blueBox.rect(0, 0, 250, 200);
      blueBox.fill({ r: 0.4, g: 0.6, b: 0.9 });
      blueBox.position.set(50, 50);
      app.stage.addChild(blueBox);

      // Red box at (350, 100) with size 200x250
      const redBox = new Graphics();
      redBox.rect(0, 0, 200, 250);
      redBox.fill({ r: 0.9, g: 0.5, b: 0.4 });
      redBox.position.set(350, 100);
      app.stage.addChild(redBox);

      // Green box at (600, 150) with size 300x180
      const greenBox = new Graphics();
      greenBox.rect(0, 0, 300, 180);
      greenBox.fill({ r: 0.5, g: 0.8, b: 0.5 });
      greenBox.position.set(600, 150);
      app.stage.addChild(greenBox);
    });

    return wrapper;
  },
};

export default meta;
type Story = StoryObj<WindowArgs>;

export const ThreeWindows: Story = {
  args: {},
};

