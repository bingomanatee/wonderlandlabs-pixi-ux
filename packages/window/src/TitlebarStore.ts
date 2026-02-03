import {TickerForest} from "@forestry-pixi/ticker-forest";
import type {RenderTitlebarFn, TitlebarConfig} from "./types";
import type {Application} from "pixi.js";
import {Assets, Container, Graphics, Sprite, Text} from "pixi.js";
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
    // Optional custom render function
    renderTitlebar?: RenderTitlebarFn;

    // Pixi components - created in property definitions
    #container: Container = new Container({
        label: 'titlebar',
        position: {x: 0, y: 0},
        sortableChildren: true,  // Enable zIndex sorting
        eventMode: 'static'
    });
    #contentContainer: Container = new Container({
        x: 0,
        y: 0
    });
    #background: Graphics = new Graphics({label: 'backgroundGraphics'});
    #titleText: Text = new Text({
        text: '',
        style: {
            fontSize: 14,
            fill: 0xffffff,
        },
    });
    #iconSprite?: Sprite;
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
            const parent = this.$parent as WindowStore | undefined;
            if (parent?.application) {
                this.application = parent.application;
            }
        }
        if (this.application) {
            this.kickoff();
        } else {
            console.error('no app - cannot kick off')
        }
    }

    #hoverAdded = false;

    addHover() {
        if (this.#hoverAdded) {
            return;
        }
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

    /**
     * Get the titlebar container (for drag handling)
     */
    get container(): Container {
        return this.#container;
    }

    resolveComponents() {
        this.#refreshContainer();
        this.#refreshBackground();
        this.#refreshIcon();
        this.#refreshTitle();

        // Call custom render function if provided
        if (this.renderTitlebar) {
            const windowStore = this.$parent as WindowStore;
            this.renderTitlebar(this, windowStore.value, this.#contentContainer);
        }
    }

    #refreshContainer() {
        const {padding, height} = this.value;

        // Add to parent if not already added
        if (!this.#container.parent) {
            this.parentContainer?.addChild(this.#container);
            // Use zIndex to ensure titlebar is above content (background=0, content=1, titlebar=2)
            this.#container.zIndex = 2;
        }

        // Add content container if not already added
        if (!this.#contentContainer.parent) {
            this.#container.addChild(this.#contentContainer);
        }

        // Update content container position
        this.#contentContainer.x = padding ?? 0;
        this.#contentContainer.y = height / 2 + (padding ?? 0);

        // Update visibility
        this.#container.visible = this.value.isVisible;
        console.log('tb refreshed')
    }

    #refreshBackground() {
        const {height, backgroundColor} = this.value;
        const windowStore = this.$parent as WindowStore;
        const width = windowStore?.value?.width || 0;

        // Add to container if not already added
        if (!this.#background.parent) {
            this.#container.addChild(this.#background);
            this.#background.zIndex = 0;  // Background layer
        }

        // Use style titlebar color if variant is set, otherwise use explicit backgroundColor
        const style = windowStore?.resolvedStyle;
        const bgColor = windowStore?.value?.variant ? style?.titlebarBackgroundColor : backgroundColor;

        // Update graphics
        this.#background.clear();
        const color = rgbToColor(bgColor ?? backgroundColor);
        this.#background.rect(0, 0, width, height)
            .fill(color);
    }

    #refreshIcon() {
        const {icon, height, padding} = this.value;

        if (!icon) {
            // Remove icon if it exists but no icon config
            if (this.#iconSprite?.parent) {
                this.#contentContainer.removeChild(this.#iconSprite);
                this.#iconSprite.destroy();
                this.#iconSprite = undefined;
            }
            return;
        }

        // Load and display icon
        if (!this.#iconSprite) {
            Assets.load(icon.url).then((texture) => {
                if (!this.#iconSprite) {
                    this.#iconSprite = new Sprite(texture);
                    this.#iconSprite.width = icon.width;
                    this.#iconSprite.height = icon.height;
                    this.#iconSprite.zIndex = 2;
                    this.#contentContainer.addChild(this.#iconSprite);
                    // Position icon vertically centered
                    this.#iconSprite.y = -(icon.height / 2);
                }
            });
        } else {
            // Update existing icon
            this.#iconSprite.width = icon.width;
            this.#iconSprite.height = icon.height;
            this.#iconSprite.y = -(icon.height / 2);
        }
    }

    #refreshTitle() {
        const {title, fontSize, textColor, icon} = this.value;
        const windowStore = this.$parent as WindowStore;
        const {zIndex} = windowStore.value;

        // Add to content container if not already added
        if (!this.#titleText.parent) {
            this.#contentContainer.addChild(this.#titleText);
            this.#titleText.zIndex = 1;  // Above background
        }

        // Use style text color if variant is set, otherwise use explicit textColor
        const style = windowStore?.resolvedStyle;
        const txtColor = windowStore?.value?.variant ? style?.titlebarTextColor : textColor;

        // Update text properties
        this.#titleText.text = `${title} [${zIndex}]`;
        this.#titleText.style.fontSize = fontSize;
        this.#titleText.style.fill = rgbToColor(txtColor ?? textColor);
        this.#titleText.y = -0.66 * fontSize;

        // Offset title if icon is present
        const iconOffset = icon ? (icon.width + 4) : 0;
        this.#titleText.x = iconOffset;
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
            // Note: #container is not set to undefined since it's typed as non-optional
            // The destroy() call handles cleanup
        }
    }
}

