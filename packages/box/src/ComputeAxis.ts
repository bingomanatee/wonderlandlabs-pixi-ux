import {
    type BoxAlignType,
    type BoxSizeObjType,
    type DirectionType,
    type RectPartialType,
    type RectPXType,
} from './types.js';
import {
    DIR_HORIZ_S,
    DIR_VERT_S,
    POS_CENTER_S,
    POS_END_S,
    POS_FILL,
    POS_START_S,
    posMap,
    SIZE_FRACTION,
} from './constants.js';
import {
    alignKey,
    alignOffset,
    crossDirection,
    normalizeDirection,
    parentSize,
    sizeDirection,
    sizeToNumber,
    sizeValue,
    toComplexSize
} from './helpers.js';

export class ComputeAxis {
    widths: Array<number | BoxSizeObjType>;
    heights: Array<number | BoxSizeObjType>;
    xPositions: number[];
    yPositions: number[];
    mainAxisResolvedSpanTotal: number;
    effectiveMainAlignment: string;
    effectiveCrossAlignment: string;

    readonly #flowDirection: typeof DIR_HORIZ_S | typeof DIR_VERT_S;

    constructor(
        readonly align: BoxAlignType,
        readonly parent: RectPXType,
        readonly dims: RectPartialType[],
    ) {
        this.#flowDirection = normalizeDirection(align.direction);
        this.widths = new Array(dims.length).fill(0);
        this.heights = new Array(dims.length).fill(0);
        this.xPositions = new Array(dims.length).fill(0);
        this.yPositions = new Array(dims.length).fill(0);
        this.mainAxisResolvedSpanTotal = 0;
        this.effectiveMainAlignment = POS_START_S;
        this.effectiveCrossAlignment = POS_START_S;
    }

    compute(): RectPXType[] {
        this.#resolveEffectiveAlignments();
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

    #resolveEffectiveAlignments(): void {
        const crossDirectionValue = crossDirection(this.#flowDirection);
        const rawMainAlignment = this.align[alignKey(this.#flowDirection)];
        const rawCrossAlignment = this.align[alignKey(crossDirectionValue)];
        const normalizedMainAlignment = rawMainAlignment ? posMap.get(rawMainAlignment) ?? rawMainAlignment : POS_START_S;
        const normalizedCrossAlignment = rawCrossAlignment ? posMap.get(rawCrossAlignment) ?? rawCrossAlignment : POS_START_S;
        const mainAxisHasFractionalSpans = this.#readAxisSpans(this.#flowDirection).some((span) => typeof span !== 'number');

        this.effectiveCrossAlignment = normalizedCrossAlignment;

        if (normalizedMainAlignment !== POS_FILL) {
            this.effectiveMainAlignment = normalizedMainAlignment;
            return;
        }

        this.effectiveMainAlignment = mainAxisHasFractionalSpans ? POS_START_S : POS_CENTER_S;
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
        const normalizedAxisAlignment = normalizedDirection === this.#flowDirection
            ? this.effectiveMainAlignment
            : this.effectiveCrossAlignment;
        const resolvedAxisSpans = configuredAxisSpans
            .filter((span): span is number => typeof span === 'number');

        if (normalizedDirection === this.#flowDirection) {
            return configuredAxisSpans.map((span) => typeof span === 'number' ? span : 0);
        }

        if (normalizedAxisAlignment === POS_FILL) {
            return configuredAxisSpans.map(() => parentSize(direction, this.parent));
        }

        if (resolvedAxisSpans.length === 0) {
            return configuredAxisSpans.map(() => 0);
        }

        const largestResolvedSpan = Math.max(...resolvedAxisSpans);
        return configuredAxisSpans.map((span) => typeof span === 'number' ? span : largestResolvedSpan);
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
        const startingRemainder = this.mainAxisRemainder;
        const fractionalAxisSpanIndices: number[] = [];
        let totalFractionalWeight = 0;

        axisSpans.forEach((span, index) => {
            if (typeof span === 'number') {
                return;
            }
            fractionalAxisSpanIndices.push(index);
            totalFractionalWeight += span.value;
        });

        if (fractionalAxisSpanIndices.length === 0) {
            return;
        }

        fractionalAxisSpanIndices.forEach((index) => {
            const span = axisSpans[index];
            if (typeof span === 'number') {
                return;
            }
            axisSpans[index] = startingRemainder === 0 || totalFractionalWeight === 0
                ? 0
                : startingRemainder * (span.value / totalFractionalWeight);
        });

        this.mainAxisResolvedSpanTotal = axisSpans.reduce<number>(
            (sum, span) => sum + (typeof span === 'number' ? span : 0),
            0,
        );
    }

    #placeChildren(): void {
        const widths = this.#resolvedAxisSpans(DIR_HORIZ_S);
        const heights = this.#resolvedAxisSpans(DIR_VERT_S);
        const mainDirection = this.#flowDirection;

        switch (this.effectiveMainAlignment) {
            case POS_CENTER_S:
                this.#placeChildrenCenter(widths, heights, mainDirection, this.effectiveCrossAlignment);
                return;
            case POS_END_S:
                this.#placeChildrenRight(widths, heights, mainDirection, this.effectiveCrossAlignment);
                return;
            case POS_FILL:
            case POS_START_S:
            default:
                this.#placeChildrenLeft(widths, heights, mainDirection, this.effectiveCrossAlignment);
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
            const normalizedCrossAlignment = crossAlignment ? posMap.get(crossAlignment) ?? crossAlignment : POS_START_S;
            const crossX = normalizedCrossAlignment === POS_FILL
                ? 0
                : alignOffset(crossAlignment, Math.max(this.parent.w - width, 0));
            const crossY = normalizedCrossAlignment === POS_FILL
                ? 0
                : alignOffset(crossAlignment, Math.max(this.parent.h - height, 0));

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
