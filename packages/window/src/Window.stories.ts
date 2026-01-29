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
            app.stage.eventMode = 'static';
            wm = new WindowsManager({container, handleContainer, app});

            wm.addWindow('alpha', {
                id: 'alpha',
                x: 10, y: 20,
                width: 500,
                height: 300,
                backgroundColor: {
                    r: 1, g: 0, b: 0
                },
                isDraggable: true,
                zIndex: 1,
                titlebar: {
                    title: 'On Hover Mode',
                    mode: 'onHover',
                    height: 20,
                    showCloseButton: false,
                    backgroundColor: {r: 0.5, g: 0.5, b: 0.5},
                    isVisible: false,
                    fontSize: 10
                }
            })

            wm.addWindow('beta', {
                id: 'beta',
                x: 520,
                y: 20,
                width: 400,
                height: 250,
                backgroundColor: {
                    r: 0, g: 0.5, b: 1
                },
                isDraggable: true,
                zIndex: 0,
                titlebar: {
                    title: 'Persistent Titlebar',
                    mode: 'persistent',
                    height: 30,
                    padding: 4,
                    showCloseButton: false,
                    backgroundColor: {r: 0.3, g: 0.3, b: 0.3},
                    textColor: {r: 1, g: 1, b: 1}
                }
            })

            wm.addWindow('gamma', {
                id: 'gamma',
                x: 200,
                y: 350,
                width: 300,
                height: 200,
                minWidth: 100,
                minHeight: 100,
                backgroundColor: {
                    r: 0, g: 0.8, b: 0.3
                },
                isDraggable: true,
                isResizeable: true,
                resizeMode: 'ONLY_CORNER',
                zIndex: 2,
                titlebar: {
                    title: 'Resizable Window',
                    mode: 'persistent',
                    height: 30,
                    padding: 4,
                    showCloseButton: false,
                    backgroundColor: {r: 0.2, g: 0.5, b: 0.2},
                    textColor: {r: 1, g: 1, b: 1}
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

