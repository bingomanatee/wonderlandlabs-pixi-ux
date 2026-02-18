import type {Meta, StoryObj} from '@storybook/html';
import {Application, Assets, Container, Graphics, Sprite, Text} from 'pixi.js';
import {ToolbarStore} from '@wonderlandlabs-pixi-ux/toolbar';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import {WindowsManager, TEXTURE_STATUS} from "./WindowsManager";
import type {RenderTitlebarFn, WindowDef} from "./types";
import type {TitlebarStore} from "./TitlebarStore";
import {STYLE_VARIANT} from "./constants";
import {EditableWindowStore} from "./EditableWindowStore";

const toolbarStyleTree = fromJSON({
    button: {
        text: {
            padding: {
                '$*': {x: 10, y: 5}
            },
            borderRadius: {
                '$*': 4
            },
            label: {
                fontSize: {
                    '$*': 12
                },
                color: {
                    '$*': {r: 1, g: 1, b: 1}
                },
                alpha: {
                    '$*': 1
                }
            },
            stroke: {
                '$*': {
                    color: {r: 0.4, g: 0.4, b: 0.4},
                    alpha: 0,
                    width: 0
                }
            }
        },
        image: {
            text: {
                fill: {
                    '$*': {color: {r: 0.333, g: 0.667, b: 0.6}, alpha: 1},
                    '$hover': {color: {r: 0.267, g: 0.733, b: 0.533}, alpha: 1}
                }
            }
        },
        caption: {
            text: {
                fill: {
                    '$*': {color: {r: 0.333, g: 0.6, b: 0.667}, alpha: 1},
                    '$hover': {color: {r: 0.267, g: 0.533, b: 0.733}, alpha: 1}
                }
            }
        },
        done: {
            text: {
                fill: {
                    '$*': {color: {r: 0.4, g: 0.4, b: 0.4}, alpha: 1},
                    '$hover': {color: {r: 0.533, g: 0.533, b: 0.533}, alpha: 1}
                },
                stroke: {
                    '$*': {
                        color: {r: 0.667, g: 0.667, b: 0.667},
                        alpha: 1,
                        width: 2
                    }
                }
            }
        }
    }
});

function createStoryToolbar(
    app: Application,
    onAddImage: () => void,
    onAddCaption: () => void,
    onDone: () => void
): ToolbarStore {
    const toolbar = new ToolbarStore({
        id: 'window-floating-toolbar',
        spacing: 8,
        orientation: 'horizontal',
        padding: 10,
        style: toolbarStyleTree,
        background: {
            fill: { color: { r: 0.27, g: 0.27, b: 0.27 }, alpha: 1 },
            borderRadius: 6,
        },
        buttons: [
            { id: 'toolbar-image', label: 'Image', mode: 'text', variant: 'image', onClick: onAddImage },
            { id: 'toolbar-caption', label: 'Caption', mode: 'text', variant: 'caption', onClick: onAddCaption },
            { id: 'toolbar-done', label: 'Done', mode: 'text', variant: 'done', onClick: onDone },
        ],
    }, app);
    toolbar.container.visible = false;
    toolbar.kickoff();
    return toolbar;
}

interface EditableWindowArgs {
}

// Custom titlebar renderer that adds close and move buttons
// Uses WindowsManager's texture loading system for the move icon
const customTitlebarRenderer: RenderTitlebarFn = (
    titlebarStore: unknown,
    windowData: WindowDef,
    contentContainer: Container
) => {
    const store = titlebarStore as TitlebarStore;
    const closeButtonId = `close-btn-${windowData.id}`;
    const moveButtonId = `move-btn-${windowData.id}`;

    // Check if close button already exists
    let closeBtn = contentContainer.getChildByLabel(closeButtonId) as Graphics | null;

    if (!closeBtn) {
        closeBtn = new Graphics({label: closeButtonId});
        closeBtn.eventMode = 'static';
        closeBtn.cursor = 'pointer';

        // Draw close button (X)
        const size = 12;
        closeBtn.circle(0, 0, size / 2 + 2).fill({color: 0xff4444});
        closeBtn.moveTo(-size / 3, -size / 3).lineTo(size / 3, size / 3).stroke({color: 0xffffff, width: 2});
        closeBtn.moveTo(size / 3, -size / 3).lineTo(-size / 3, size / 3).stroke({color: 0xffffff, width: 2});

        contentContainer.addChild(closeBtn);

        // Add click handler
        closeBtn.on('pointerdown', (event) => {
            event.stopPropagation();
            console.log(`Close button clicked for window: ${windowData.id}`);
        });
    }

    // Check if move button already exists
    let moveBtn = contentContainer.getChildByLabel(moveButtonId) as Container | null;

    if (!moveBtn) {
        // Check texture status from WindowsManager (accessed via store.$parent.$root)
        const windowsManager = (store.$parent as any)?.$root as WindowsManager | undefined;
        const textureStatus = windowsManager?.getTextureStatus('move');

        if (textureStatus === TEXTURE_STATUS.LOADED) {
            // Create move button with loaded texture
            moveBtn = new Container({label: moveButtonId});
            moveBtn.eventMode = 'static';
            moveBtn.cursor = 'move';

            const moveIcon = new Sprite(Assets.get('move'));
            moveIcon.width = 16;
            moveIcon.height = 16;
            moveIcon.anchor.set(0.5);
            moveBtn.addChild(moveIcon);

            contentContainer.addChild(moveBtn);

            moveBtn.on('pointerdown', (event) => {
                event.stopPropagation();
                console.log(`Move button clicked for window: ${windowData.id}`);
            });
        }
        // If texture not loaded yet, WindowsManager will mark all windows dirty when it loads
    }

    // Position buttons at right side of titlebar
    const parentWidth = (store.$parent?.value as any)?.width || 200;
    const padding = store.value.padding;
    const yPos = -store.value.fontSize * 0.3;

    // Close button at far right
    closeBtn.x = parentWidth - padding - 20;
    closeBtn.y = yPos;

    // Move button to the left of close button
    if (moveBtn) {
        moveBtn.x = parentWidth - padding - 44;
        moveBtn.y = yPos;
    }
};

