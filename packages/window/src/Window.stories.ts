import type {Meta, StoryObj} from '@storybook/html';
import {Application, Container, Text} from 'pixi.js';
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
                x: 10, y: 20,
                width: 500,
                height: 300,
                closable: true,
                backgroundColor: {
                    r: 1, g: 0, b: 0
                },
                isDraggable: true,
                zIndex: 1,
                onClose: ({id}) => {
                    console.log(`Closed window: ${id}`);
                },
                titlebar: {
                    title: 'On Hover Mode',
                    mode: 'onHover',
                    height: 20,
                    showCloseButton: false,
                    backgroundColor: {r: 0.5, g: 0.5, b: 0.5},
                    isVisible: false,
                    fontSize: 10
                },
                titlebarContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-titlebar-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 10, fill: 0xffffff}
                        });
                        text.label = label;
                        text.position.set(190, -5);
                        contentContainer.addChild(text);
                    }
                    text.text = 'Hover to reveal';
                },
                windowContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-body-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 13, fill: 0xffffff, wordWrap: true, wordWrapWidth: 460}
                        });
                        text.label = label;
                        contentContainer.addChild(text);
                    }
                    text.position.set(16, 34);
                    text.text = 'Alpha: hover titlebar, draggable, closable. This body is rendered via windowContentRenderer.';
                }
            })

            wm.addWindow('beta', {
                x: 520,
                y: 20,
                width: 400,
                height: 250,
                closable: true,
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
                },
                titlebarContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-titlebar-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 10, fill: 0xe2e8f0}
                        });
                        text.label = label;
                        text.position.set(220, -5);
                        contentContainer.addChild(text);
                    }
                    text.text = 'Always visible';
                },
                windowContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-body-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 13, fill: 0xffffff, wordWrap: true, wordWrapWidth: 360}
                        });
                        text.label = label;
                        contentContainer.addChild(text);
                    }
                    text.position.set(14, 42);
                    text.text = 'Beta: persistent titlebar with custom colors. This copy is per-window and generated in renderer.';
                }
            })

            wm.addWindow('gamma', {
                x: 200,
                y: 350,
                width: 300,
                height: 200,
                closable: true,
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
                },
                titlebarContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-titlebar-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 10, fill: 0xf0fdf4}
                        });
                        text.label = label;
                        text.position.set(170, -5);
                        contentContainer.addChild(text);
                    }
                    text.text = `${Math.round(windowValue.width)}x${Math.round(windowValue.height)}`;
                },
                windowContentRenderer: ({contentContainer, windowValue}) => {
                    const label = `${windowValue.id}-body-copy`;
                    let text = contentContainer.getChildByLabel(label) as Text | null;
                    if (!text) {
                        text = new Text({
                            text: '',
                            style: {fontSize: 13, fill: 0x052e16, wordWrap: true, wordWrapWidth: 260}
                        });
                        text.label = label;
                        contentContainer.addChild(text);
                    }
                    text.position.set(12, 42);
                    text.text = `Gamma: resize from corner. Current size ${Math.round(windowValue.width)}x${Math.round(windowValue.height)}.`;
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
