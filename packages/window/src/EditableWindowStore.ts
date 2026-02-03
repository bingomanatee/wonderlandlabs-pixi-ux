import {WindowStore} from "./WindowStore";
import {WindowDef} from "./types";
import {Application, Container} from "pixi.js";
import {StoreParams} from "@wonderlandlabs/forestry4";
import {WindowsManager} from "./WindowsManager";

/**
 * Alpha value for non-selected windows when another window is selected (modal mode)
 */
const UNSELECTED_ALPHA = 0.15;

/**
 * EditableWindowStore extends WindowStore with modal selection behavior:
 * - When this window is selected, other windows fade to 15% alpha and become unselectable
 * - Content mask is disabled when selected (content can overflow)
 * - Provides hooks for toolbar integration
 */
export class EditableWindowStore extends WindowStore {
    constructor(config: StoreParams<WindowDef>, app: Application) {
        super(config, app);
    }

    /**
     * Check if this window is currently selected
     */
    get isSelected(): boolean {
        const rootStore = this.$root as unknown as WindowsManager;
        return rootStore?.isWindowSelected?.(this.value.id) ?? false;
    }

    /**
     * Check if any window in the manager is selected (modal mode active)
     */
    get isModalModeActive(): boolean {
        const rootStore = this.$root as unknown as WindowsManager;
        if (!rootStore?.getSelectedWindows) return false;
        return rootStore.getSelectedWindows().size > 0;
    }

    /**
     * Override resolveComponents to apply modal selection behavior
     */
    resolveComponents(parentContainer?: Container, handlesContainer?: Container) {
        super.resolveComponents(parentContainer, handlesContainer);
        this.#applyModalState();
    }

    /**
     * Apply modal selection state - fade and disable if not selected while modal is active
     */
    #applyModalState() {
        const isSelected = this.isSelected;
        const isModalActive = this.isModalModeActive;

        if (!isModalActive) {
            // No selection - restore normal state
            this.rootContainer.alpha = 1;
            this.rootContainer.eventMode = 'static';
        } else if (isSelected) {
            // This window is selected - keep normal, disable mask
            this.rootContainer.alpha = 1;
            this.rootContainer.eventMode = 'static';
            // Content mask is already handled in WindowStore's #refreshContentMask
        } else {
            // Another window is selected - fade and disable this one
            this.rootContainer.alpha = UNSELECTED_ALPHA;
            this.rootContainer.eventMode = 'none';
        }
    }
}

