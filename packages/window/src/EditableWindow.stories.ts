import type {Meta, StoryObj} from '@storybook/html';
import {Application, Assets, Container, Graphics, Sprite, Text} from 'pixi.js';
import {WindowsManager} from "./WindowsManager";
import type {RenderTitlebarFn, WindowDef} from "./types";
import type {TitlebarStore} from "./TitlebarStore";
import {STYLE_VARIANT} from "./constants";
import {EditableWindowStore} from "./EditableWindowStore";

// PixiJS Toolbar button helper
function createToolbarButton(
    label: string,
    bgColor: number,
    hoverColor: number,
    onClick: () => void,
    strokeColor?: number,
    strokeWidth: number = 0
): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    const padding = {x: 12, y: 6};

    const text = new Text({
        text: label,
        style: {fontSize: 13, fill: 0xffffff, fontFamily: 'Arial'}
    });

    const width = text.width + padding.x * 2 + strokeWidth * 2;
    const height = text.height + padding.y * 2 + strokeWidth * 2;

    const drawBg = (color: number) => {
        bg.clear();
        bg.roundRect(0, 0, width, height, 4).fill(color);
        if (strokeColor !== undefined && strokeWidth > 0) {
            bg.roundRect(0, 0, width, height, 4).stroke({color: strokeColor, width: strokeWidth});
        }
    };

    drawBg(bgColor);
    text.x = padding.x + strokeWidth;
    text.y = padding.y + strokeWidth;

    btn.addChild(bg, text);

    btn.on('pointerenter', () => drawBg(hoverColor));
    btn.on('pointerleave', () => drawBg(bgColor));
    btn.on('pointerdown', (e) => {
        e.stopPropagation();
        onClick();
    });

    return btn;
}

// Create PixiJS toolbar container
function createPixiToolbar(
    onAddImage: () => void,
    onAddCaption: () => void,
    onDone: () => void
): Container {
    const toolbar = new Container();
    toolbar.visible = false;

    const bg = new Graphics();
    const padding = 10;
    const gap = 8;

    // Create buttons
    const imageBtn = createToolbarButton('Image', 0x55aa99, 0x44bb88, onAddImage);
    const captionBtn = createToolbarButton('Caption', 0x5599aa, 0x4488bb, onAddCaption);
    const doneBtn = createToolbarButton('Done', 0x666666, 0x888888, onDone, 0xaaaaaa, 2);

    // Position buttons
    imageBtn.x = padding;
    imageBtn.y = padding;
    captionBtn.x = imageBtn.x + imageBtn.width + gap;
    captionBtn.y = padding;
    doneBtn.x = captionBtn.x + captionBtn.width + gap;
    doneBtn.y = padding;

    // Draw background
    const totalWidth = padding + imageBtn.width + gap + captionBtn.width + gap + doneBtn.width + padding;
    const totalHeight = padding + Math.max(imageBtn.height, captionBtn.height, doneBtn.height) + padding;
    bg.roundRect(0, 0, totalWidth, totalHeight, 6).fill(0x444444);

    toolbar.addChild(bg, imageBtn, captionBtn, doneBtn);

    // Store dimensions for positioning
    (toolbar as any)._toolbarWidth = totalWidth;
    (toolbar as any)._toolbarHeight = totalHeight;

    return toolbar;
}

interface EditableWindowArgs {
}

// Custom titlebar renderer that adds a close button
const customTitlebarRenderer: RenderTitlebarFn = (
    titlebarStore: unknown,
    windowData: WindowDef,
    contentContainer: Container
) => {
    const store = titlebarStore as TitlebarStore;
    const closeButtonId = `close-btn-${windowData.id}`;

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
            // Could call windowsManager.removeWindow(windowData.id) here
        });
    }

    // Position close button at right side of titlebar
    const parentWidth = (store.$parent?.value as any)?.width || 200;
    closeBtn.x = parentWidth - store.value.padding - 20;
    closeBtn.y = -store.value.fontSize * 0.3;
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

        let toolbar: Container;
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
            const toolbarWidth = (toolbar as any)._toolbarWidth || 150;
            const toolbarHeight = (toolbar as any)._toolbarHeight || 40;

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

            toolbar.x = toolbarX;
            toolbar.y = toolbarY;
        };

        const app = new Application();
        app.init({
            width: stageWidth,
            height: stageHeight,
            backgroundColor: 0x2a2a2a,
            antialias: true,
        }).then(() => {
            wrapper.appendChild(app.canvas);
            const container = new Container();
            const handleContainer = new Container();

            // Create toolbar and add to stage (above everything)
            toolbar = createPixiToolbar(addImageToWindow, addCaptionToWindow, handleDeselect);

            // Create background for click-to-deselect
            const background = new Graphics();
            background.rect(0, 0, stageWidth, stageHeight).fill(0x2a2a2a);
            background.eventMode = 'static';
            background.cursor = 'default';
            background.on('pointerdown', () => {
                handleDeselect();
            });

            app.stage.addChild(background, container, handleContainer, toolbar);
            app.stage.eventMode = 'static';
            wm = new WindowsManager({container, handleContainer, app});

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

            // Set custom renderer on editor window's titlebar
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
                    toolbar.visible = true;
                    positionToolbar();
                } else {
                    currentSelectedId = null;
                    toolbar.visible = false;
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

