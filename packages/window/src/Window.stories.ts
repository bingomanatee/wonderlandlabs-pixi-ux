import type {Meta, StoryObj} from '@storybook/html';
import {Application, Container} from 'pixi.js';
import {WindowsManager} from "./WindowsManager";

interface WindowArgs {
}

const meta: Meta<WindowArgs> = {
    title: 'Window/Window',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '600px';
        let wm: WindowsManager;
        // Create PixiJS app
        const app = new Application();
        app.init({
            width: 1000,
            height: 600,
            backgroundColor: 0xf0f0f0,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);
            const container = new Container();
            const handleContainer = new Container();
            app.stage.addChild(container, handleContainer);
            wm = new WindowsManager({container, handleContainer, app});

            wm.addWindow('alpha', {
                x: 10, y: 20, width: 500, height: 300, backgroundColor: {
                    r: 1, g: 0, b: 0
                }
            })
        });

        return wrapper;
    },
};

export default meta;
type Story = StoryObj<WindowArgs>;

export const ThreeWindows: Story = {
    args: {},
};

