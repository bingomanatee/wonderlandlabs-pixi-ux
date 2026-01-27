import {Application, Container} from 'pixi.js';
import {Forest} from "@wonderlandlabs/forestry4";

import {WindowDef, WindowDefSchema, WindowStoreValue} from './types';
import {WindowStore} from "./WindowStore";

export interface WindowsManagerConfig {
    app: Application;
    container: Container;
    handleContainer?: Container;
}

/**
 * WindowsManager manages multiple windows as a collection of WindowStore branches.
 * Each window is a TickerForest branch that handles its own dirty tracking and rendering.
 */
export class WindowsManager extends Forest<WindowStoreValue> {
    app: Application;
    container: Container;
    handleContainer?: Container;

    constructor(config: WindowsManagerConfig) {
        super(
            {
                value: {
                    windows: new Map(), // if we don't need any further variables we may collapse this to a map
                },
                prep(next: WindowStoreValue) {
                    const self = this as WindowsManager;
                    self.initNewWindows(next.windows);

                    return next;
                }
            }
        );
        this.app = config.app;
        this.#initContainers(config);
        this.initNewWindows(this.value.windows);
    }

    #initContainers(config: Partial<WindowsManagerConfig>) {
        const {container, handleContainer} = config

        if (!this.container && container) {
            this.container = container;
            this.container.label = 'windows';
        }
        this.container?.position.set(0, 0);

        if (!this.handleContainer && handleContainer) {
            this.handleContainer = handleContainer;
            this.handleContainer.label = 'handles';
        }
        if (this.container && this.handleContainer) {
            this.container.removeChild(this.handleContainer);
            this.container.addChild(this.handleContainer);
        }
    }

    initNewWindows(nextWindows: Map<string, WindowDef>) {
        for (const key of nextWindows?.keys()) {
            if (!this.value.windows.has(key)) {
                queueMicrotask(() => {
                    this.initWindow(key);
                })
            }

        }
        for (const key of this.value.windows.keys()) {
            if (!nextWindows.has(key)) {
                this.removeWindow(key, true);
            }
        }
    }

    addWindow(key: string, value: Partial<WindowDef>) {
        this.set(['windows', key], WindowDefSchema.parse({id: key, ...value}));
    }

    /**
     * this is called _after_ the window data has been injected
     * @param key string
     */
    initWindow(key: string) {
        if (this.#windowsBranches.has(key)) {
            console.warn('attempt to recreate existing branch ' + key);
            return this.#windowsBranches.get(key)!;
        }

        // @ts-ignore
        const branch = this.$branch<WindowDef, WindowStore>(['windows', key], {
            subclass: WindowStore,
        }) as unknown as WindowStore;

        branch.set('isDirty', true);
        this.#windowsBranches.set(key, branch);
        branch.application = this.app;
        branch.kickoff();
        return branch;
    }

    #windowsBranches = new Map<string, WindowStore>();

    windowBranch(id: string) {
        return this.#windowsBranches.get(id);
    }

    /**
     * Remove a window
     */
    removeWindow(id: string, noMutate = false) {
        if (this.#windowsBranches.has(id)) {
            this.#windowsBranches.get(id)?.cleanup();
            this.#windowsBranches.delete(id);
        }

        if (!noMutate) {
            this.mutate((draft) => {
                draft.windows.delete(id);
            });
        }
    }
}

