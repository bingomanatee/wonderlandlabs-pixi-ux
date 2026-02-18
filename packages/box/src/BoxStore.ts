import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { Application, Container, Graphics, ContainerOptions } from 'pixi.js';
import type {
    BoxState, BaseBoxConfig, BoxStyle, BoxProps, RgbColor, ContentArea, Padding, AxisDef, AxisDefInput
} from './types';
import { normalizeAxisDef } from './types';

/**
 * Default axis definition (input format)
 */
const DEFAULT_AXIS_DEF: AxisDefInput = { size: 0, align: 'start', sizeMode: 'px' };

/**
 * BoxStore - Base class for all box types
 *
 * Manages a rectangular box with:
 * - Container hierarchy: container → background + contentContainer
 * - xDef/yDef: axis definitions (size, align, sizeMode)
 * - x, y: position (absolute for root, set by parent for children)
 * - width, height: derived from xDef.size/yDef.size
 *
 * Subclasses:
 * - BoxLeafStore: contains a single Graphics/Sprite/Text
 * - BoxListStore: contains child BoxStores with direction and gap
 */
export class BoxStore extends TickerForest<BoxState> {
    readonly id: string;

    protected _container: Container;
    protected _background: Graphics = new Graphics();
    protected _contentContainer: Container = new Container();

    /** Public mask graphics - by default a rect the same size as the box */
    maskGraphics: Graphics = new Graphics();

    // Non-state props
    protected _boxProps: BoxProps;

    // Parent reference for layout relationships (separate from Forestry state branching).
    protected _parent: BoxStore | null = null;

    constructor(
        config: BaseBoxConfig,
        app: Application,
        boxProps?: BoxProps,
        rootProps?: ContainerOptions
    ) {
        // Merge config axis defs with defaults and normalize (fill -> percentFree: 1)
        const xDef: AxisDef = normalizeAxisDef({
            size: config.xDef?.size ?? DEFAULT_AXIS_DEF.size,
            align: config.xDef?.align ?? DEFAULT_AXIS_DEF.align,
            sizeMode: config.xDef?.sizeMode ?? DEFAULT_AXIS_DEF.sizeMode,
        });
        const yDef: AxisDef = normalizeAxisDef({
            size: config.yDef?.size ?? DEFAULT_AXIS_DEF.size,
            align: config.yDef?.align ?? DEFAULT_AXIS_DEF.align,
            sizeMode: config.yDef?.sizeMode ?? DEFAULT_AXIS_DEF.sizeMode,
        });

        // Merge padding with defaults
        const padding: Padding = {
            top: config.padding?.top ?? 0,
            right: config.padding?.right ?? 0,
            bottom: config.padding?.bottom ?? 0,
            left: config.padding?.left ?? 0,
        };

        const initialState: BoxState = {
            id: config.id,
            x: config.x ?? 0,
            y: config.y ?? 0,
            width: xDef.size,
            height: yDef.size,
            xDef,
            yDef,
            padding,
            noMask: config.noMask ?? false,
            isDirty: true,
        };

        super({ value: initialState }, app);

        this.id = config.id;
        this._boxProps = boxProps ?? { style: config.style };

        // Create root container with optional props
        this._container = new Container({
            label: `box-${config.id}`,
            ...rootProps,
        });

        // Set position
        this._container.position.set(initialState.x, initialState.y);

        // Build container hierarchy
        this._container.addChild(this._background);
        this._container.addChild(this._contentContainer);
        this._container.addChild(this.maskGraphics);

        // Setup pointer event if provided
        if (this._boxProps.onPointerDown) {
            this._container.eventMode = 'static';
            this._container.on('pointerdown', (event) => {
                this._boxProps.onPointerDown?.(event, this);
            });
        }

        // Initial mask setup (will be updated in resolve)
        this._updateMask();
    }

    /**
     * Get the root container for this box
     */
    get container(): Container {
        return this._container;
    }

    /**
     * Get the content container where child elements should be added
     */
    get contentContainer(): Container {
        return this._contentContainer;
    }

    /**
     * Get the current rect (x, y, width, height) from state
     */
    get rect(): { x: number; y: number; width: number; height: number } {
        const { x, y, width, height } = this.value;
        return { x, y, width, height };
    }

    /**
     * Get xDef (axis definition for x)
     */
    get xDef(): AxisDef {
        return this.value.xDef;
    }

    /**
     * Get yDef (axis definition for y)
     */
    get yDef(): AxisDef {
        return this.value.yDef;
    }

