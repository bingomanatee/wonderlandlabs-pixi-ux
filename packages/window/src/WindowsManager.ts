import {Application, Container} from 'pixi.js';
import {Forest} from "@wonderlandlabs/forestry4";
import {WindowDef, WindowDefInput, WindowDefSchema, WindowStoreClass, WindowStoreValue, ZIndexData, PartialWindowStyle} from './types';
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
                    selected: new Set(),
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

    addWindow(key: string, value: Omit<WindowDefInput, 'id'>) {
        // Extract customStyle and storeClass before parsing (they're not part of the schema)
        const {customStyle, storeClass, ...windowDef} = value;
        if (customStyle) {
            this.#customStyles.set(key, customStyle);
        }
        if (storeClass) {
            this.#storeClasses.set(key, storeClass);
        }
        this.set(['windows', key], WindowDefSchema.parse({...windowDef, id: key}));
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

        // Use custom store class if provided, otherwise default to WindowStore
        const StoreClass = this.#storeClasses.get(key) || WindowStore;

        // @ts-ignore
        const branch = this.$branch<WindowDef, WindowStore>(['windows', key], {
            subclass: StoreClass,
        }, this.app) as unknown as WindowStore;

        branch.set('isDirty', true);
        this.#windowsBranches.set(key, branch);
        branch.application = this.app;
        branch.handlesContainer = this.handlesContainer; // Pass shared handles container

        // Pass custom style if available
        const customStyle = this.#customStyles.get(key);
        if (customStyle) {
            branch.customStyle = customStyle;
        }

        branch.kickoff();

        // Add content container to content map
        this.#contentMap.set(key, branch.contentContainer);

        return branch;
    }

    #windowsBranches = new Map<string, WindowStore>();
    #contentMap = new Map<string, Container>();
    #customStyles = new Map<string, PartialWindowStyle>();
    #storeClasses = new Map<string, WindowStoreClass>();

    windowBranch(id: string) {
        return this.#windowsBranches.get(id);
    }

    /**
     * Get the content container for a specific window
     */
    getContentContainer(id: string): Container | undefined {
        return this.#contentMap.get(id);
    }

    /**
     * Get all content containers
     */
    get contentMap(): ReadonlyMap<string, Container> {
        return this.#contentMap;
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
        // Remove from content map
        this.#contentMap.delete(id);
    }

    /**
     * Remove a window
     */
    removeWindow(id: string) {
        this.#removeWindowBranch(id);
        this.mutate((draft) => {
            draft.windows.delete(id);
            draft.selected.delete(id); // Remove from selection if selected
        });
    }

    /**
     * Refresh window for selection border update
     */
    #refreshWindowSelection(id: string) {
        const windowStore = this.#windowsBranches.get(id);
        if (windowStore) {
            windowStore.set('isDirty', true);
            windowStore.queueResolve();
        }
    }

    /**
     * Select a window (adds to selection set)
     */
    selectWindow(id: string) {
        if (this.value.windows.has(id)) {
            this.mutate((draft) => {
                draft.selected.add(id);
            });
            this.#refreshWindowSelection(id);
        }
    }

    /**
     * Deselect a window (removes from selection set)
     */
    deselectWindow(id: string) {
        this.mutate((draft) => {
            draft.selected.delete(id);
        });
        this.#refreshWindowSelection(id);
    }

    /**
     * Set the selection to a single window (clears other selections)
     */
    setSelectedWindow(id: string) {
        if (this.value.windows.has(id)) {
            // Get previously selected windows to refresh them
            const previouslySelected = Array.from(this.value.selected);

            this.mutate((draft) => {
                draft.selected.clear();
                draft.selected.add(id);
            });

            // Refresh all affected windows
            previouslySelected.forEach(prevId => this.#refreshWindowSelection(prevId));
            this.#refreshWindowSelection(id);
        }
    }

    /**
     * Set the selection to multiple windows (clears other selections)
     */
    setSelectedWindows(ids: string[]) {
        // Get previously selected windows to refresh them
        const previouslySelected = Array.from(this.value.selected);

        this.mutate((draft) => {
            draft.selected.clear();
            ids.forEach(id => {
                if (draft.windows.has(id)) {
                    draft.selected.add(id);
                }
            });
        });

        // Refresh all affected windows
        const allAffected = new Set([...previouslySelected, ...ids]);
        allAffected.forEach(id => this.#refreshWindowSelection(id));
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        const previouslySelected = Array.from(this.value.selected);
        this.mutate((draft) => {
            draft.selected.clear();
        });
        previouslySelected.forEach(id => this.#refreshWindowSelection(id));
    }

    /**
     * Check if a window is selected
     */
    isWindowSelected(id: string): boolean {
        return this.value.selected.has(id);
    }

    /**
     * Get all selected window IDs
     */
    getSelectedWindows(): ReadonlySet<string> {
        return this.value.selected;
    }

    /**
     * Toggle window selection
     */
    toggleWindowSelection(id: string) {
        if (this.value.windows.has(id)) {
            const wasSelected = this.value.selected.has(id);
            this.mutate((draft) => {
                if (draft.selected.has(id)) {
                    draft.selected.delete(id);
                } else {
                    draft.selected.add(id);
                }
            });
            this.#refreshWindowSelection(id);
        }
    }
}

