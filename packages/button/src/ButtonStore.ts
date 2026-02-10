import { BoxLeafStore, BoxListStore, BoxTextStore, type BoxStyle } from '@forestry-pixi/box';
import type { StyleTree } from '@forestry-pixi/style-tree';
import { Application, Container, ContainerOptions, Sprite, type TextStyleOptions } from 'pixi.js';
import type { ButtonConfig, ButtonMode, RgbColor } from './types';
import { rgbToHex } from './types';

type IconRef = {
    box: BoxLeafStore;
    sprite?: Sprite;
    container?: Container;
    role: 'left' | 'right';
};

/**
 * ButtonStore - A compositional button built from Box stores.
 *
 * Structure:
 * - Root: BoxListStore (hug/hug)
 * - Children: optional icon leaf, optional label text box, optional right icon leaf
 *
 * Layout and sizing are delegated to Box primitives:
 * - Hug sizing: root dimensions from child dimensions + gap + padding
 * - Child positioning: BoxListStore direction/gap rules
 */
export class ButtonStore extends BoxListStore {
    #styleTree: StyleTree;
    #config: ButtonConfig;
    #mode: ButtonMode;
    #isHovered = false;
    #isDisabled: boolean;

    #leftIcon?: IconRef;
    #rightIcon?: IconRef;
    #labelBox?: BoxTextStore;

    #lastRootStyleSig?: string;
    #lastLabelStyleSig?: string;

    constructor(
        config: ButtonConfig,
        styleTree: StyleTree,
        app: Application,
        rootProps?: ContainerOptions
    ) {
        const mode = ButtonStore.#resolveMode(config);

        super({
            id: config.id,
            xDef: { sizeMode: 'hug' },
            yDef: { sizeMode: 'hug' },
            direction: mode === 'iconVertical' ? 'vertical' : 'horizontal',
            gap: 0,
            gapMode: 'between',
            noMask: true,
        }, app, undefined, rootProps);

        this.#styleTree = styleTree;
        this.#config = config;
        this.#mode = mode;
        this.#isDisabled = config.isDisabled ?? false;

        this.#buildChildren();
        this.#setupInteractivity();

        // Child stores resolve on ticker callbacks. Force one post-child pass so
        // root hug sizing uses resolved child dimensions.
        for (const child of this.children) {
            child.kickoff();
        }
        this.application.ticker.addOnce(() => {
            this.markDirty();
        }, this);
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

    #createIconRef(role: 'left' | 'right'): IconRef {
        const isRight = role === 'right';
        const idSuffix = isRight ? 'icon-right' : 'icon-left';
        const sprite = isRight ? this.#config.rightSprite : this.#config.sprite;
        const container = isRight ? this.#config.rightIcon : this.#config.icon;

        const box = new BoxLeafStore({
            id: `${this.id}-${idSuffix}`,
            xDef: { sizeMode: 'px', size: 0, align: 'center' },
            yDef: { sizeMode: 'px', size: 0, align: 'center' },
            noMask: true,
        }, this.application);

        if (sprite) {
            sprite.anchor.set(0);
            box.setContent(sprite);
            return { box, sprite, role };
        }

        if (container) {
            box.contentContainer.addChild(container);
            return { box, container, role };
        }

        return { box, role };
    }

