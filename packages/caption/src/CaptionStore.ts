import { TickerForest } from '@wonderlandlabs-pixi-ux/ticker-forest';
import { BoxStore, DIR_HORIZ, INSET_SCOPE_ALL, POS_CENTER, type BoxCellType } from '@wonderlandlabs-pixi-ux/box';
import { fromJSON, type StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import {
    type Application,
    type Container,
    type Graphics,
    type Text,
    type TextStyleOptions,
    type ContainerOptions,
} from 'pixi.js';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import {
    DEFAULT_CAPTION_BACKGROUND_STYLE,
    DEFAULT_CAPTION_TEXT_STYLE,
    mergeBackgroundStyle,
    resolveCaptionConfig,
    rgbToNumber,
    type CaptionBackgroundStyle,
    type CaptionConfig,
    type CaptionConfigInput,
    type CaptionPointerConfig,
    type CaptionShape,
    type CaptionState,
    type CaptionThoughtConfig,
    type Point,
} from './types.js';
import {
    computePointerTriangle,
    getThoughtScallops,
    triangleToPathPoints,
    type TrianglePoints,
} from './geometry.js';

function mergeTextStyle(
    base: TextStyleOptions,
    next?: Partial<TextStyleOptions>
): TextStyleOptions {
    return next ? { ...base, ...next } : base;
}

function clampRadius(value: number, width: number, height: number): number {
    const max = Math.min(width, height) / 2;
    return Math.max(0, Math.min(value, max));
}

type CaptionTheme = {
    padding: number;
    cornerRadius: number;
    bubbleFill?: { color: number; alpha: number };
    bubbleStroke?: { color: number; alpha: number; width: number };
    textStyle: TextStyleOptions;
    textAlpha: number;
};

function toStyleLayers(styleTree?: StyleTree | StyleTree[], styleDef?: unknown): StyleTree[] {
    const layers: StyleTree[] = [];
    if (styleDef && typeof styleDef === 'object') {
        layers.push(fromJSON(styleDef as Record<string, unknown>));
    }
    if (Array.isArray(styleTree)) {
        layers.push(...styleTree);
    } else if (styleTree) {
        layers.push(styleTree);
    }
    return layers;
}

export class CaptionStore extends TickerForest<CaptionState> {
    readonly id: string;
    readonly pixi: PixiProvider;
    #layoutStore: BoxStore;
    #styleTree: StyleTree[];

    #bubbleFill: Graphics;
    #bubbleOutline: Graphics;
    #textDisplay: Text;
    #backgroundStyle: CaptionBackgroundStyle;
    #textStyle: TextStyleOptions;

    constructor(
        config: CaptionConfigInput,
        app: Application,
        rootProps?: ContainerOptions,
        pixi: PixiProvider = PixiProvider.shared,
    ) {
        const resolved: CaptionConfig = resolveCaptionConfig(config);
        const initialState: CaptionState = {
            id: resolved.id,
            order: resolved.order,
            text: resolved.text,
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
            shape: resolved.shape,
            cornerRadius: resolved.cornerRadius,
            padding: resolved.padding,
            autoSize: resolved.autoSize,
            pointer: resolved.pointer,
            thought: resolved.thought,
        };

        const captionContainer = new pixi.Container({
            label: `caption-${resolved.id}`,
            ...rootProps,
        });
        super({ value: initialState }, {app, container: captionContainer});

        this.id = resolved.id;
        this.pixi = pixi;
        this.#styleTree = toStyleLayers(resolved.styleTree, resolved.styleDef);
        this.#bubbleFill = new pixi.Graphics();
        this.#bubbleOutline = new pixi.Graphics();
        this.#backgroundStyle = mergeBackgroundStyle(
            DEFAULT_CAPTION_BACKGROUND_STYLE,
            resolved.backgroundStyle
        );
        this.#textStyle = mergeTextStyle(DEFAULT_CAPTION_TEXT_STYLE, resolved.textStyle);
        this.#layoutStore = new BoxStore({
            value: this.#makeLayoutTree(initialState.width, initialState.height, initialState.padding, initialState.text),
        });

        this.container.position.set(initialState.x, initialState.y);
        this.container.zIndex = initialState.order;

        this.#textDisplay = new pixi.Text({
            text: initialState.text,
            style: new pixi.TextStyle(this.#textStyle),
        });

        // Layer order: stroke behind fill, text on top.
        this.container.addChild(this.#bubbleOutline);
        this.container.addChild(this.#bubbleFill);
        this.container.addChild(this.#textDisplay);

        this.kickoff();
    }

    get container(): Container {
        const container = super.container;
        if (!container) {
            throw new Error('CaptionStore: container unavailable');
        }
        return container;
    }

    set container(container: Container | undefined) {
        super.container = container;
    }

    get textDisplay(): Text {
        return this.#textDisplay;
    }

    get backgroundStyle(): CaptionBackgroundStyle {
        return this.#backgroundStyle;
    }

    get textStyle(): TextStyleOptions {
        return this.#textStyle;
    }

    setText(text: string): void {
        if (this.value.text === text) return;
        this.mutate((draft) => {
            draft.text = text;
        });
        this.dirty();
    }

    setPosition(x: number, y: number): void {
        if (this.value.x === x && this.value.y === y) return;
        this.mutate((draft) => {
            draft.x = x;
            draft.y = y;
        });
        this.dirty();
    }

    setOrder(order: number): void {
        if (!Number.isFinite(order)) return;
        if (this.value.order === order) return;
        this.mutate((draft) => {
            draft.order = order;
        });
        this.dirty();
    }

    setSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) return;
        if (this.value.width === width && this.value.height === height) return;
        this.mutate((draft) => {
            draft.width = width;
            draft.height = height;
            draft.autoSize = false;
        });
        this.dirty();
    }

    setShape(shape: CaptionShape): void {
        if (this.value.shape === shape) return;
        this.mutate((draft) => {
            draft.shape = shape;
        });
        this.dirty();
    }

    setCornerRadius(cornerRadius: number): void {
        if (this.value.cornerRadius === cornerRadius) return;
        this.mutate((draft) => {
            draft.cornerRadius = Math.max(0, cornerRadius);
        });
        this.dirty();
    }

    setPadding(padding: number): void {
        if (this.value.padding === padding) return;
        this.mutate((draft) => {
            draft.padding = Math.max(0, padding);
        });
        this.dirty();
    }

    setAutoSize(autoSize: boolean): void {
        if (this.value.autoSize === autoSize) return;
        this.mutate((draft) => {
            draft.autoSize = autoSize;
        });
        this.dirty();
    }

    setPointer(pointer: Partial<CaptionPointerConfig>): void {
        this.mutate((draft) => {
            draft.pointer = {
                ...draft.pointer,
                ...pointer,
                speaker: pointer.speaker !== undefined ? pointer.speaker : draft.pointer.speaker,
            };
        });
        this.dirty();
    }

    setThoughtConfig(thought: Partial<CaptionThoughtConfig>): void {
        this.mutate((draft) => {
            draft.thought = {
                ...draft.thought,
                ...thought,
            };
        });
        this.dirty();
    }

    setSpeakerPoint(point: Point | null): void {
        this.mutate((draft) => {
            draft.pointer.speaker = point;
        });
        this.dirty();
    }

    setBackgroundStyle(style: Partial<CaptionBackgroundStyle>): void {
        this.#backgroundStyle = mergeBackgroundStyle(this.#backgroundStyle, style);
        this.dirty();
    }

    setTextStyle(style: Partial<TextStyleOptions>): void {
        this.#textStyle = mergeTextStyle(this.#textStyle, style);
        this.#textDisplay.style = new this.pixi.TextStyle(this.#textStyle);
        this.dirty();
    }

    #matchStyle(path: string[]): unknown {
        if (this.#styleTree.length === 0) {
            return undefined;
        }
        const queries = [
            ['caption', this.value.shape, ...path],
            ['caption', ...path],
        ];
        for (const nouns of queries) {
            for (let index = this.#styleTree.length - 1; index >= 0; index -= 1) {
                const layer = this.#styleTree[index];
                const value = layer.matchHierarchy({ nouns, states: [] });
                if (value !== undefined) {
                    return value;
                }
            }
        }
        return undefined;
    }

    #matchNumber(path: string[], fallback: number): number {
        const value = this.#matchStyle(path);
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    #matchColorNumber(path: string[]): number | undefined {
        const value = this.#matchStyle(path);
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return new this.pixi.Color(value).toNumber();
        }
        if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
            return rgbToNumber(value as { r: number; g: number; b: number });
        }
        return undefined;
    }

    #resolveTheme(): CaptionTheme {
        const padding = this.#matchNumber(['padding'], this.value.padding);
        const cornerRadius = this.#matchNumber(['bubble', 'radius'], this.value.cornerRadius);

        const fillColor = this.#matchColorNumber(['bubble', 'fill', 'color']);
        const fillAlpha = this.#matchNumber(['bubble', 'fill', 'alpha'], this.#backgroundStyle.fill?.alpha ?? 1);
        const strokeColor = this.#matchColorNumber(['bubble', 'stroke', 'color']);
        const strokeAlpha = this.#matchNumber(['bubble', 'stroke', 'alpha'], this.#backgroundStyle.stroke?.alpha ?? 1);
        const strokeWidth = this.#matchNumber(['bubble', 'stroke', 'width'], this.#backgroundStyle.stroke?.width ?? 0);

        const fontSize = this.#matchStyle(['label', 'font', 'size']);
        const fontFamily = this.#matchStyle(['label', 'font', 'family']);
        const fontFill = this.#matchStyle(['label', 'font', 'color']) ?? this.#matchStyle(['label', 'fill', 'color']);
        const fontAlpha = this.#matchStyle(['label', 'font', 'alpha']);
        const align = this.#matchStyle(['label', 'font', 'align']);

        return {
            padding,
            cornerRadius,
            bubbleFill: fillColor !== undefined
                ? { color: fillColor, alpha: fillAlpha }
                : this.#backgroundStyle.fill?.color
                    ? { color: rgbToNumber(this.#backgroundStyle.fill.color), alpha: this.#backgroundStyle.fill.alpha ?? 1 }
                    : undefined,
            bubbleStroke: strokeColor !== undefined && strokeWidth > 0
                ? { color: strokeColor, alpha: strokeAlpha, width: strokeWidth }
                : this.#backgroundStyle.stroke?.color && (this.#backgroundStyle.stroke.width ?? 0) > 0
                    ? {
                        color: rgbToNumber(this.#backgroundStyle.stroke.color),
                        alpha: this.#backgroundStyle.stroke.alpha ?? 1,
                        width: this.#backgroundStyle.stroke.width ?? 0,
                    }
                    : undefined,
            textStyle: {
                ...this.#textStyle,
                fontSize: typeof fontSize === 'number' ? fontSize : this.#textStyle.fontSize,
                fontFamily: typeof fontFamily === 'string' ? fontFamily : this.#textStyle.fontFamily,
                fill: fontFill ?? this.#textStyle.fill,
                align: typeof align === 'string' ? align as TextStyleOptions['align'] : this.#textStyle.align,
            },
            textAlpha: typeof fontAlpha === 'number'
                ? fontAlpha
                : (this.#textStyle as TextStyleOptions & { alpha?: number }).alpha ?? 1,
        };
    }

    #makeLayoutTree(width: number, height: number, padding: number, text: string): BoxCellType {
        return {
            id: 'caption-root',
            name: 'container',
            absolute: true,
            layoutStrategy: 'bloat',
            dim: {
                x: 0,
                y: 0,
                w: Math.max(1, width),
                h: Math.max(1, height),
            },
            align: {
                direction: DIR_HORIZ,
                xPosition: POS_CENTER,
                yPosition: POS_CENTER,
            },
            insets: padding > 0 ? [{
                role: 'padding',
                inset: [{ scope: INSET_SCOPE_ALL, value: padding }],
            }] : undefined,
            children: [{
                id: 'caption-text',
                name: 'label',
                absolute: false,
                dim: {
                    w: 0,
                    h: 0,
                },
                align: {
                    direction: DIR_HORIZ,
                    xPosition: POS_CENTER,
                    yPosition: POS_CENTER,
                },
                content: {
                    type: 'text',
                    value: text,
                },
            }],
        };
    }

    #measureText(): { width: number; height: number } {
        const bounds = this.#textDisplay.getLocalBounds();
        return {
            width: Math.max(1, Math.ceil(bounds.width)),
            height: Math.max(1, Math.ceil(bounds.height)),
        };
    }

    #updateLayout(theme: CaptionTheme): void {
        const { width, height, text } = this.value;
        this.#layoutStore.mutate((draft) => {
            draft.dim = {
                ...draft.dim,
                w: Math.max(1, width),
                h: Math.max(1, height),
            };
            draft.insets = theme.padding > 0 ? [{
                role: 'padding',
                inset: [{ scope: INSET_SCOPE_ALL, value: theme.padding }],
            }] : undefined;
            if (draft.children?.[0]?.content?.type === 'text') {
                draft.children[0].content.value = text;
            }
        });
        this.#layoutStore.recordTextMeasures(new Map([
            ['caption-text', { w: this.#measureText().width, h: this.#measureText().height }],
        ]));
        this.#layoutStore.update();
    }

    #drawBubbleBody(
        target: Graphics,
        width: number,
        height: number,
        shape: CaptionShape,
        cornerRadius: number,
        thought: CaptionThoughtConfig
    ): void {
        if (shape === 'thought') {
            target.ellipse(width / 2, height / 2, width / 2, height / 2);
            const scallops = getThoughtScallops(width, height, thought);
            for (const scallop of scallops) {
                target.circle(scallop.x, scallop.y, scallop.radius);
            }
            return;
        }
        if (shape === 'oval') {
            target.ellipse(width / 2, height / 2, width / 2, height / 2);
            return;
        }
        target.roundRect(0, 0, width, height, clampRadius(cornerRadius, width, height));
    }

    #appendBubbleGeometry(
        target: Graphics,
        width: number,
        height: number,
        shape: CaptionShape,
        cornerRadius: number,
        thought: CaptionThoughtConfig,
        triangle: TrianglePoints | null
    ): void {
        this.#drawBubbleBody(target, width, height, shape, cornerRadius, thought);
        if (triangle) {
            target.poly(triangleToPathPoints(triangle));
        }
    }

    #drawBubble(theme: CaptionTheme): void {
        const { width, height, shape, x, y, pointer, thought } = this.value;

        this.#bubbleFill.clear();
        this.#bubbleOutline.clear();

        let triangle: TrianglePoints | null = null;
        if (pointer.enabled && pointer.speaker) {
            const localSpeaker = {
                x: pointer.speaker.x - x,
                y: pointer.speaker.y - y,
            };
            triangle = computePointerTriangle({
                shape,
                width,
                height,
                speaker: localSpeaker,
                baseWidth: pointer.baseWidth,
                length: pointer.length,
            });
        }

        if (theme.bubbleFill) {
            this.#appendBubbleGeometry(
                this.#bubbleFill,
                width,
                height,
                shape,
                theme.cornerRadius,
                thought,
                triangle
            );
            this.#bubbleFill.fill({
                color: theme.bubbleFill.color,
                alpha: theme.bubbleFill.alpha,
            });
        }

        if (theme.bubbleStroke && theme.bubbleStroke.width > 0) {
            this.#appendBubbleGeometry(
                this.#bubbleOutline,
                width,
                height,
                shape,
                theme.cornerRadius,
                thought,
                triangle
            );
            this.#bubbleOutline.stroke({
                color: theme.bubbleStroke.color,
                alpha: theme.bubbleStroke.alpha,
                width: theme.bubbleStroke.width,
            });
        }
    }

    #maybeAutoSize(): void {
        const { autoSize, width, height } = this.value;
        if (!autoSize) return;
        const nextWidth = Math.max(1, Math.ceil(this.#layoutStore.location.w));
        const nextHeight = Math.max(1, Math.ceil(this.#layoutStore.location.h));

        if (nextWidth === width && nextHeight === height) return;
        this.mutate((draft) => {
            draft.width = nextWidth;
            draft.height = nextHeight;
        });
    }

    #layoutText(theme: CaptionTheme): void {
        const textRect = this.#layoutStore.getLocation(['caption-root', 'caption-text']);
        const contentRect = textRect ?? { x: 0, y: 0, w: this.value.width, h: this.value.height };

        this.#textDisplay.style = new this.pixi.TextStyle({
            ...theme.textStyle,
            wordWrapWidth: Math.max(1, contentRect.w),
        });
        this.#textDisplay.alpha = theme.textAlpha;

        const bounds = this.#textDisplay.getLocalBounds();
        const x = contentRect.x + (contentRect.w - bounds.width) / 2 - bounds.x;
        const y = contentRect.y + (contentRect.h - bounds.height) / 2 - bounds.y;
        this.#textDisplay.position.set(x, y);
    }

    protected resolve(): void {
        const theme = this.#resolveTheme();
        this.#textDisplay.text = this.value.text;
        this.#updateLayout(theme);
        this.#maybeAutoSize();
        this.#updateLayout(theme);
        this.container.position.set(this.value.x, this.value.y);
        this.container.zIndex = this.value.order;
        this.#layoutText(theme);
        this.#drawBubble(theme);
    }

    cleanup(): void {
        super.cleanup();
        this.#layoutStore.complete();
        const container = super.container;
        if (container) {
            container.destroy({children: true});
            this.container = undefined;
        }
    }
}
