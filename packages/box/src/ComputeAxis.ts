import {
    type BoxAlign,
    type BoxSizeObjType,
    type DimensionDirectionType,
    type DirectionType,
    type RectPartialType,
    type RectPXType,
} from './types.js';
import {
    AXIS_X,
    DIM_HORIZ_S,
    DIM_VERT_S,
    POS_CENTER_S,
    POS_END_S,
    DIR_HORIZ_S,
    DIR_VERT_S,
    POS_FILL,
    POS_START_S,
    POS_KEY_X,
    POS_KEY_Y,
    dirMap,
    posMap,
    SIZE_FRACTION,
} from './constants.js';
import {sizeToNumber, toComplexSize} from './helpers.js';

function normalizeDirection(direction: DirectionType): typeof DIR_HORIZ_S | typeof DIR_VERT_S {
    return dirMap.get(direction) ?? DIR_VERT_S;
}

function crossDirection(direction: DirectionType): typeof DIR_HORIZ_S | typeof DIR_VERT_S {
    return normalizeDirection(direction) === DIR_HORIZ_S ? DIR_VERT_S : DIR_HORIZ_S;
}

function alignKey(direction: DirectionType): typeof POS_KEY_X | typeof POS_KEY_Y {
    return normalizeDirection(direction) === DIR_HORIZ_S ? POS_KEY_X : POS_KEY_Y;
}

function parentSize(direction: DirectionType, parent: RectPXType): number {
    return normalizeDirection(direction) === DIR_HORIZ_S ? parent.w : parent.h;
}

function sizeDirection(direction: DirectionType): DimensionDirectionType {
    return normalizeDirection(direction) === DIR_HORIZ_S ? DIM_HORIZ_S : DIM_VERT_S;
}

function sizeValue(direction: DimensionDirectionType, rect: RectPartialType) {
    return direction === DIM_HORIZ_S ? rect.w : rect.h;
}

function alignOffset(position: string | undefined, available: number): number {
    const normalized = position ? posMap.get(position) ?? position : undefined;
    switch (normalized) {
        case POS_CENTER_S:
            return available / 2;
        case POS_END_S:
            return available;
        case POS_FILL:
        case POS_START_S:
        default:
            return 0;
    }
}

export class ComputeAxis {
    widths: Array<number | BoxSizeObjType>;
    heights: Array<number | BoxSizeObjType>;
    xPositions: number[];
    yPositions: number[];
    mainAxisResolvedSpanTotal: number;

    readonly #flowDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S;

    constructor(
        readonly align: BoxAlign['_type'],
        readonly parent: RectPXType,
        readonly dims: RectPartialType[],
    ) {
        this.#flowDirection = normalizeDirection(align.direction);
        this.widths = new Array(dims.length).fill(0);
        this.heights = new Array(dims.length).fill(0);
        this.xPositions = new Array(dims.length).fill(0);
        this.yPositions = new Array(dims.length).fill(0);
        this.mainAxisResolvedSpanTotal = 0;
    }

    compute(): RectPXType[] {
        this.#resolveAxisSizes(this.align.direction);
        this.#completeFractionalSizes();
        this.#placeChildren();
        const computedWidths = this.#resolvedAxisSpans(DIR_HORIZ_S);
        const computedHeights = this.#resolvedAxisSpans(DIR_VERT_S);

        return this.dims.map((_dim, index) => ({
            x: this.parent.x + this.xPositions[index],
            y: this.parent.y + this.yPositions[index],
            w: computedWidths[index],
            h: computedHeights[index],
        }));
    }

    #readAxisSpans(direction: DirectionType): Array<number | BoxSizeObjType> {
        const dir = sizeDirection(direction);
        const stn = {
            input: 0,
            parentContainer: this.parent,
            direction,
            skipFractional: true,
        };