    /**
     * Get the computed content area (after padding)
     */
    getContentArea(): ContentArea {
        const { width, height, padding } = this.value;
        const p = padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
        return {
            x: p.left,
            y: p.top,
            width: width - p.left - p.right,
            height: height - p.top - p.bottom,
        };
    }

    /**
     * Update padding
     */
    setPadding(padding: Partial<Padding>): void {
        const current = this.value.padding;
        const next: Padding = {
            top: padding.top ?? current.top,
            right: padding.right ?? current.right,
            bottom: padding.bottom ?? current.bottom,
            left: padding.left ?? current.left,
        };
        if (
            next.top === current.top
            && next.right === current.right
            && next.bottom === current.bottom
            && next.left === current.left
        ) {
            return;
        }
        this.mutate(draft => {
            draft.padding = next;
            draft.isDirty = true;
        });
        this.queueResolve();
    }

    /**
     * Update box position (called by parent for layout)
     */
    setPosition(x: number, y: number): void {
        const { x: currentX, y: currentY } = this.value;
        if (x === currentX && y === currentY) {
            return;
        }
        this.mutate(draft => {
            draft.x = x;
            draft.y = y;
            draft.isDirty = true;
        });
        this.queueResolve();
    }

    /**
     * Update box size
     */
    setSize(width: number, height: number): void {
        const { width: currentWidth, height: currentHeight } = this.value;
        if (width === currentWidth && height === currentHeight) {
            return;
        }
        this.mutate(draft => {
            draft.width = width;
            draft.height = height;
            draft.xDef = { ...draft.xDef, size: width };
            draft.yDef = { ...draft.yDef, size: height };
            draft.isDirty = true;
        });
        this.queueResolve();
    }

    /**
     * Get parent box
     */
    get parent(): BoxStore | null {
        return this._parent;
    }

    /**
     * Set parent (called by BoxListStore when adding children)
     */
    setParent(parent: BoxStore | null): void {
        this._parent = parent;
    }

    /**
     * Update style (non-state, triggers re-render)
     */
    setStyle(style: Partial<BoxStyle>): void {
        this._boxProps.style = { ...this._boxProps.style, ...style };
        this.markDirty();
    }

    /**
     * Get current style
     */
    get style(): BoxStyle | undefined {
        return this._boxProps.style;
    }

    protected _rgbToNumber(rgb: RgbColor): number {
        const r = Math.round(rgb.r * 255);
        const g = Math.round(rgb.g * 255);
        const b = Math.round(rgb.b * 255);
        return (r << 16) | (g << 8) | b;
    }

    protected _renderBackground(): void {
        const { width, height } = this.value;
        const style = this._boxProps.style;

        this._background.clear();

        if (!style) return;

        const radius = style.borderRadius ?? 0;

        if (style.fill?.color) {
            const color = this._rgbToNumber(style.fill.color);
            const alpha = style.fill.alpha ?? 1;
            this._background.roundRect(0, 0, width, height, radius);
            this._background.fill({ color, alpha });
        }

        if (style.stroke?.color && style.stroke.width) {
            const color = this._rgbToNumber(style.stroke.color);
            const alpha = style.stroke.alpha ?? 1;
            const strokeWidth = style.stroke.width;
            this._background.roundRect(0, 0, width, height, radius);
            this._background.stroke({ color, alpha, width: strokeWidth });
        }
    }

    protected _updateMask(): void {
        const { width, height, noMask } = this.value;

        this.maskGraphics.clear();

        if (noMask) {
            this._contentContainer.mask = null;
            return;
        }

        // Draw mask rect same size as box
        this.maskGraphics.rect(0, 0, width, height);
        this.maskGraphics.fill(0xffffff);

        this._contentContainer.mask = this.maskGraphics;
    }

    /**
     * Position content container at padding offset
     */
    protected _updateContentPosition(): void {
        const { padding } = this.value;
        const p = padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
        this._contentContainer.position.set(p.left, p.top);
    }

    protected isDirty(): boolean {
        return this.value.isDirty;
    }

    protected clearDirty(): void {
        this.set('isDirty', false);
    }

    /**
     * Mark this box as dirty to trigger re-render
     */
    markDirty(): void {
        this.set('isDirty', true);
        this.queueResolve();
    }

    protected resolve(): void {
        const { x, y, width, height } = this.value;

        // Update container position
        this._container.position.set(x, y);

        // Render background
        this._renderBackground();

        // Update mask
        this._updateMask();

        // Update content position based on padding
        this._updateContentPosition();

        // Call custom render if provided
        this._boxProps.render?.(this);
    }

    cleanup(): void {
        super.cleanup();
        this._container.destroy({ children: true });
    }
}
