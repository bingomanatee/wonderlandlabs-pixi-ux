import { BoxListStore, type Padding } from '@wonderlandlabs-pixi-ux/box';
import { ButtonStore } from '@wonderlandlabs-pixi-ux/button';
import { StyleTree, fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { Application } from 'pixi.js';
import type { ToolbarConfig, ToolbarButtonConfig } from './types';
import { ToolbarConfigSchema } from './types';
import defaultStyles from './styles/toolbar.default.json';

/**
 * Convert toolbar padding config to Padding type
 */
function normalizePadding(padding: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined): Padding | undefined {
  if (padding === undefined) return undefined;
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

/**
 * ToolbarStore - A BoxListStore-based toolbar that manages ButtonStore children.
 * Uses BoxListStore for layout management and StyleTree for button styling.
 */
export class ToolbarStore extends BoxListStore {
  #styleTree: StyleTree;
  #toolbarConfig: ToolbarConfig;
  #buttons: Map<string, ButtonStore> = new Map();

  constructor(config: ToolbarConfig, app: Application) {
    // Parse config through schema to apply defaults
    const parsedConfig = ToolbarConfigSchema.parse(config);

    // Use provided StyleTree or load default styles
    const styleTree = parsedConfig.style ?? fromJSON(defaultStyles);

    // Convert toolbar config to BoxListStore config
    const padding = normalizePadding(parsedConfig.padding);

    // Determine sizing mode
    const xDef = {
      sizeMode: (parsedConfig.fixedSize ? 'px' : 'hug') as 'px' | 'hug',
      size: parsedConfig.width ?? 0
    };

    const yDef = {
      sizeMode: (parsedConfig.fixedSize ? 'px' : 'hug') as 'px' | 'hug',
      size: parsedConfig.height ?? 0
    };

    super({
      id: parsedConfig.id ?? 'toolbar',
      xDef,
      yDef,
      direction: parsedConfig.orientation === 'vertical' ? 'vertical' : 'horizontal',
      gap: parsedConfig.spacing ?? 8,
      gapMode: 'between',
      padding,
      style: parsedConfig.background,
    }, app);

    this.#styleTree = styleTree;
    this.#toolbarConfig = parsedConfig;

    // Create buttons
    for (const buttonConfig of parsedConfig.buttons) {
      this.#createButton(buttonConfig, parsedConfig.bitmapFont);
    }
  }

  /**
   * Create a button from config
   */
  #createButton(buttonConfig: ToolbarButtonConfig, bitmapFontName?: string): ButtonStore {
    const button = new ButtonStore({
      ...buttonConfig,
      bitmapFont: buttonConfig.bitmapFont ?? bitmapFontName,
    }, this.#styleTree, this.application);

    this.addChild(button);

    // Ensure the button computes its intrinsic size.
    button.kickoff();

    // Re-layout toolbar after button resolve tick so hug sizing uses final child dimensions.
    this.application.ticker.addOnce(() => {
      this.markDirty();
    }, this);

    this.#buttons.set(buttonConfig.id, button);
    return button;
  }

  /**
   * Add a button to the toolbar
   */
  addButton(buttonConfig: ToolbarButtonConfig): ButtonStore {
    return this.#createButton(buttonConfig, this.#toolbarConfig.bitmapFont);
  }

  /**
   * Remove a button by id
   */
  removeButton(id: string): void {
    const button = this.#buttons.get(id);
    if (button) {
      this.removeChild(button);
      this.#buttons.delete(id);
      button.cleanup();
    }
  }

  /**
   * Get a button by id
   */
  getButton(id: string): ButtonStore | undefined {
    return this.#buttons.get(id);
  }

  /**
   * Get all buttons
   */
  getButtons(): ButtonStore[] {
    return Array.from(this.#buttons.values());
  }

  /**
   * Get the StyleTree used by this toolbar
   */
  get styleTree(): StyleTree {
    return this.#styleTree;
  }

  /**
   * Get the toolbar config
   */
  get toolbarConfig(): ToolbarConfig {
    return this.#toolbarConfig;
  }

  override cleanup(): void {
    for (const button of this.#buttons.values()) {
      button.cleanup();
    }
    this.#buttons.clear();
    super.cleanup();
  }
}
