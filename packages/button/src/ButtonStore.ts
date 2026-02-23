import { BoxTree } from '@wonderlandlabs-pixi-ux/box';
import { TickerForest, type TickerForestConfig } from '@wonderlandlabs-pixi-ux/ticker-forest';
import type { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import {
    Application,
    CanvasTextMetrics,
    Container,
    Graphics,
    Text,
    TextStyle,
    type ContainerOptions,
    type Sprite,
    type TextStyleOptions,
    type Ticker,
} from 'pixi.js';
import type { ButtonConfig, ButtonMode, RgbColor } from './types';
import { rgbToHex } from './types';

type ButtonState = {
    dirty: boolean;
};

type TickerSource = Application | { ticker: Ticker };

type IconRef = {
    tree: BoxTree;
    host: Container;
    sprite?: Sprite;
    container?: Container;
    role: 'left' | 'right';
};

type LabelRef = {
    tree: BoxTree;
    host: Container;
    textDisplay: Text;
};

type ButtonFillStyle = {
    color?: RgbColor;
    alpha?: number;
};

type ButtonStrokeStyle = {
    color?: RgbColor;
    alpha?: number;
    width?: number;
};

type ButtonVisualStyle = {
    borderRadius?: number;
    fill?: ButtonFillStyle;
    stroke?: ButtonStrokeStyle;
};

function isApplication(value: TickerSource): value is Application {
    return !!value && typeof value === 'object' && 'renderer' in value && 'ticker' in value;
}

function toTickerConfig(source: TickerSource): TickerForestConfig {
    if (isApplication(source)) {
        return { app: source };
    }
    return { ticker: source.ticker };
}

/**
 * ButtonStore - BoxTree-based button layout with Pixi rendering.
 *
 * Layout model:
 * - A root BoxTree node represents button bounds.
 * - Child BoxTree nodes represent icon/label slots in content space.
 * - Padding is applied at render placement time (child tree positions remain padding-free).
 */
export class ButtonStore extends TickerForest<ButtonState> {
    readonly id: string;

    #styleTree: StyleTree;
    #config: ButtonConfig;
    #mode: ButtonMode;
    #isHovered = false;
    #isDisabled: boolean;

    #tree: BoxTree;
    #container: Container;
    #background: Graphics;
    #contentContainer: Container;

    #leftIcon?: IconRef;
    #rightIcon?: IconRef;
    #label?: LabelRef;

    constructor(
        config: ButtonConfig,
        styleTree: StyleTree,
        tickerSource: TickerSource,
        rootProps?: ContainerOptions
    ) {
        super({ value: { dirty: true } }, toTickerConfig(tickerSource));

        this.id = config.id;
        this.#styleTree = styleTree;
        this.#config = config;
        this.#mode = ButtonStore.#resolveMode(config);
        this.#isDisabled = config.isDisabled ?? false;

        this.#tree = new BoxTree({
            id: config.id,
            area: {
                x: 0,
                y: 0,
                width: { mode: 'px', value: 0 },
                height: { mode: 'px', value: 0 },
                px: 's',
                py: 's',
            },
            align: {
                x: 's',
                y: 's',
                direction: this.#mode === 'iconVertical' ? 'column' : 'row',
            },
        });

        this.#container = new Container({
            label: `button-${this.id}`,
            ...rootProps,
        });

        this.#background = new Graphics();
        this.#contentContainer = new Container({
            label: `button-content-${this.id}`,
        });

        this.#container.addChild(this.#background);
        this.#container.addChild(this.#contentContainer);

        this.#buildChildren();
        this.#setupInteractivity();
    }

    static #resolveMode(config: ButtonConfig): ButtonMode {
        if (config.mode) return config.mode;
        if (!config.sprite && !config.icon && config.label) return 'text';
        if ((config.sprite || config.icon) && config.label) return 'inline';
        return 'icon';
    }

    get #wantsLeftIcon(): boolean {
        return this.#mode === 'icon'
            || this.#mode === 'iconVertical'
            || (this.#mode === 'inline' && !!(this.#config.sprite || this.#config.icon));
    }

    get #wantsRightIcon(): boolean {
        return this.#mode === 'inline' && !!(this.#config.rightSprite || this.#config.rightIcon);
    }

    get #wantsLabel(): boolean {
        return !!this.#config.label && this.#mode !== 'icon';
    }

    get container(): Container {
        return this.#container;
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        return this.#tree.rect;
    }

    get children(): readonly BoxTree[] {
        return this.#tree.children;
    }

    get isHovered(): boolean {
        return this.#isHovered;
    }

    get isDisabled(): boolean {
        return this.#isDisabled;
    }

    get mode(): ButtonMode {
        return this.#mode;
    }

    static #asNonEmptyString(value: unknown): string | undefined {
        if (typeof value !== 'string') {
            return undefined;
        }
        const next = value.trim();
        return next.length ? next : undefined;
    }

    #extractSpriteUrl(sprite?: Sprite): string | undefined {
        if (!sprite) return undefined;
        const texture = (sprite as unknown as { texture?: any }).texture;
        const source = texture?.source;
        return ButtonStore.#asNonEmptyString(source?.resource?.src)
            ?? ButtonStore.#asNonEmptyString(source?.src)
            ?? ButtonStore.#asNonEmptyString(texture?.resource?.src)
            ?? ButtonStore.#asNonEmptyString(texture?.url);
    }

    #extractContainerUrl(container?: Container): string | undefined {
        if (!container) return undefined;
        const firstChild = container.children?.[0] as Sprite | undefined;
        return this.#extractSpriteUrl(firstChild);
    }

    #resolveIconContentUrl(role: 'left' | 'right', sprite?: Sprite, container?: Container): string | undefined {
        const explicit = role === 'right'
            ? this.#config.rightIconUrl
            : this.#config.iconUrl;

        return ButtonStore.#asNonEmptyString(explicit)
            ?? this.#extractSpriteUrl(sprite)
            ?? this.#extractContainerUrl(container);
    }

    #addTreeChild(key: string, order: number): BoxTree {
        return this.#tree.addChild(key, {
            id: `${this.id}-${key}`,
            order,
            area: {
                x: 0,
                y: 0,
                width: { mode: 'px', value: 0 },
                height: { mode: 'px', value: 0 },
                px: 's',
                py: 's',
            },
            align: {
                x: 's',
                y: 's',
                direction: 'column',
            },
        });
    }

    #createIconRef(role: 'left' | 'right', order: number): IconRef {
        const key = role === 'left' ? 'icon-left' : 'icon-right';
        const sprite = role === 'right' ? this.#config.rightSprite : this.#config.sprite;
        const container = role === 'right' ? this.#config.rightIcon : this.#config.icon;
        const tree = this.#addTreeChild(key, order);
        const iconUrl = this.#resolveIconContentUrl(role, sprite, container);
        if (iconUrl) {
            tree.setContent({ type: 'url', value: iconUrl });
        }

        const host = new Container({ label: `${this.id}-${key}-host` });
        if (sprite) {
            if ('anchor' in sprite && sprite.anchor) {
                sprite.anchor.set(0);
            }
            host.addChild(sprite);
        } else if (container) {
            host.addChild(container);
        }

        this.#contentContainer.addChild(host);
        return { tree, host, sprite, container, role };
    }

    #createLabelRef(order: number): LabelRef {
        const tree = this.#addTreeChild('label', order);
        tree.setContent({
            type: 'text',
            value: this.#config.label ?? '',
        });
        const host = new Container({ label: `${this.id}-label-host` });
        const textDisplay = new Text({
            text: this.#config.label ?? '',
            style: new TextStyle({
                fontSize: 13,
                fill: 0xffffff,
                align: 'center',
                fontFamily: this.#config.bitmapFont ?? 'Arial',
            }),
        });

        host.addChild(textDisplay);
        this.#contentContainer.addChild(host);

        return { tree, host, textDisplay };
    }

    #buildChildren(): void {
        let order = 0;

        if (this.#wantsLeftIcon) {
            this.#leftIcon = this.#createIconRef('left', order);
            order += 1;
        }

        if (this.#wantsLabel) {
            this.#label = this.#createLabelRef(order);
            order += 1;
        }

        if (this.#wantsRightIcon) {
            this.#rightIcon = this.#createIconRef('right', order);
        }
    }

    #setupInteractivity(): void {
        this.#container.eventMode = this.#isDisabled ? 'none' : 'static';
        this.#container.cursor = this.#isDisabled ? 'default' : 'pointer';

        this.#container.on('pointerenter', this.#onPointerEnter);
        this.#container.on('pointerleave', this.#onPointerLeave);
        this.#container.on('pointertap', this.#onPointerTap);
    }

    #onPointerEnter = (): void => {
        if (!this.#isDisabled) {
            this.setHovered(true);
        }
    };

    #onPointerLeave = (): void => {
        if (!this.#isDisabled) {
            this.setHovered(false);
        }
    };

    #onPointerTap = (): void => {
        if (!this.#isDisabled && this.#config.onClick) {
            this.#config.onClick();
        }
    };

    #getCurrentStates(): string[] {
        return this.#isDisabled ? ['disabled'] : (this.#isHovered ? ['hover'] : []);
    }

    #getStyle(...propertyPath: string[]): unknown {
        const states = this.#getCurrentStates();
        const variant = this.#config.variant;

        let modePrefix: string[] = [];
        if (this.#mode === 'text') {
            modePrefix = ['text'];
        } else if (this.#mode === 'inline') {
            modePrefix = ['inline'];
        } else if (this.#mode === 'iconVertical') {
            modePrefix = ['iconVertical'];
        }

        if (variant) {
            const variantMatch = this.#styleTree.match({
                nouns: ['button', variant, ...modePrefix, ...propertyPath],
                states,
            });
            if (variantMatch !== undefined) {
                return variantMatch;
            }
        }

        return this.#styleTree.match({
            nouns: ['button', ...modePrefix, ...propertyPath],
            states,
        });
    }

    #defaultPaddingX(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 12 : 4;
    }

    #defaultPaddingY(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 6 : 4;
    }

    #defaultBorderRadius(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 4 : 0;
    }

    #defaultIconSize(): { x: number; y: number } {
        return this.#mode === 'inline' ? { x: 16, y: 16 } : { x: 32, y: 32 };
    }

    #defaultLabelColor(): RgbColor {
        return this.#mode === 'text' || this.#mode === 'inline'
            ? { r: 1, g: 1, b: 1 }
            : { r: 0, g: 0, b: 0 };
    }

    #defaultLabelAlpha(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 1 : 0.5;
    }

    #defaultStrokeWidth(): number {
        return this.#mode === 'text' || this.#mode === 'inline' ? 0 : 1;
    }

    #buildRootStyle(): ButtonVisualStyle {
        const borderRadius = (this.#getStyle('borderRadius') as number | undefined) ?? this.#defaultBorderRadius();
        const strokeColor = (this.#getStyle('stroke', 'color') as RgbColor | undefined) ?? { r: 0.5, g: 0.5, b: 0.5 };
        const strokeAlpha = (this.#getStyle('stroke', 'alpha') as number | undefined) ?? 1;
        const strokeWidth = (this.#getStyle('stroke', 'width') as number | undefined) ?? this.#defaultStrokeWidth();

        const fillColor = this.#getStyle('fill', 'color') as RgbColor | undefined;
        const fillAlpha = this.#getStyle('fill', 'alpha') as number | undefined;

        const style: ButtonVisualStyle = { borderRadius };

        if (fillColor && (fillAlpha ?? 1) > 0) {
            style.fill = {
                color: fillColor,
                alpha: this.#isDisabled ? (fillAlpha ?? 1) * 0.5 : (fillAlpha ?? 1),
            };
        } else if (this.#mode === 'text' || this.#mode === 'inline') {
            style.fill = {
                color: { r: 0.33, g: 0.67, b: 0.6 },
                alpha: this.#isDisabled ? 0.5 : 1,
            };
        }

        if (strokeColor && strokeWidth > 0) {
            style.stroke = {
                color: strokeColor,
                width: strokeWidth,
                alpha: strokeAlpha,
            };
        }

        return style;
    }

    #iconStyle(iconRef: IconRef): { width: number; height: number; alpha: number; tint?: RgbColor } {
        const defaults = this.#defaultIconSize();
        const isRight = iconRef.role === 'right';

        const width = isRight
            ? ((this.#getStyle('rightIcon', 'size', 'x') as number | undefined)
                ?? (this.#getStyle('icon', 'size', 'x') as number | undefined)
                ?? defaults.x)
            : ((this.#getStyle('icon', 'size', 'x') as number | undefined) ?? defaults.x);

        const height = isRight
            ? ((this.#getStyle('rightIcon', 'size', 'y') as number | undefined)
                ?? (this.#getStyle('icon', 'size', 'y') as number | undefined)
                ?? defaults.y)
            : ((this.#getStyle('icon', 'size', 'y') as number | undefined) ?? defaults.y);

        const alpha = isRight
            ? ((this.#getStyle('rightIcon', 'alpha') as number | undefined)
                ?? (this.#getStyle('icon', 'alpha') as number | undefined)
                ?? 1)
            : ((this.#getStyle('icon', 'alpha') as number | undefined) ?? 1);

        const tint = isRight
            ? ((this.#getStyle('rightIcon', 'tint') as RgbColor | undefined)
                ?? (this.#getStyle('icon', 'tint') as RgbColor | undefined))
            : (this.#getStyle('icon', 'tint') as RgbColor | undefined);

        return { width, height, alpha, tint };
    }

    #labelStyle(): { textStyle: TextStyleOptions; alpha: number } {
        const fontSize = (this.#getStyle('label', 'fontSize') as number | undefined) ?? 13;
        const color = (this.#getStyle('label', 'color') as RgbColor | undefined) ?? this.#defaultLabelColor();
        const alpha = (this.#getStyle('label', 'alpha') as number | undefined) ?? this.#defaultLabelAlpha();

        const textStyle: TextStyleOptions = {
            fontSize,
            fill: rgbToHex(color),
            align: 'center',
            fontFamily: this.#config.bitmapFont ?? 'Arial',
        };

        return {
            textStyle,
            alpha: this.#isDisabled ? alpha * 0.5 : alpha,
        };
    }

    #measureLabel(textStyle: TextStyleOptions): { width: number; height: number } {
        const text = this.#config.label ?? '';
        const fallbackFontSize = typeof textStyle.fontSize === 'number' ? textStyle.fontSize : 13;
        const fallbackWidth = Math.max(0, text.length * fallbackFontSize * 0.6);
        const fallbackHeight = Math.max(0, fallbackFontSize * 1.2);

        let measuredWidth = fallbackWidth;
        let measuredHeight = fallbackHeight;

        // Prefer live Pixi text bounds when available so vertical centering follows rendered extent.
        if (this.#label) {
            try {
                this.#label.textDisplay.text = text;
                this.#label.textDisplay.style = new TextStyle(textStyle);
                const bounds = this.#label.textDisplay.getLocalBounds();
                if (Number.isFinite(bounds.width) && bounds.width >= 0) {
                    measuredWidth = bounds.width;
                }
                if (Number.isFinite(bounds.height) && bounds.height >= 0) {
                    measuredHeight = bounds.height;
                }
            } catch {
                // Ignore and fallback to CanvasTextMetrics/fallback values.
            }
        }

        try {
            const measured = CanvasTextMetrics.measureText(text, textStyle as never);
            if (Number.isFinite(measured.width) && measured.width >= 0) {
                measuredWidth = measured.width;
            }
            if (Number.isFinite(measured.height) && measured.height >= 0) {
                measuredHeight = measured.height;
            }
        } catch {
            // In non-browser contexts measurement can fail; fallback remains valid.
        }

        return {
            width: measuredWidth,
            height: measuredHeight,
        };
    }

    #syncLayout(): void {
        const direction = this.#mode === 'iconVertical' ? 'column' : 'row';
        const isRow = direction === 'row';

        const gap = this.#mode === 'iconVertical'
            ? ((this.#getStyle('iconGap') as number | undefined) ?? 4)
            : (this.#mode === 'inline' ? ((this.#getStyle('iconGap') as number | undefined) ?? 8) : 0);

        const paddingX = (this.#getStyle('padding', 'x') as number | undefined) ?? this.#defaultPaddingX();
        const paddingY = (this.#getStyle('padding', 'y') as number | undefined) ?? this.#defaultPaddingY();

        this.#tree.setDirection(isRow ? 'row' : 'column');

        const nodes: Array<{ tree: BoxTree; width: number; height: number }> = [];

        if (this.#leftIcon) {
            const iconStyle = this.#iconStyle(this.#leftIcon);
            nodes.push({
                tree: this.#leftIcon.tree,
                width: iconStyle.width,
                height: iconStyle.height,
            });
        }

        if (this.#label) {
            const { textStyle } = this.#labelStyle();
            const measured = this.#measureLabel(textStyle);
            nodes.push({
                tree: this.#label.tree,
                width: measured.width,
                height: measured.height,
            });
        }

        if (this.#rightIcon) {
            const iconStyle = this.#iconStyle(this.#rightIcon);
            nodes.push({
                tree: this.#rightIcon.tree,
                width: iconStyle.width,
                height: iconStyle.height,
            });
        }

        const contentWidth = isRow
            ? nodes.reduce((sum, node) => sum + node.width, 0) + Math.max(0, nodes.length - 1) * gap
            : nodes.reduce((max, node) => Math.max(max, node.width), 0);

        const contentHeight = isRow
            ? nodes.reduce((max, node) => Math.max(max, node.height), 0)
            : nodes.reduce((sum, node) => sum + node.height, 0) + Math.max(0, nodes.length - 1) * gap;

        for (const [index, node] of nodes.entries()) {
            const gapOffset = index * gap;
            const x = isRow ? gapOffset : 0;
            let y = isRow ? 0 : gapOffset;
            if (isRow && this.#mode === 'inline') {
                y = Math.max(0, (contentHeight - node.height) / 2);
            }

            node.tree.setPosition(x, y);
            node.tree.setWidthPx(node.width);
            node.tree.setHeightPx(node.height);
        }

        this.#tree.setWidthPx(contentWidth + (paddingX * 2));
        this.#tree.setHeightPx(contentHeight + (paddingY * 2));

        this.#contentContainer.position.set(paddingX, paddingY);
    }

    #syncBackground(): void {
        const style = this.#buildRootStyle();
        const { width, height } = this.#tree.rect;

        this.#background.clear();

        const radius = style.borderRadius ?? 0;

        if (style.fill?.color) {
            this.#background.roundRect(0, 0, width, height, radius);
            this.#background.fill({
                color: rgbToHex(style.fill.color),
                alpha: style.fill.alpha ?? 1,
            });
        }

        if (style.stroke?.color && style.stroke.width && style.stroke.width > 0) {
            this.#background.roundRect(0, 0, width, height, radius);
            this.#background.stroke({
                color: rgbToHex(style.stroke.color),
                alpha: style.stroke.alpha ?? 1,
                width: style.stroke.width,
            });
        }
    }

    #syncIconNode(iconRef: IconRef): void {
        const style = this.#iconStyle(iconRef);
        iconRef.host.position.set(iconRef.tree.x, iconRef.tree.y);

        if (iconRef.sprite) {
            iconRef.sprite.width = style.width;
            iconRef.sprite.height = style.height;
            iconRef.sprite.alpha = this.#isDisabled ? style.alpha * 0.5 : style.alpha;
            iconRef.sprite.tint = style.tint ? rgbToHex(style.tint) : 0xffffff;
            return;
        }

        if (iconRef.container) {
            const bounds = iconRef.container.getLocalBounds();
            if (bounds.width > 0 && bounds.height > 0) {
                iconRef.container.scale.set(style.width / bounds.width, style.height / bounds.height);
            }
            iconRef.container.alpha = this.#isDisabled ? style.alpha * 0.5 : style.alpha;
        }
    }

    #syncLabelNode(): void {
        if (!this.#label) return;

        const { textStyle, alpha } = this.#labelStyle();
        this.#label.host.position.set(this.#label.tree.x, this.#label.tree.y);
        this.#label.textDisplay.text = this.#config.label ?? '';
        this.#label.tree.setContent({
            type: 'text',
            value: this.#config.label ?? '',
        });
        this.#label.textDisplay.style = new TextStyle(textStyle);
        this.#label.textDisplay.alpha = alpha;
    }

    protected override isDirty(): boolean {
        return this.value.dirty;
    }

    protected override clearDirty(): void {
        this.set('dirty', false);
    }

    markDirty(): void {
        if (!this.value.dirty) {
            this.set('dirty', true);
        }
        this.queueResolve();
    }

    protected override resolve(): void {
        this.#syncLayout();

        this.#container.position.set(this.#tree.x, this.#tree.y);
        this.#syncBackground();

        if (this.#leftIcon) {
            this.#syncIconNode(this.#leftIcon);
        }
        if (this.#rightIcon) {
            this.#syncIconNode(this.#rightIcon);
        }
        this.#syncLabelNode();
    }

    setHovered(isHovered: boolean): void {
        if (this.#isHovered === isHovered) return;
        this.#isHovered = isHovered;
        this.markDirty();
    }

    setDisabled(isDisabled: boolean): void {
        if (this.#isDisabled === isDisabled) return;
        this.#isDisabled = isDisabled;
        this.#container.eventMode = isDisabled ? 'none' : 'static';
        this.#container.cursor = isDisabled ? 'default' : 'pointer';
        this.markDirty();
    }

    setPosition(x: number, y: number): void {
        this.#tree.setPosition(x, y);
        this.markDirty();
    }

    getConfig(): ButtonConfig {
        return this.#config;
    }

    getPreferredSize(): { width: number; height: number } {
        const { width, height } = this.#tree.rect;
        return { width, height };
    }

    override cleanup(): void {
        this.#container.off('pointerenter', this.#onPointerEnter);
        this.#container.off('pointerleave', this.#onPointerLeave);
        this.#container.off('pointertap', this.#onPointerTap);
        super.cleanup();
    }
}
