import {Application, Container} from 'pixi.js';
import {Forest} from "@wonderlandlabs/forestry4";
import {WindowDef, WindowDefSchema, WindowStoreValue, ZIndexData} from './types';
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
    container!: Container; // Parent container that holds both windowsContainer and handlesContainer
    windowsContainer!: Container; // Container for all windows
    handlesContainer!: Container; // Container for all resize handles (sibling to windowsContainer)

    constructor(config: WindowsManagerConfig) {
        super(
            {
                value: {
                    windows: new Map(), // if we don't need any further variables we may collapse this to a map
                },
                // @ts-ignore
                prep(next: WindowStoreValue) {
                    (this as WindowsManager).initNewWindows(next.windows);
                    return next;
                }
            }
        );
        this.app = config.app;
        this.#initContainers(config);
        this.initNewWindows(this.value.windows);
    }

    #initContainers(config: Partial<WindowsManagerConfig>) {
        const {container} = config

        if (!this.container && container) {
            this.container = container;
            this.container.label = 'WindowsManager';
        }
        this.container?.position.set(0, 0);

        // Create windowsContainer as a child of the main container
        // This will hold all the windows and be used for z-index management
        if (!this.windowsContainer) {
            this.windowsContainer = new Container();
            this.windowsContainer.label = 'windows';
            this.container?.addChild(this.windowsContainer);
        }

        // Create handlesContainer as a sibling to windowsContainer
        // Added after windowsContainer so it renders on top
        // This ensures handles are always visible regardless of window z-index
        if (!this.handlesContainer) {
            this.handlesContainer = new Container();
            this.handlesContainer.label = 'handles';
            this.container?.addChild(this.handlesContainer);
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
                this.#removeWindowBranch(key);
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
        }, this.app) as unknown as WindowStore;

        branch.set('isDirty', true);
        this.#windowsBranches.set(key, branch);
        branch.application = this.app;
        branch.handlesContainer = this.handlesContainer; // Pass shared handles container
        branch.kickoff();
        return branch;
    }

    #windowsBranches = new Map<string, WindowStore>();

    windowBranch(id: string) {
        return this.#windowsBranches.get(id);
    }

    #flattenZIndices(): ZIndexData[] {
        const sortedWindows: Omit<ZIndexData, 'zIndexFlat'>[] = Array.from(this.#windowsBranches.entries())
            .map(([id, branch]) => ({
                id,
                branch,
                zIndex: branch.value.zIndex
            }))
            .sort((a, b) => a.zIndex - b.zIndex);

        return sortedWindows.map((data, index) => {
            return {...data, zIndexFlat: index}
        })
    }


    /**
     * Update z-indices of all windows to respect their zIndex property
     */
    updateZIndices() {
        // Get all window branches and sort by zIndex
        const indices = this.#flattenZIndices()
        let maxIndex = 0;
        // Apply the sorted order using setChildIndex
        indices.forEach(({branch, zIndexFlat}) => {
            const branchStore = branch as WindowStore;
            maxIndex = Math.max(maxIndex, zIndexFlat);
            if (branchStore.rootContainer && this.windowsContainer.children.includes(branchStore.rootContainer)) {
                try {
                    this.windowsContainer.setChildIndex(branchStore.rootContainer, zIndexFlat);
                } catch (err) {
                }
            }
        });
    }

    #removeWindowBranch(id: string) {
        if (this.#windowsBranches.has(id)) {
            this.#windowsBranches.get(id)?.cleanup();
            this.#windowsBranches.delete(id);
        }
    }

    /**
     * Remove a window
     */
    removeWindow(id: string) {
        this.#removeWindowBranch(id);
        this.mutate((draft) => {
            draft.windows.delete(id);
        });
    }
}

