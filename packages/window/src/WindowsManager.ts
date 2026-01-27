import {Application, Container} from 'pixi.js';
import {Forest} from "@wonderlandlabs/forestry4";

import type {WindowDef, WindowStoreValue} from './types';
import {WindowDefSchema} from './types';
import {WindowStore} from "./WindowStore";

export interface WindowsManagerConfig {
    app: Application;
    container: Container;
    handleContainer?: Container;
}

/**
 * WindowsManager manages multiple windows with draggable titlebars and optional resizing.
 * Extends TickerForest to synchronize PixiJS operations with the ticker loop.
 */
export class WindowsManager extends Forest<WindowStoreValue> {
    container: Container;
    private handleContainer?: Container;
    private windowComponents = new Map<string, WindowComponents>();

    constructor(config: WindowStoreConfig) {
        super(
            {
                value: {
                    windows: new Map(),
                    dirty: false,
                },
                prep(next) {
                    const self = this as WindowsManager;
                    self.initNewWindows(next.windows);

                    return next;
                }
            }
        );
        this.app = config.app;

        this.container = config.container;
        this.container.label = 'windows';
        this.container.position.set(0, 0);

        this.handleContainer = config.handleContainer;
    }
    app?: Application;

    initNewWindows(nextWindows: Map<string, WindowDef>) {
        nextWindows?.forEach((window, key) => {
            if (!this.value.windows.has(key)) {
                queueMicrotask(() => {
                    const newBranch = this.addWindowBranch(key, window);
                    newBranch?.set('isDirty', true);
                })
            }

            this.value.windows.forEach((existingWindow, key) => {
                if (!nextWindows.has(key)) {
                    this.removeWindow(key);
                }
            });
        });
    }

    addWindowBranch(key: string, window?: WindowDef) {
        if (this.#windowsBranches.has(key)) {
            console.warn('attempt to recreate existing branch ' + key);
            return this.#windowsBranches.get(key);
        }

        // @ts-ignore
        const branch = this.$branch<WindowDef, WindowStore>(['windows', key], {
            subclass: WindowStore,
        }) as unknown as WindowStore;

        this.#windowsBranches.set(key, branch);
        return branch;
    }

    #windowsBranches = new Map<string, WindowStore>();

    /**
     * Add a new window
     */
    addWindow(windowDef: Partial<WindowDef> & { id: string }) {
        if (this.value.windows.has(windowDef.id)) {
            throw new Error('cannot recreate existing window');
        }

        const parsed = WindowDefSchema.parse({
            ...windowDef,
            status: WINDOW_STATUS.DIRTY,
        });

        this.mutate((draft) => {
            draft.windows.set(parsed.id, parsed);
            draft.dirty = true;
        });
    }

    /**
     * Update an existing window
     */
    updateWindow(id: string, updates: Partial<WindowDef>) {
        const existing = this.value.windows.get(id);
        if (!existing) {
            return;
        }

        const updated = WindowDefSchema.parse({
            ...existing,
            ...updates,
            status: WINDOW_STATUS.DIRTY,
        });

        this.set(['windows', id], updated);
    }

    /**
     * Remove a window
     */
    removeWindow(id: string) {
        const existing = this.value.windows.get(id);
        if (!existing) {
            return;
        }

        this.mutate((draft) => {
            const window = draft.windows.get(id);
            if (window) {
                window.status = WINDOW_STATUS.DELETED;
            }
        });
        if (this.#windowsBranches.has(id)) {
            this.#windowsBranches.get(id)?.cleanup();
            this.#windowsBranches.delete(id);
        }
    }

    /**
     * Update window position
     */
    updateWindowPosition(id: string, x: number, y: number) {
        const existing = this.value.windows.get(id);
        if (!existing) {
            return;
        }

        this.mutate((draft) => {
            const window = draft.windows.get(id);
            if (window) {
                window.x = x;
                window.y = y;
                window.status = WINDOW_STATUS.DIRTY;
            }
            draft.dirty = true;
        });
        this.queueResolve();
    }

