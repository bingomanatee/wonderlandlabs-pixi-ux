import type {Meta, StoryObj} from '@storybook/html';
import {Application, Container, Graphics, Text} from 'pixi.js';
import {DragStore} from './DragStore';

interface DragArgs {
}

const meta: Meta<DragArgs> = {
    title: 'Drag (Deprecated)/Draggable Container',
    render: (args) => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '600px';
        wrapper.style.position = 'relative';
        let dragStore: DragStore;
        // Create PixiJS app
        const app = new Application();
        app.init({
            width: 800,
            height: 600,
            backgroundColor: 0xf5f5f5,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);

            // Create instruction text
            const instructions = new Text({
                text: 'Click and drag the colored boxes',
                style: {
                    fontSize: 16,
                    fill: 0x333333,
                },
            });
            instructions.position.set(20, 20);
            app.stage.addChild(instructions);

            // Create drag store
            dragStore = new DragStore({
                app,
                callbacks: {
                    onDragStart: (itemId, x, y) => {
                        console.log(`Drag started: ${itemId} at (${x}, ${y})`);
                    },
                    onDrag: (state) => {
                        const pos = dragStore.getCurrentItemPosition();
                        if (pos && state.draggedItemId) {
                            // Find the container and update its position
                            const container = draggableBoxes.find(b => b.id === state.draggedItemId);
                            if (container) {
                                container.container.position.set(pos.x, pos.y);
                            }
                        }
                    },
                    onDragEnd: () => {
                        console.log('Drag ended');
                        // Reset cursor for all boxes
                        draggableBoxes.forEach(({container}) => {
                            container.cursor = 'grab';
                        });
                    },
                },
            });

            // Create draggable boxes
            const boxConfigs = [
                {id: 'box-1', x: 100, y: 100, width: 120, height: 120, color: 0xff6b6b, label: 'Red Box'},
                {id: 'box-2', x: 300, y: 150, width: 140, height: 100, color: 0x4ecdc4, label: 'Cyan Box'},
                {id: 'box-3', x: 500, y: 200, width: 100, height: 140, color: 0xffe66d, label: 'Yellow Box'},
            ];

            const draggableBoxes: Array<{ id: string; container: Container }> = [];

            boxConfigs.forEach(config => {
                // Create container
                const container = new Container();
                container.position.set(config.x, config.y);
                app.stage.addChild(container);

                // Create box graphic
                const box = new Graphics();
                box.rect(0, 0, config.width, config.height);
                box.fill({color: config.color, alpha: 0.8});
                box.stroke({color: 0x333333, width: 2});
                container.addChild(box);

                // Add label
                const label = new Text({
                    text: config.label,
                    style: {
                        fontSize: 14,
                        fill: 0x000000,
                    },
                });
                label.anchor.set(0.5);
                label.position.set(config.width / 2, config.height / 2);
                container.addChild(label);

                // Make interactive
                container.eventMode = 'static';
                container.cursor = 'grab';

                // Store reference
                draggableBoxes.push({id: config.id, container});

                // Add drag handlers
                container.on('pointerdown', (event) => {
                    event.stopPropagation();
                    container.cursor = 'grabbing';

                    // Start drag with current container position
                    dragStore.startDragContainer(
                        config.id,
                        event, container
                    );
                });
            });
        });

        return wrapper;
    },
};

export default meta;
type Story = StoryObj<DragArgs>;

export const SimpleDraggable: Story = {};