        return this.dims.map((rect: RectPartialType) => {
            const input = sizeValue(dir, rect);
            const normalizedInput = toComplexSize(input);
            if (normalizedInput?.unit === SIZE_FRACTION) {
                return normalizedInput;
            }
            return sizeToNumber({...stn, input}) ?? 0;
        });
    }

    get mainAxisRemainder(): number {
        return Math.max(parentSize(this.#flowDirection, this.parent) - this.mainAxisResolvedSpanTotal, 0);
    }

    #resolvedAxisSpans(direction: DirectionType): number[] {
        const normalizedDirection = normalizeDirection(direction);
        const configuredAxisSpans = normalizedDirection === this.#flowDirection
            ? (normalizedDirection === DIR_HORIZ_S ? this.widths : this.heights)
            : this.#readAxisSpans(direction);

        return configuredAxisSpans.map((span) => typeof span === 'number' ? span : 0);
    }

    #resolveAxisSizes(direction: DirectionType): void {
        const normalizedDirection = normalizeDirection(direction);
        const axisSpans = this.#readAxisSpans(direction);
        let resolvedSpanTotal = 0;

        axisSpans.forEach((span) => {
            if (typeof span === 'number') {
                resolvedSpanTotal += span;
            }
        });

        switch (normalizedDirection) {
            case DIR_HORIZ_S:
                this.widths = axisSpans;
                this.mainAxisResolvedSpanTotal = resolvedSpanTotal;
                return;
            case DIR_VERT_S:
            default:
                this.heights = axisSpans;
                this.mainAxisResolvedSpanTotal = resolvedSpanTotal;
        }
    }

    #completeFractionalSizes(): void {
        const axisSpans = this.#flowDirection === DIR_HORIZ_S ? this.widths : this.heights;
        const unresolvedAxisSpanIndices: number[] = [];

        axisSpans.forEach((span, index) => {
            if (typeof span !== 'number') {
                unresolvedAxisSpanIndices.push(index);
            }
        });

        // TODO: distribute mainAxisRemainder across unresolved fractional axis spans.
        void unresolvedAxisSpanIndices;
    }

    #placeChildren(): void {
        const widths = this.#resolvedAxisSpans(DIR_HORIZ_S);
        const heights = this.#resolvedAxisSpans(DIR_VERT_S);
        const mainDirection = this.#flowDirection;
        const crossDirectionValue = crossDirection(mainDirection);
        const mainAlignment = this.align[alignKey(mainDirection)];
        const crossAlignment = this.align[alignKey(crossDirectionValue)];
        const normalizedMainAlignment = posMap.get(mainAlignment) ??  POS_START_S;

        switch (normalizedMainAlignment) {
            case POS_CENTER_S:
                this.#placeChildrenCenter(widths, heights, mainDirection, crossAlignment);
                return;
            case POS_END_S:
                this.#placeChildrenRight(widths, heights, mainDirection, crossAlignment);
                return;
            case POS_FILL:
            case POS_START_S:
            default:
                this.#placeChildrenLeft(widths, heights, mainDirection, crossAlignment);
        }
    }

    #placeChildrenLeft(
        widths: number[],
        heights: number[],
        mainDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S,
        crossAlignment: string | undefined,
    ): void {
        const xPositions = new Array(this.dims.length).fill(0);
        const yPositions = new Array(this.dims.length).fill(0);
        const iterate = this.#placeChildFactory(widths, heights, xPositions, yPositions, mainDirection, crossAlignment);

        this.dims.reduce(iterate, 0);

        this.xPositions = xPositions;
        this.yPositions = yPositions;
    }

    #placeChildrenCenter(
        widths: number[],
        heights: number[],
        mainDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S,
        crossAlignment: string | undefined,
    ): void {
        const xPositions = new Array(this.dims.length).fill(0);
        const yPositions = new Array(this.dims.length).fill(0);
        const leadAxisPadding = this.mainAxisRemainder / 2;
        const iterate = this.#placeChildFactory(widths, heights, xPositions, yPositions, mainDirection, crossAlignment);

        this.dims.reduce(iterate, leadAxisPadding);

        this.xPositions = xPositions;
        this.yPositions = yPositions;
    }

    #placeChildrenRight(
        widths: number[],
        heights: number[],
        mainDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S,
        crossAlignment: string | undefined,
    ): void {
        const xPositions = new Array(this.dims.length).fill(0);
        const yPositions = new Array(this.dims.length).fill(0);
        const leadAxisPadding = this.mainAxisRemainder;
        const iterate = this.#placeChildFactory(widths, heights, xPositions, yPositions, mainDirection, crossAlignment);

        this.dims.reduce(iterate, leadAxisPadding);

        this.xPositions = xPositions;
        this.yPositions = yPositions;
    }

    #placeChildFactory(
        widths: number[],
        heights: number[],
        xPositions: number[],
        yPositions: number[],
        mainDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S,
        crossAlignment: string | undefined,
    ): (cursor: number, _dim: RectPartialType, index: number) => number {
        return (cursor: number, _dim: RectPartialType, index: number): number => {
            const width = widths[index];
            const height = heights[index];
            const crossX = alignOffset(crossAlignment, Math.max(this.parent.w - width, 0));
            const crossY = alignOffset(crossAlignment, Math.max(this.parent.h - height, 0));

            if (mainDirection === DIR_HORIZ_S) {
                xPositions[index] = cursor;
                yPositions[index] = crossY;
                return cursor + width;
            }

            xPositions[index] = crossX;
            yPositions[index] = cursor;
            return cursor + height;
        };
    }
}