    #createLabel(): BoxTextStore {
        return new BoxTextStore({
            id: `${this.id}-label`,
            text: this.#config.label,
            xDef: { sizeMode: 'hug', align: 'center' },
            yDef: { sizeMode: 'hug', align: 'center' },
            noMask: true,
        }, this.application);
    }

    #buildChildren(): void {
        if (this.#wantsLeftIcon) {
            this.#leftIcon = this.#createIconRef('left');
            this.addChild(this.#leftIcon.box);
        }

        if (this.#wantsLabel) {
            this.#labelBox = this.#createLabel();
            this.addChild(this.#labelBox);
        }

        if (this.#wantsRightIcon) {
            this.#rightIcon = this.#createIconRef('right');
            this.addChild(this.#rightIcon.box);
        }
    }

    #setupInteractivity(): void {
        this.container.eventMode = this.#isDisabled ? 'none' : 'static';
        this.container.cursor = this.#isDisabled ? 'default' : 'pointer';

        this.container.on('pointerenter', this.$.pointerEnter);
        this.container.on('pointerleave', this.$.pointerLeave);
        this.container.on('pointertap', this.$.pointerTap);
    }

    pointerEnter(): void {
        if (!this.#isDisabled) {
            this.setHovered(true);
        }
    }

    pointerLeave(): void {
        if (!this.#isDisabled) {
            this.setHovered(false);
        }
    }

    pointerTap(): void {
        if (!this.#isDisabled && this.#config.onClick) {
            this.#config.onClick();
        }
    }

    setHovered(isHovered: boolean): void {
        if (this.#isHovered !== isHovered) {
            this.#isHovered = isHovered;
            this.markDirty();
        }
    }

    setDisabled(isDisabled: boolean): void {
        if (this.#isDisabled !== isDisabled) {
            this.#isDisabled = isDisabled;
            this.container.eventMode = isDisabled ? 'none' : 'static';
            this.container.cursor = isDisabled ? 'default' : 'pointer';
            this.markDirty();
        }
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

    #getCurrentStates(): string[] {
        return this.#isDisabled ? ['disabled'] : (this.#isHovered ? ['hover'] : []);
    }

    #getStyle(...propertyPath: string[]): any {
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

    #syncLayoutProperties(): void {
        const direction = this.#mode === 'iconVertical' ? 'vertical' : 'horizontal';
        if (this.direction !== direction) {
            this.setDirection(direction);
        }

        const gap = this.#mode === 'iconVertical'
            ? (this.#getStyle('iconGap') ?? 4)
            : (this.#mode === 'inline' ? (this.#getStyle('iconGap') ?? 8) : 0);
        if (this.gap !== gap) {
            this.setGap(gap);
        }

        const paddingX = this.#getStyle('padding', 'x') ?? this.#defaultPaddingX();
        const paddingY = this.#getStyle('padding', 'y') ?? this.#defaultPaddingY();
        const current = this.value.padding;
        const samePadding = current.top === paddingY
            && current.right === paddingX
            && current.bottom === paddingY
            && current.left === paddingX;
        if (!samePadding) {
            this.setPadding({
                top: paddingY,
                right: paddingX,
                bottom: paddingY,
                left: paddingX,
            });
        }
    }

    #syncRootStyle(): void {
        const borderRadius = this.#getStyle('borderRadius') ?? this.#defaultBorderRadius();
        const strokeColor = this.#getStyle('stroke', 'color') ?? { r: 0.5, g: 0.5, b: 0.5 };
        const strokeAlpha = this.#getStyle('stroke', 'alpha') ?? 1;
        const strokeWidth = this.#getStyle('stroke', 'width') ?? this.#defaultStrokeWidth();

        const fillColor = this.#getStyle('fill', 'color');
        const fillAlpha = this.#getStyle('fill', 'alpha');

        const style: BoxStyle = { borderRadius };

        if (fillColor && (fillAlpha ?? 1) > 0) {
            style.fill = {
                color: fillColor,
                alpha: this.#isDisabled ? (fillAlpha ?? 1) * 0.5 : (fillAlpha ?? 1),
            };
        } else if (this.#mode === 'text' || this.#mode === 'inline') {
            const defaultFill = { r: 0.33, g: 0.67, b: 0.6 };
            style.fill = {
                color: defaultFill,
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

        const sig = JSON.stringify(style);
        if (sig !== this.#lastRootStyleSig) {
            this.#lastRootStyleSig = sig;
            this.setStyle(style);
        }
    }

    #syncIcon(iconRef: IconRef): void {
        const defaults = this.#defaultIconSize();
        const isRight = iconRef.role === 'right';

        const sizeX = isRight
            ? (this.#getStyle('rightIcon', 'size', 'x') ?? this.#getStyle('icon', 'size', 'x') ?? defaults.x)
            : (this.#getStyle('icon', 'size', 'x') ?? defaults.x);
        const sizeY = isRight
            ? (this.#getStyle('rightIcon', 'size', 'y') ?? this.#getStyle('icon', 'size', 'y') ?? defaults.y)
            : (this.#getStyle('icon', 'size', 'y') ?? defaults.y);
        const alpha = isRight
            ? (this.#getStyle('rightIcon', 'alpha') ?? this.#getStyle('icon', 'alpha') ?? 1)
            : (this.#getStyle('icon', 'alpha') ?? 1);
        const tint = isRight
            ? (this.#getStyle('rightIcon', 'tint') ?? this.#getStyle('icon', 'tint'))
            : this.#getStyle('icon', 'tint');

        if (iconRef.box.rect.width !== sizeX || iconRef.box.rect.height !== sizeY) {
            iconRef.box.setSize(sizeX, sizeY);
        }

        if (iconRef.sprite) {
            iconRef.sprite.width = sizeX;
            iconRef.sprite.height = sizeY;
            iconRef.sprite.alpha = this.#isDisabled ? alpha * 0.5 : alpha;
            iconRef.sprite.tint = tint ? rgbToHex(tint) : 0xffffff;
        } else if (iconRef.container) {
            const bounds = iconRef.container.getBounds();
            if (bounds.width > 0 && bounds.height > 0) {
                iconRef.container.scale.set(sizeX / bounds.width, sizeY / bounds.height);
            }
            iconRef.container.alpha = this.#isDisabled ? alpha * 0.5 : alpha;
        }
    }

    #syncLabel(): void {
        if (!this.#labelBox) return;

        const fontSize = this.#getStyle('label', 'fontSize') ?? 13;
        const color = this.#getStyle('label', 'color') ?? this.#defaultLabelColor();
        const alpha = this.#getStyle('label', 'alpha') ?? this.#defaultLabelAlpha();

        const textStyle: TextStyleOptions = {
            fontSize,
            fill: rgbToHex(color),
            align: 'center',
            fontFamily: this.#config.bitmapFont ?? 'Arial',
        };

        const alphaValue = this.#isDisabled ? alpha * 0.5 : alpha;
        const sig = JSON.stringify({ textStyle, alphaValue });
        if (sig !== this.#lastLabelStyleSig) {
            this.#lastLabelStyleSig = sig;
            this.#labelBox.setTextStyle(textStyle);
            this.#labelBox.textDisplay.alpha = alphaValue;
        }
    }

    protected override resolve(): void {
        this.#syncLayoutProperties();
        this.#syncRootStyle();

        if (this.#leftIcon) {
            this.#syncIcon(this.#leftIcon);
        }
        if (this.#rightIcon) {
            this.#syncIcon(this.#rightIcon);
        }
        this.#syncLabel();

        super.resolve();
    }

    getConfig(): ButtonConfig {
        return this.#config;
    }

    getPreferredSize(): { width: number; height: number } {
        const { width, height } = this.value;
        return { width, height };
    }
}
