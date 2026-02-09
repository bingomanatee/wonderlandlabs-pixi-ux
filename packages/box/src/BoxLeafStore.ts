import { Application, Container, Graphics, Sprite, Text, ContainerOptions } from 'pixi.js';
import { BoxStore } from './BoxStore';
import type { BoxLeafConfig, BoxProps } from './types';

/**
 * BoxLeafStore - A box that contains a single graphic element
 * 
 * Content can be:
 * - Graphics: vector shapes
 * - Sprite: bitmap images
 * - Text: text labels
 * 
 * The content is added to the contentContainer and positioned based on
 * the box's xDef.align and yDef.align settings.
 */
export class BoxLeafStore extends BoxStore {
    #content: Graphics | Sprite | Text | null = null;

    constructor(
        config: BoxLeafConfig,
        app: Application,
        boxProps?: BoxProps,
        rootProps?: ContainerOptions
    ) {
        super(config, app, boxProps, rootProps);
    }

    /**
     * Set the content (Graphics, Sprite, or Text)
     */
    setContent(content: Graphics | Sprite | Text | null): void {
        // Remove old content
        if (this.#content) {
            this._contentContainer.removeChild(this.#content);
        }

        this.#content = content;

        // Add new content
        if (content) {
            this._contentContainer.addChild(content);
        }

        this.markDirty();
    }

    /**
     * Get the current content
     */
    get content(): Graphics | Sprite | Text | null {
        return this.#content;
    }

    /**
     * Get the natural size of the content (for hug mode)
     */
    getContentSize(): { width: number; height: number } {
        if (!this.#content) {
            return { width: 0, height: 0 };
        }

        // Get bounds of the content
        const bounds = this.#content.getBounds();
        return {
            width: bounds.width,
            height: bounds.height,
        };
    }

    protected override resolve(): void {
        const { xDef, yDef, padding } = this.value;
        const p = padding ?? { top: 0, right: 0, bottom: 0, left: 0 };

        // Handle hug mode - resize to fit content
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

        // Position content based on alignment
        if (this.#content) {
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

            this.#content.position.set(contentX, contentY);
        }

        // Call base resolve (background, mask, position)
        super.resolve();
    }

    override cleanup(): void {
        if (this.#content) {
            this._contentContainer.removeChild(this.#content);
            this.#content = null;
        }
        super.cleanup();
    }
}

