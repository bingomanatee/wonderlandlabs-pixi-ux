import {TickerForest} from "@forestry-pixi/ticker-forest";
import type {WindowDef} from "./types";
import {Application, Container, Graphics} from "pixi.js";
import {WindowsManager} from "./WindowsManager";
import rgbToColor from "./rgbToColor";
import {DragStore} from "@forestry-pixi/drag";
import {StoreParams} from "@wonderlandlabs/forestry4";
import {TitlebarStore} from "./TitlebarStore";
import {distinctUntilChanged, map} from "rxjs";
import {isEqual} from "lodash-es";
import {TITLEBAR_MODE} from "./constants";

export class WindowStore extends TickerForest<WindowDef> {

    constructor(config: StoreParams<WindowDef>, app: Application) {
        super(config, app);
        if (app) {
            this.kickoff();
        }
    }

    resolveComponents(parentContainer?: Container) {
        console.log('windowStore:resolveComponents');
        this.#refreshRoot();
        this.#refreshBackground();
        this.#refreshTitlebar();
        parentContainer?.addChild(this.#rootContainer!);
    }

    #dragStore?: DragStore;
    #titlebarStore?: TitlebarStore;
    #hoverEnterHandler?: () => void;
    #hoverLeaveHandler?: () => void;

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
                            // @TODO: localize?
                            if (pos) {
                                self.#rootContainer?.position.set(pos.x, pos.y);
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

    #refreshTitlebar() {
        const {titlebar} = this.value;

        if (!this.#titlebarStore) {
            if (!this.value.titlebar) {
                console.error('no titlebar def');
            }
            // Create titlebar store as a branch using $branch
            // @ts-ignore
            this.#titlebarStore = this.$branch(['titlebar'], {
                subclass: TitlebarStore,
                value: {
                    ...titlebar,
                    isDirty: true,
                }
            }, this.application) as unknown as TitlebarStore;
            if (this.#rootContainer) {
                this.#titlebarStore.application = this.application;
                this.#titlebarStore.kickoff();
            }

            const self = this;

            // Width subscription
            this.#titlebarStore.widthSubscription = this.$subject.pipe(
                map((v) => {
                    if (!v) {
                        console.warn('no value');
                        return 0;
                    }
                    return v.width;
                }),
                distinctUntilChanged()
            ).subscribe(() => {
                self.#titlebarStore?.set('isDirty', true);
                self.#titlebarStore?.queueResolve()
            });
            this.#titlebarStore.addHoverForTitlebar();
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
                if (rootStore?.container) {
                    this.resolveComponents(rootStore.container);
                    rootStore.updateZIndices();
                }
            }
        }
    }

}