    /**
     * Convert Color (0..1) to hex color number
     */
    private colorToHex(color: Color): number {
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Create all PixiJS components for a new window
     */
    private createWindowComponents(id: string, windowDef: WindowDef): void {
        // Create window container
        const windowContainer = new Container();
        windowContainer.label = `Window-${id}`;
        windowContainer.position.set(windowDef.x, windowDef.y);
        windowContainer.zIndex = windowDef.zIndex;
        this.container.addChild(windowContainer);

        // Create background at zIndex 0
        const background = new Graphics();
        background.rect(0, 0, windowDef.width, windowDef.height);
        background.fill(this.colorToHex(windowDef.backgroundColor));
        background.zIndex = 0;
        windowContainer.addChild(background);

        // Create mask
        const mask = new Graphics();
        mask.rect(0, 0, windowDef.width, windowDef.height);
        mask.fill(0xffffff);
        windowContainer.addChild(mask);

        // Create titlebar container
        const titlebar = new Container();
        titlebar.label = `Titlebar-${id}`;
        titlebar.position.set(0, 0);
        titlebar.zIndex = 1;

        // Titlebar background
        const titlebarBg = new Graphics();
        titlebarBg.rect(0, 0, windowDef.width, windowDef.titlebar.height);
        titlebarBg.fill(this.colorToHex(windowDef.titlebar.backgroundColor));
        titlebar.addChild(titlebarBg);

        // Titlebar text
        const titleText = new Text({
            text: windowDef.titlebar.title,
            style: {
                fontSize: 14,
                fill: 0xffffff,
            },
        });
        titleText.position.set(10, windowDef.titlebar.height / 2);
        titleText.anchor.set(0, 0.5);
        titlebar.addChild(titleText);

        // Optional close button
        let closeButton: Graphics | undefined;
        if (windowDef.titlebar.showCloseButton) {
            closeButton = new Graphics();
            closeButton.circle(0, 0, 6);
            closeButton.fill(0xff0000);
            closeButton.position.set(windowDef.width - 15, windowDef.titlebar.height / 2);
            closeButton.eventMode = 'static';
            closeButton.cursor = 'pointer';
            closeButton.on('pointerdown', () => {
                this.removeWindow(id);
            });
            titlebar.addChild(closeButton);
        }

        windowContainer.addChild(titlebar);

        // Create DragStore for titlebar dragging
        const dragStore = new DragStore({
            app: this.application,
            callbacks: {
                onDrag: (state) => {
                    const newX = state.initialItemX + state.deltaX;
                    const newY = state.initialItemY + state.deltaY;
                    this.updateWindowPosition(id, newX, newY);
                },
            },
        });

        // Make titlebar draggable
        titlebar.eventMode = 'static';
        titlebar.cursor = 'move';
        titlebar.on('pointerdown', (event) => {
            const currentWindow = this.value.windows.get(id);
            if (currentWindow) {
                dragStore.startDrag(id, event.globalX, event.globalY, currentWindow.x, currentWindow.y);
            }
        });

        // Create ResizerStore if window is resizable
        let resizerStore: ResizerStore | undefined;
        if (windowDef.resizable && windowDef.resizeMode) {
            resizerStore = new ResizerStore({
                container: windowContainer,
                rect: new Rectangle(0, 0, windowDef.width, windowDef.height),
                app: this.application,
                mode: windowDef.resizeMode,
                handleContainer: this.handleContainer,
                drawRect: (rect) => {
                    this.updateWindow(id, {
                        width: rect.width,
                        height: rect.height,
                    });
                },
            });
        }

        // Store components
        this.windowComponents.set(id, {
            container: windowContainer,
            background,
            titlebar,
            titleText,
            closeButton,
            mask,
            dragStore,
            resizerStore,
        });
    }

    /**
     * Update existing window components
     */
    private updateWindowComponents(components: WindowComponents, windowDef: WindowDef): void {
        // Update container position and zIndex
        components.container.position.set(windowDef.x, windowDef.y);
        components.container.zIndex = windowDef.zIndex;

        // Update background
        components.background.clear();
        components.background.rect(0, 0, windowDef.width, windowDef.height);
        components.background.fill(this.colorToHex(windowDef.backgroundColor));

        // Update mask
        components.mask.clear();
        components.mask.rect(0, 0, windowDef.width, windowDef.height);
        components.mask.fill(0xffffff);

        // Update titlebar
        const titlebarBg = components.titlebar.children[0] as Graphics;
        titlebarBg.clear();
        titlebarBg.rect(0, 0, windowDef.width, windowDef.titlebar.height);
        titlebarBg.fill(this.colorToHex(windowDef.titlebar.backgroundColor));

        // Update title text
        components.titleText.text = windowDef.titlebar.title;
        components.titleText.position.set(10, windowDef.titlebar.height / 2);

        // Update close button position if it exists
        if (components.closeButton) {
            components.closeButton.position.set(windowDef.width - 15, windowDef.titlebar.height / 2);
        }

        // Handle resizable state changes
        if (windowDef.resizable && windowDef.resizeMode && !components.resizerStore) {
            // Add resizer
            components.resizerStore = new ResizerStore({
                container: components.container,
                rect: new Rectangle(0, 0, windowDef.width, windowDef.height),
                app: this.application,
                mode: windowDef.resizeMode,
                drawRect: (rect) => {
                    this.updateWindow(windowDef.id, {
                        width: rect.width,
                        height: rect.height,
                    });
                },
            });
        } else if (!windowDef.resizable && components.resizerStore) {
            // Remove resizer
            components.resizerStore.removeHandles();
            components.resizerStore.cleanup();
            components.resizerStore = undefined;
        } else if (components.resizerStore) {
            // Update existing resizer rect
            components.resizerStore.setRect(new Rectangle(0, 0, windowDef.width, windowDef.height));
        }
    }

    /**
     * Destroy window components and cleanup
     */
    private destroyWindowComponents(components: WindowComponents): void {
        // Cleanup stores
        if (components.dragStore) {
            components.dragStore.cleanup();
        }
        if (components.resizerStore) {
            components.resizerStore.removeHandles();
            components.resizerStore.cleanup();
        }

        // Destroy graphics and text
        components.background.destroy();
        components.titleText.destroy();
        if (components.closeButton) {
            components.closeButton.destroy();
        }
        components.mask.destroy();
        components.titlebar.destroy();

        // Remove container from parent
        components.container.destroy();
    }

    /**
     * Cleanup all windows and remove ticker listeners
     */
    public override cleanup(): void {
        this.windowComponents.forEach((components) => {
            this.destroyWindowComponents(components);
        });
        this.windowComponents.clear();
        super.cleanup();
    }
}