const meta: Meta<EditableWindowArgs> = {
    title: 'Window/EditableWindow',
    render: () => {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = '650px';

        // Track content added to windows for positioning
        const windowContentCounts = new Map<string, number>();

        let wm: WindowsManager;
        let currentSelectedId: string | null = null;

        // Add image to selected window
        const addImageToWindow = async () => {
            if (!currentSelectedId || !wm) return;

            const contentContainer = wm.getContentContainer(currentSelectedId);
            const windowStore = wm.windowBranch(currentSelectedId);
            if (!contentContainer || !windowStore) return;

            try {
                const texture = await Assets.load('/placeholder-art.png');
                const sprite = new Sprite(texture);

                // Get current content count for positioning
                const count = windowContentCounts.get(currentSelectedId) || 0;
                const titlebarHeight = windowStore.value.titlebar?.height || 30;

                // Scale image to fit window width with padding
                const maxWidth = windowStore.value.width - 20;
                const scale = Math.min(1, maxWidth / sprite.width);
                sprite.scale.set(scale);

                // Position below titlebar and any existing content
                sprite.x = 10;
                sprite.y = titlebarHeight + 10 + (count * 80);

                contentContainer.addChild(sprite);
                windowContentCounts.set(currentSelectedId, count + 1);

                console.log(`Added image to window: ${currentSelectedId}`);
            } catch (err) {
                console.error('Failed to load image:', err);
            }
        };

        // Add caption to selected window
        const addCaptionToWindow = () => {
            if (!currentSelectedId || !wm) return;

            const contentContainer = wm.getContentContainer(currentSelectedId);
            const windowStore = wm.windowBranch(currentSelectedId);
            if (!contentContainer || !windowStore) return;

            const count = windowContentCounts.get(currentSelectedId) || 0;
            const titlebarHeight = windowStore.value.titlebar?.height || 30;

            const caption = new Text({
                text: `Caption ${count + 1}`,
                style: {
                    fontSize: 14,
                    fill: 0xffffff,
                    fontFamily: 'Arial',
                }
            });

            caption.x = 10;
            caption.y = titlebarHeight + 10 + (count * 80);

            contentContainer.addChild(caption);
            windowContentCounts.set(currentSelectedId, count + 1);

            console.log(`Added caption to window: ${currentSelectedId}`);
        };

        // Selection indicator
        const selectionInfo = document.createElement('div');
        selectionInfo.style.padding = '10px';
        selectionInfo.style.fontFamily = 'sans-serif';
        selectionInfo.style.fontSize = '14px';
        selectionInfo.textContent = 'Selected: none';
        wrapper.appendChild(selectionInfo);

        let toolbar: ToolbarStore;
        const stageWidth = 1000;
        const stageHeight = 550;
        const toolbarGap = 8; // Gap between window and toolbar

        // Deselect handler (for Done button and background click)
        const handleDeselect = () => {
            if (wm) {
                wm.clearSelection();
            }
        };

        // Position toolbar below selected window, clamped to stage bounds
        const positionToolbar = () => {
            if (!currentSelectedId || !wm || !toolbar) return;

            const windowStore = wm.windowBranch(currentSelectedId);
            if (!windowStore) return;

            const {x, y, width, height} = windowStore.value;
            const toolbarWidth = toolbar.rect.width > 0 ? toolbar.rect.width : 150;
            const toolbarHeight = toolbar.rect.height > 0 ? toolbar.rect.height : 40;

            // Ideal position: centered below the window
            let toolbarX = x + (width - toolbarWidth) / 2;
            let toolbarY = y + height + toolbarGap;

            // Clamp X to stage bounds
            toolbarX = Math.max(0, Math.min(toolbarX, stageWidth - toolbarWidth));

            // If toolbar would go below stage, position it above the window
            if (toolbarY + toolbarHeight > stageHeight) {
                toolbarY = y - toolbarHeight - toolbarGap;
                // If still out of bounds (window at top), clamp to bottom of stage
                if (toolbarY < 0) {
                    toolbarY = stageHeight - toolbarHeight;
                }
            }

            toolbar.setPosition(toolbarX, toolbarY);
        };

        const app = new Application();
        app.init({
            width: stageWidth,
            height: stageHeight,
            backgroundColor: 0x2a2a2a,
            antialias: true,
        }).then(async () => {
            wrapper.appendChild(app.canvas);
            const container = new Container();
            const handleContainer = new Container();

            // Create toolbar and add to stage (above everything)
            toolbar = createStoryToolbar(app, addImageToWindow, addCaptionToWindow, handleDeselect);

            // Create background for click-to-deselect
            const background = new Graphics();
            background.rect(0, 0, stageWidth, stageHeight).fill(0x2a2a2a);
            background.eventMode = 'static';
            background.cursor = 'default';
            background.on('pointerdown', () => {
                handleDeselect();
            });

            app.stage.addChild(background, container, handleContainer, toolbar.container);
            app.stage.eventMode = 'static';
            wm = new WindowsManager({
                container,
                handleContainer,
                app,
                textures: [
                    {id: 'move', url: '/icons/move.png'}
                ]
            });

            // Window 1: Default style with custom renderer
            wm.addWindow('editor', {
                x: 50, y: 50,
                width: 300,
                height: 200,
                isDraggable: true,
                dragFromTitlebar: true,
                isResizeable: true,
                resizeMode: 'ONLY_CORNER',
                zIndex: 1,
                variant: STYLE_VARIANT.DEFAULT,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Default Style',
                    mode: 'persistent',
                    height: 28,
                    padding: 8,
                    fontSize: 12,
                    icon: {
                        url: 'https://cdn-icons-png.flaticon.com/32/2991/2991112.png',
                        width: 16,
                        height: 16
                    }
                }
            });

            // Window 2: Blue style
            wm.addWindow('blue-window', {
                x: 380, y: 50,
                width: 280,
                height: 180,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 2,
                variant: STYLE_VARIANT.BLUE,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Blue Style',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Window 3: Light grayscale style
            wm.addWindow('light-window', {
                x: 690, y: 50,
                width: 280,
                height: 180,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 3,
                variant: STYLE_VARIANT.LIGHT_GRAYSCALE,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Light Grayscale',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Window 4: Alert Info style
            wm.addWindow('info-window', {
                x: 50, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 4,
                variant: STYLE_VARIANT.ALERT_INFO,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Alert Info',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Window 5: Alert Danger style
            wm.addWindow('danger-window', {
                x: 360, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 5,
                variant: STYLE_VARIANT.ALERT_DANGER,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Alert Danger',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Window 6: Alert Warning style
            wm.addWindow('warning-window', {
                x: 670, y: 280,
                width: 280,
                height: 150,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 6,
                variant: STYLE_VARIANT.ALERT_WARNING,
                storeClass: EditableWindowStore,
                titlebar: {
                    title: 'Alert Warning',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Window 7: Inverted style with custom style override
            wm.addWindow('custom-window', {
                x: 200, y: 450,
                width: 350,
                height: 120,
                isDraggable: true,
                dragFromTitlebar: true,
                zIndex: 7,
                variant: STYLE_VARIANT.INVERTED,
                storeClass: EditableWindowStore,
                customStyle: {
                    selectedBorderColor: {r: 0, g: 1, b: 0.5}, // Custom green selection
                    selectedBorderWidth: 3
                },
                titlebar: {
                    title: 'Inverted + Custom (green selection)',
                    mode: 'persistent',
                    height: 26,
                    padding: 6,
                    fontSize: 11
                }
            });

            // Set custom renderer on editor window's titlebar (with move icon)
            const editorBranch = wm.windowBranch('editor');
            if (editorBranch?.titlebarStore) {
                editorBranch.titlebarStore.renderTitlebar = customTitlebarRenderer;
            }

            // Subscribe to selection changes
            wm.$subject.subscribe(() => {
                const selectedWindows = wm.getSelectedWindows();
                const selectedArray = Array.from(selectedWindows);
                const selected = selectedArray.join(', ') || 'none';
                selectionInfo.textContent = `Selected: ${selected}`;

                // Show toolbar only when exactly one window is selected
                if (selectedArray.length === 1) {
                    currentSelectedId = selectedArray[0];
                    toolbar.container.visible = true;
                    positionToolbar();
                    app.ticker.addOnce(positionToolbar);
                } else {
                    currentSelectedId = null;
                    toolbar.container.visible = false;
                }
            });
        });

        return wrapper;
    },
};

export default meta;
type Story = StoryObj<EditableWindowArgs>;

export const EditableWindows: Story = {
    args: {},
};
