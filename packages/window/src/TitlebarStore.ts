import {TickerForest} from "@forestry-pixi/ticker-forest";
import type {TitlebarConfig} from "./types";
import type {Application} from "pixi.js";
import {Container, Graphics, Text} from "pixi.js";
import {StoreParams} from "@wonderlandlabs/forestry4";
import rgbToColor from "./rgbToColor";
import type {Subscription} from "rxjs";
import {TITLEBAR_MODE} from "./constants";
import {WindowStore} from "./WindowStore";

interface TitlebarStoreValue extends TitlebarConfig {
    isDirty: boolean;
    isVisible: boolean;
}

export class TitlebarStore extends TickerForest<TitlebarStoreValue> {

    #container?: Container;
    #background?: Graphics;
    #titleText?: Text;
    widthSubscription?: Subscription;
    configSubscription?: Subscription;

    constructor(config: StoreParams<TitlebarStoreValue>, app: Application) {
        super({
            // @ts-ignore
            ...config, prep(next: TitlebarStoreValue) {
                if (!next) {
                    return next;
                }
                if (!this.value && next) {
                    queueMicrotask(() => {
                        (this as TitlebarStore).queueResolve();
                    })
                    return {...next, isDirty: true};
                }
                let nonDirtyChanged: false | string = false;
                Array.from(Object.keys(next)).forEach((key) => {
                    if (key === 'isDirty') {
                        return;
                    }
                    // @ts-ignore
                    if (next[key] !== (this as TitlebarStore).value[key]) {
                        console.log('changed field:', key);
                        nonDirtyChanged = `${key}`;
                    }
                });
                if (nonDirtyChanged) {
                    queueMicrotask(() => {
                        (this as TitlebarStore).queueResolve();
                    });
                    return {...next, isDirty: true};
                }
                return next
            }
        }, app);
        if (!this.application) {
            if (this.$parent?.application) {
                this.application = this.$parent.application;
            }
        }
        if (this.application) {
            this.kickoff();
        }
    }

    #hoverAdded = false;
    addHover() {
        if (this.#hoverAdded) return;
        const windowStore = this.$parent as WindowStore;
        const titlebar = this.value;
        // Set up hover listeners for ON_HOVER mode
        if (titlebar.mode === TITLEBAR_MODE.ON_HOVER && windowStore.rootContainer) {
            console.info('hover hooks');
            windowStore.rootContainer?.on('pointerenter', () => {
                this.mutate((draft) => {
                    draft.isVisible = true;
                })
            });
            windowStore.rootContainer?.on('pointerleave', () => {
                this.mutate((draft) => {
                    draft.isVisible = false;
                })
            });
            this.set('isVisible', false);
        } else {
            this.set('isVisible', true);
        }
        this.#hoverAdded = true;
    }

    get parentContainer() {
        const parent = this.$parent as WindowStore;
        return parent?.rootContainer;
    }

    resolveComponents() {
        this.#refreshContainer();
        this.#refreshBackground();
        this.#refreshTitle();
    }

    #contentContainer?: Container;
    #refreshContainer() {
        if (!this.#container) {
            this.#container = new Container({
                label: 'titlebar',
                position: {x: 0, y: 0}
            });
            this.parentContainer?.addChild(this.#container);
        }
        if (!this.#contentContainer) {
            this.#contentContainer = new Container({x: this.value.padding ?? 0,
            y: this.value.height/2 + this.value.padding});
            this.#container?.addChild(this.#contentContainer);
        }
        this.#container!.visible = this.value.isVisible;
    }

    #refreshBackground() {
        const {height, backgroundColor} = this.value;
        const width = (this.$parent?.value as any)?.width || 0;

        if (!this.#background) {
            this.#background = new Graphics();
            this.#container?.addChildAt(this.#background, 0);
        } else {
            this.#background.clear();
        }

        this.#background.rect(0, 0, width, height)
            .fill(rgbToColor(backgroundColor));
    }

    #refreshTitle() {
        const {title, fontSize, textColor} = this.value;
        const {zIndex} = (this.$parent! as WindowStore).value;
        if (!this.#titleText) {
            this.#titleText = new Text({
                text: title,
                style: {
                    fontSize: fontSize,
                    fill: rgbToColor(textColor),
                },
            });
            this.#contentContainer?.addChild(this.#titleText);
        }
        this.#titleText.text = `${title} [${zIndex}]`;
        this.#titleText.style.fontSize = fontSize;
        this.#titleText.style.fill = rgbToColor(textColor);
        this.#titleText.y = -0.66 * fontSize;
    }

    protected isDirty(): boolean {
        return this.value.isDirty;
    }

    protected clearDirty(): void {
        this.set('isDirty', false);
    }

    protected resolve(): void {
        if (this.isDirty()) {
            this.resolveComponents();
        } else {
            console.warn('resolve - not dirty');
        }
    }

    cleanup(): void {
        super.cleanup();

        // Unsubscribe from width changes
        if (this.widthSubscription) {
            this.widthSubscription.unsubscribe();
            this.widthSubscription = undefined;
        }

        // Unsubscribe from config changes
        if (this.configSubscription) {
            this.configSubscription.unsubscribe();
            this.configSubscription = undefined;
        }

        if (this.#container) {
            this.parentContainer?.removeChild(this.#container);
            this.#container.destroy({children: true});
            this.#container = undefined;
        }
    }
}

