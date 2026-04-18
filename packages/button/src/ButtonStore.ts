import {
    BoxStore,
    boxTreeToPixi,
    type BoxPixiRenderInput,
    type BoxPixiRendererOverride,
} from '@wonderlandlabs-pixi-ux/box';
import {TickerForest} from '@wonderlandlabs-pixi-ux/ticker-forest';
import type {StyleTree} from '@wonderlandlabs-pixi-ux/style-tree';
import {
    Application,
    Container,
    Rectangle,
} from 'pixi.js';
import type {ButtonOptionsType, ButtonStateType, EventFn} from './types.js';
import {getStyleTree, makeStoreConfig} from "./helpers.js";
import {
    EVENT_POINTER_OUT,
    EVENT_POINTER_OVER,
    EVENT_POINTER_TAP,
} from './constants.js';

type ButtonRendererManifest = {
    byId: Record<string, BoxPixiRendererOverride>;
};

export class ButtonStore extends TickerForest<ButtonStateType> {
    #boxStore: BoxStore;
    #styleTree: StyleTree;
    #renderer: ButtonRendererManifest;
    #options: ButtonOptionsType;
    #boundHosts = new WeakSet<Container>();

    constructor(value: ButtonStateType, options: ButtonOptionsType) {
        const container = new Container({
            x: value.size?.x ?? 0,
            y: value.size?.y ?? 0,
        });
        super({value: {...value, isHovered: value.isHovered ?? false}}, {
            app: options.app as unknown as Application,
            container,
        });

        this.#options = options;
        this.#styleTree = getStyleTree(value.variant, options);
        this.#renderer = this.#makeRendererManifest();

        this.#boxStore = new BoxStore(makeStoreConfig(this.value, this.#styleTree));
        this.#boxStore.styles = this.#styleTree;
        this.resolve();
    }

    #makeRendererManifest(): ButtonRendererManifest {
        return {
            byId: {
                'button-background': {
                    renderer: this.$.containerPostRenderer as BoxPixiRendererOverride['renderer'],
                    post: true,
                },
            },
        };
    }

    containerPostRenderer(input: BoxPixiRenderInput): Container {
        const currentContainer = input.local.currentContainer!;
        currentContainer.eventMode = this.value.isDisabled ? 'none' : 'static';
        currentContainer.cursor = this.value.isDisabled ? 'default' : 'pointer';
        currentContainer.hitArea = new Rectangle(0, 0, input.local.localLocation.w, input.local.localLocation.h);

        if (!this.#boundHosts.has(currentContainer)) {
            currentContainer.on(EVENT_POINTER_OVER, this.$.onPointerOver);
            currentContainer.on(EVENT_POINTER_OUT, this.$.onPointerOut);
            currentContainer.on(EVENT_POINTER_TAP, this.$.onPointerTap);
            this.#boundHosts.add(currentContainer);
        }

        return currentContainer;
    }

    onPointerOver(): void {
        if (!this.value.isDisabled && !this.value.isHovered) {
            this.set('isHovered', true);
        }
    }

    onPointerOut(): void {
        if (this.value.isHovered) {
            this.set('isHovered', false);
        }
    }

    onPointerTap(): void {
        if (!this.value.isDisabled) {
            this.#getHandler('click', 'tap')();
        }
    }

    #getHandler(...names: string[]): EventFn {
        for (const name of names) {
            const handler = this.#options.handlers[name];
            if (typeof handler === 'function') {
                return handler as EventFn;
            }
        }
        return () => {};
    }

    resolve() {
        this.#boxStore.mutate((draft) => {
            Object.assign(draft, makeStoreConfig(this.value, this.#styleTree).value);
        });
        this.#boxStore.update();
        boxTreeToPixi({
            root: this.#boxStore.value,
            app: this.#options.app as unknown as Application,
            parentContainer: this.container,
            store: this.#boxStore,
            styleTree: this.#styleTree,
            renderers: this.#renderer,
        } as never);
    }
}
