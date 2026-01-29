import {TickerForest} from "@forestry-pixi/ticker-forest";
import type {WindowDef} from "./types";
import {Application, Container, Graphics, Rectangle} from "pixi.js";
import {WindowsManager} from "./WindowsManager";
import rgbToColor from "./rgbToColor";
import {DragStore} from "@forestry-pixi/drag";
import {StoreParams} from "@wonderlandlabs/forestry4";
import {TitlebarStore} from "./TitlebarStore";
import {ResizerStore} from "@forestry-pixi/resizer";

export class WindowStore extends TickerForest<WindowDef> {
    handlesContainer?: Container; // Shared container for resize handles

    constructor(config: StoreParams<WindowDef>, app: Application) {
        super(config, app);
        this.#initTitlebar();
        if (app) {
            this.kickoff();
        }
    }

    #initTitlebar() {
        if (!this.value.titlebar) {
            console.error('no titlebar def');
        }
        // Create titlebar store as a branch using $branch
        // @ts-ignore
        this.#titlebarStore = this.$branch(['titlebar'], {
            subclass: TitlebarStore,
        }, this.application) as unknown as TitlebarStore;
        this.#titlebarStore.application = this.application;

        const self = this;

        // Width subscription
        let width = this.value?.width;
        self.subscribe({
            next(w) {
                console.log('width observer', w, 'direct = ', self.value)
                if (w?.width === width) {
                    return;
                }
                width = w?.width;
                self.#titlebarStore?.set('isDirty', true);
                self.#titlebarStore?.queueResolve()
            }, error(e) {
                console.log('width error', e)
            }, complete() {
                console.log('widnows store - completed')
            }
        });
    }

    resolveComponents(parentContainer?: Container, handlesContainer?: Container) {
        console.log('windowStore:resolveComponents');
        this.#refreshRoot();
        this.#refreshBackground();
        this.#refreshTitlebar();
        // Add container to parent BEFORE creating resizer (resizer needs parent to exist)
        parentContainer?.addChild(this.#rootContainer!);
        this.#refreshResizer(handlesContainer);
    }

    #dragStore?: DragStore;
    #titlebarStore?: TitlebarStore;
    #resizerStore?: ResizerStore;

    #refreshRoot() {
        const {x, y, isDraggable} = this.value;

        if (!this.#rootContainer) {
            this.#rootContainer = new Container({
                eventMode: "static",
                position: {x, y}
            });

            const self = this;

            // Only add drag behavior if isDraggable is true
            if (isDraggable) {
                this.#dragStore = new DragStore({
                    app: this.application,
                    callbacks: {
                        onDragStart() {
                        },
                        onDrag(state) {
                            const pos = self.#dragStore?.getCurrentItemPosition();
                            if (pos) {
                                self.#rootContainer?.position.set(pos.x, pos.y);
                                // Update resizer rect to match new position
                                if (self.#resizerStore) {
                                    self.#resizerStore.setRect(new Rectangle(
                                        pos.x,
                                        pos.y,
                                        self.value.width,
                                        self.value.height
                                    ));
                                }
                            }
                        },
                        onDragEnd() {
                            self.#rootContainer!.cursor = 'grab';
                        },
                    },
                });

                this.#rootContainer.cursor = 'grab';
                this.#rootContainer.on('pointerdown', (event) => {
                    event.stopPropagation();
                    self.#rootContainer!.cursor = 'grabbing';

                    // Start drag with current container position
                    self.#dragStore!.startDragContainer(
                        self.value.id,
                        event, self.#rootContainer!
                    );
                });
            }
        } else {
            this.#rootContainer.position.set(x, y);
        }
    }

    #refreshBackground() {
        const {width, height, backgroundColor} = this.value;

        if (!this.#background) {
            this.#background = new Graphics();
            this.#rootContainer?.addChildAt(this.#background, 0);
        } else {
            this.#background.clear();
        }

        this.#background.rect(0, 0, width, height)
            .fill(rgbToColor(backgroundColor));

    }

    #tbKicked = false;
    #refreshTitlebar() {
        if (!this.#tbKicked) {
            this.#titlebarStore?.kickoff();
            this.#tbKicked = true;
        }
        this.#titlebarStore?.addHover();
    }

    #refreshResizer(handlesContainer?: Container) {
        const {isResizeable, width, height, x, y, resizeMode, minWidth, minHeight} = this.value;

        // Remove existing resizer if isResizeable is false
        if (!isResizeable && this.#resizerStore) {
            this.#resizerStore.removeHandles();
            this.#resizerStore = undefined;
            return;
        }

        // Create resizer if isResizeable is true and it doesn't exist
        if (isResizeable && !this.#resizerStore && this.#rootContainer) {
            const self = this;

            this.#resizerStore = new ResizerStore({
                container: this.#rootContainer,
                handleContainer: handlesContainer,
                rect: new Rectangle(x, y, width, height),
                app: this.application,
                mode: resizeMode || 'ONLY_CORNER',
                size: 8,
                color: {r: 0.3, g: 0.6, b: 1},
                drawRect: (rect: Rectangle) => {
                    // Update window dimensions when resizing
                    self.mutate((draft) => {
                        draft.width = Math.max(rect.width, minWidth || 50);
                        draft.height = Math.max(rect.height, minHeight || 50);
                        draft.isDirty = true;
                    });
                },
                onRelease: (rect: Rectangle) => {
                    // Final update when resize is complete
                    self.mutate((draft) => {
                        draft.width = Math.max(rect.width, minWidth || 50);
                        draft.height = Math.max(rect.height, minHeight || 50);
                        draft.x = rect.x;
                        draft.y = rect.y;
                        draft.isDirty = true;
                    });
                    self.queueResolve();
                }
            });
        }

        // Update resizer rect if dimensions changed externally
        if (this.#resizerStore) {
            const currentRect = this.#resizerStore.value.rect;
            if (currentRect.width !== width || currentRect.height !== height) {
                this.#resizerStore.setRect(new Rectangle(0, 0, width, height));
            }
        }
    }

    #rootContainer?: Container;
    #background?: Graphics;

    /**
     * Get the rootContainer container for this window (needed for z-index management)
     */
    get rootContainer(): Container | undefined {
        return this.#rootContainer;
    }

    protected isDirty(): boolean {
        return this.value.isDirty;
    }

    protected clearDirty(): void {
        this.set('isDirty', false);
    }

    protected resolve(): void {
        if (this.isDirty()) {
            if (!this.$isRoot) {
                const rootStore = this.$root as unknown as WindowsManager;
                if (rootStore?.windowsContainer) {
                    this.resolveComponents(rootStore.windowsContainer, rootStore.handlesContainer);
                    rootStore.updateZIndices();
                }
            }
        }
    }

    cleanup(): void {
        super.cleanup();

        // Cleanup drag store
        if (this.#dragStore) {
            this.#dragStore.cleanup();
            this.#dragStore = undefined;
        }

        // Cleanup titlebar store
        if (this.#titlebarStore) {
            this.#titlebarStore.cleanup();
            this.#titlebarStore = undefined;
        }

        // Cleanup resizer store
        if (this.#resizerStore) {
            this.#resizerStore.removeHandles();
            this.#resizerStore.cleanup();
            this.#resizerStore = undefined;
        }

        // Cleanup containers
        if (this.#rootContainer) {
            this.#rootContainer.destroy({children: true});
            this.#rootContainer = undefined;
        }

        this.#background = undefined;
    }

}