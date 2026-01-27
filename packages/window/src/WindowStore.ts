import {TickerForest} from "@forestry-pixi/ticker-forest";
import type {WindowDef} from "./types";
import {Color, Container, Graphics} from "pixi.js";
import {WindowsManager} from "./WindowsManager";

export class WindowStore extends TickerForest<WindowDef> {

    constructor(config, app) {
        super(config, app);
    }

    resolveComponents(parentContainer?: Container) {
        this.#refreshRoot();
        this.#refreshBackground();
        parentContainer?.addChild(this.#root!);
    }

    #refreshRoot() {
        const {x, y} = this.value;

        if (!this.#root) {
            this.#root = new Container({
                position: {x, y}
            });
        } else {
            this.#root.position.set(x, y);
        }
    }

    #refreshBackground() {
        const {width, height, backgroundColor} = this.value;

        if (!this.#background) {
            this.#background = new Graphics();
            this.#root?.addChildAt(this.#background, 0);
        } else {
            this.#background.clear();
        }

        this.#background.rect(0, 0, width, height)
            .fill({backgroundColor: new Color(backgroundColor)});

    }

    #root?: Container;
    #background?: Graphics;

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
                }
            }
        }
    }

}