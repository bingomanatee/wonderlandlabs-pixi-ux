import { Application, Text, TextStyle, TextStyleOptions, ContainerOptions } from 'pixi.js';
import { BoxStore } from './BoxStore';
import type { BoxLeafConfig, BoxProps } from './types';

/**
 * BoxTextConfig - configuration for BoxTextStore
 */
export interface BoxTextConfig extends BoxLeafConfig {
    text?: string;
    textStyle?: TextStyleOptions;
}

/**
 * BoxTextStore - A specialized box that renders text and auto-sizes to fit
 * 
 * Automatically sets width/height based on the rendered text dimensions.
 * Useful for labels, titles, prices, etc.
 */
export class BoxTextStore extends BoxStore {
    #textDisplay: Text;
    #text: string;

    constructor(
        config: BoxTextConfig,
        app: Application,
        boxProps?: BoxProps,
        rootProps?: ContainerOptions
    ) {
        // Default to hug mode for text boxes
        const xDef = config.xDef ?? { size: 0, align: 'start', sizeMode: 'hug' };
        const yDef = config.yDef ?? { size: 0, align: 'start', sizeMode: 'hug' };
        
        super({ ...config, xDef, yDef }, app, boxProps, rootProps);

        this.#text = config.text ?? '';
        
        // Create text display
        this.#textDisplay = new Text({
            text: this.#text,
            style: new TextStyle(config.textStyle ?? {
                fontSize: 16,
                fill: 0xffffff,
            }),
        });

        this._contentContainer.addChild(this.#textDisplay);
    }

    /**
     * Get the text content
     */
    get text(): string {
        return this.#text;
    }

    /**
     * Set the text content
     */
    setText(text: string): void {
        this.#text = text;
        this.#textDisplay.text = text;
        this.markDirty();
    }

    /**
     * Update text style
     */
    setTextStyle(style: TextStyleOptions): void {
        this.#textDisplay.style = new TextStyle(style);
        this.markDirty();
    }

    /**
     * Get the Text display object
     */
    get textDisplay(): Text {
        return this.#textDisplay;
    }

    /**
     * Get the natural size of the text
     */
    getContentSize(): { width: number; height: number } {
        const bounds = this.#textDisplay.getBounds();
        return {
            width: bounds.width,
            height: bounds.height,
        };
    }

    protected override resolve(): void {
        const { xDef, yDef, padding } = this.value;
        const p = padding ?? { top: 0, right: 0, bottom: 0, left: 0 };

        // Handle hug mode - resize to fit text
        if (xDef.sizeMode === 'hug' || yDef.sizeMode === 'hug') {
            const contentSize = this.getContentSize();
            this.mutate(draft => {
                if (xDef.sizeMode === 'hug') {
                    draft.width = contentSize.width + p.left + p.right;
                    draft.xDef = { ...draft.xDef, size: draft.width };
                }
                if (yDef.sizeMode === 'hug') {
                    draft.height = contentSize.height + p.top + p.bottom;
                    draft.yDef = { ...draft.yDef, size: draft.height };
                }
            });
        }

        // Position text based on alignment
        const contentArea = this.getContentArea();
        const contentSize = this.getContentSize();

        let contentX = 0;
        let contentY = 0;

        // Horizontal alignment
        if (xDef.align === 'center') {
            contentX = (contentArea.width - contentSize.width) / 2;
        } else if (xDef.align === 'end') {
            contentX = contentArea.width - contentSize.width;
        }

        // Vertical alignment
        if (yDef.align === 'center') {
            contentY = (contentArea.height - contentSize.height) / 2;
        } else if (yDef.align === 'end') {
            contentY = contentArea.height - contentSize.height;
        }

        this.#textDisplay.position.set(contentX, contentY);

        // Call base resolve (background, mask, position)
        super.resolve();
    }

    override cleanup(): void {
        this._contentContainer.removeChild(this.#textDisplay);
        this.#textDisplay.destroy();
        super.cleanup();
    }
}

