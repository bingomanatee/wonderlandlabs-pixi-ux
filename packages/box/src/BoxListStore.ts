import { Application, ContainerOptions } from 'pixi.js';
import {
    combineLatest,
    distinctUntilChanged,
    map,
    startWith,
    type Subscription
} from 'rxjs';
import { BoxStore } from './BoxStore';
import type { AxisDef, BoxListConfig, BoxProps, Direction, GapMode } from './types';

/**
 * BoxListStore - A box that contains child boxes with layout
 *
 * Children are laid out based on:
 * - direction: 'horizontal' or 'vertical'
 * - gap: spacing between children
 * - gapMode: where gaps are applied (between, before, after, all)
 * - child's xDef.align / yDef.align: alignment of each child in cross-axis
 *
 * Size modes:
 * - fixed: explicit size
 * - hug: resize to fit children
 * - fill: children with fill mode expand to fill available space
 */
export class BoxListStore extends BoxStore {
    #children: BoxStore[] = [];
    #direction: Direction;
    #gap: number;
    #gapMode: GapMode;
    #childrenDimensionSubscription?: Subscription;
    #childrenDimensionSubscriptionKey?: string;

    constructor(
        config: BoxListConfig,
        app: Application,
        boxProps?: BoxProps,
        rootProps?: ContainerOptions
    ) {
        super(config, app, boxProps, rootProps);
        this.#direction = config.direction ?? 'horizontal';
        this.#gap = config.gap ?? 0;
        this.#gapMode = config.gapMode ?? 'between';
    }

    get direction(): Direction {
        return this.#direction;
    }

    setDirection(direction: Direction): void {
        this.#direction = direction;
        this.markDirty();
    }

    get gap(): number {
        return this.#gap;
    }

    setGap(gap: number): void {
        this.#gap = gap;
        this.markDirty();
    }

    get gapMode(): GapMode {
        return this.#gapMode;
    }

    setGapMode(gapMode: GapMode): void {
        this.#gapMode = gapMode;
        this.markDirty();
    }

    #clearChildrenDimensionSubscription(): void {
        this.#childrenDimensionSubscription?.unsubscribe();
        this.#childrenDimensionSubscription = undefined;
        this.#childrenDimensionSubscriptionKey = undefined;
    }

    #getChildrenDimensionSubscriptionKey(): string {
        return [
            this.value.xDef.sizeMode,
            this.value.yDef.sizeMode,
            ...this.#children.map(child => child.id),
        ].join('|');
    }

    #syncChildrenDimensionSubscription(): void {
        const hasHugAxis = this.value.xDef.sizeMode === 'hug' || this.value.yDef.sizeMode === 'hug';
        const nextKey = this.#getChildrenDimensionSubscriptionKey();

        if (!hasHugAxis || this.#children.length === 0) {
            this.#clearChildrenDimensionSubscription();
            return;
        }

        if (this.#childrenDimensionSubscriptionKey === nextKey) {
            return;
        }

        this.#clearChildrenDimensionSubscription();

        const childrenSizeStreams = this.#children.map((child) => {
            const initialSize: [number, number] = [child.value.width, child.value.height];
            return child.$subject.pipe(
                map((value): [number, number] => [value.width, value.height]),
                distinctUntilChanged(([prevW, prevH], [nextW, nextH]) => prevW === nextW && prevH === nextH),
                startWith(initialSize),// may not be necessary
            );
        });

        this.#childrenDimensionSubscription = combineLatest(childrenSizeStreams).subscribe(
            () => {
            this.markDirty();
        });
        this.#childrenDimensionSubscriptionKey = nextKey;
    }

    addChild(child: BoxStore): void {
        child.setParent(this);
        this.#children.push(child);
        this._contentContainer.addChild(child.container);
        this.#syncChildrenDimensionSubscription();
        this.markDirty();
    }

    removeChild(child: BoxStore): void {
        const index = this.#children.indexOf(child);
        if (index >= 0) {
            this.#children.splice(index, 1);
            child.setParent(null);
            this._contentContainer.removeChild(child.container);
            this.#syncChildrenDimensionSubscription();
            this.markDirty();
        }
    }

    get children(): readonly BoxStore[] {
        return this.#children;
    }

    /**
     * Apply min/max constraints to a size value
     */
    #applyMinMax(axisDef: AxisDef, size: number): number {
        let result = size;
        if (axisDef.min !== undefined) {
            result = Math.max(axisDef.min, result);
        }
        if (axisDef.max !== undefined) {
            result = Math.min(axisDef.max, result);
        }
        return result;
    }

    #layoutChildren(): void {
        if (this.#children.length === 0) return;

        const { xDef, yDef, padding } = this.value;
        const p = padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
        const isHorizontal = this.#direction === 'horizontal';
        const contentArea = this.getContentArea();
        const parentMainSize = isHorizontal ? contentArea.width : contentArea.height;

        const totals = this.#children.reduce((acc, child) => {
            const childMainDef = isHorizontal ? child.xDef : child.yDef;
            switch (childMainDef.sizeMode) {
                case 'px': {
                    acc.pxChildren.push(child);
                    acc.pxTotal += childMainDef.size;
                    break;
                }
                case 'percent': {
                    acc.percentChildren.push(child);
                    const size = this.#applyMinMax(childMainDef, parentMainSize * childMainDef.size);
                    if (isHorizontal) {
                        child.setSize(size, child.rect.height);
                    } else {
                        child.setSize(child.rect.width, size);
                    }
                    acc.percentTotal += size;
                    break;
                }
                case 'percentFree': {
                    acc.totalWeight += childMainDef.size;
                    acc.percentFreeChildren.push(child);
                    break;
                }
                case 'hug': {
                    acc.hugChildren.push(child);
                    const childRect = child.rect;
                    acc.hugTotal += isHorizontal ? childRect.width : childRect.height;
                    break;
                }
            }
            return acc;
        }, {
            pxTotal: 0,
            percentTotal: 0,
            hugTotal: 0,
            totalWeight: 0,
            pxChildren: [] as BoxStore[],
            percentChildren: [] as BoxStore[],
            percentFreeChildren: [] as BoxStore[],
            hugChildren: [] as BoxStore[],
        });

        // 4. Calculate percentFree children (weighted share of free space)
        // freeSpace = parentSize - px siblings - gaps
        // mySize = freeSpace * (myWeight / sumOfAllWeights)
        // Calculate total gaps based on gapMode:
        // - between: gaps only between children (n-1 gaps)
        // - before: gap before first + between (n gaps)
        // - after: between + gap after last (n gaps)
        // - all: before + between + after (n+1 gaps)
        const totalGaps = this.#calculateTotalGaps();
        const freeSpace = Math.max(0, parentMainSize - totals.pxTotal - totals.percentTotal - totals.hugTotal - totalGaps);

        // Distribute free space by weight
        for (const child of totals.percentFreeChildren) {
            const childMainDef = isHorizontal ? child.xDef : child.yDef;
            const rawSize = totals.totalWeight > 0 ? freeSpace * (childMainDef.size / totals.totalWeight) : 0;
            // For percentFree, min is subordinate to available space
            const minSize = Math.min(childMainDef.min ?? 0, rawSize);
            const size = Math.min(childMainDef.max ?? Infinity, Math.max(minSize, rawSize));
            if (isHorizontal) {
                child.setSize(size, child.rect.height);
            } else {
                child.setSize(child.rect.width, size);
            }
        }

        // Position children sequentially based on gapMode
        const hasBefore = this.#gapMode === 'before' || this.#gapMode === 'all';
        const hasAfter = this.#gapMode === 'after' || this.#gapMode === 'all';

        let mainPos = hasBefore ? this.#gap : 0;
        let maxCrossSize = 0;

        for (let i = 0; i < this.#children.length; i++) {
            const child = this.#children[i];
            const childRect = child.rect;
            const isLast = i === this.#children.length - 1;

            if (isHorizontal) {
                child.setPosition(mainPos, 0);
                mainPos += childRect.width;
                // Add gap after unless it's the last child and we don't have 'after' mode
                if (!isLast || hasAfter) {
                    mainPos += this.#gap;
                }
                maxCrossSize = Math.max(maxCrossSize, childRect.height);
            } else {
                child.setPosition(0, mainPos);
                mainPos += childRect.height;
                if (!isLast || hasAfter) {
                    mainPos += this.#gap;
                }
                maxCrossSize = Math.max(maxCrossSize, childRect.width);
            }
        }

        const totalMainSize = mainPos;

        // Hug mode: resize parent to fit children
        if (xDef.sizeMode === 'hug' || yDef.sizeMode === 'hug') {
            this.mutate(draft => {
                if (xDef.sizeMode === 'hug') {
                    draft.width = (isHorizontal ? totalMainSize : maxCrossSize) + p.left + p.right;
                    draft.xDef = { ...draft.xDef, size: draft.width };
                }
                if (yDef.sizeMode === 'hug') {
                    draft.height = (isHorizontal ? maxCrossSize : totalMainSize) + p.top + p.bottom;
                    draft.yDef = { ...draft.yDef, size: draft.height };
                }
            });
        }

        // Handle cross-axis sizing and alignment
        // Re-fetch content area in case hug mode resized the box
        const finalContentArea = this.getContentArea();
        for (const child of this.#children) {
            const childXDef = child.xDef;
            const childYDef = child.yDef;

            // First, handle cross-axis fill/percentFree - expand to fill parent's cross dimension
            if (isHorizontal) {
                // For horizontal list, cross-axis is Y
                if (childYDef.sizeMode === 'percentFree' || childYDef.sizeMode === 'percent') {
                    // Fill the cross-axis height
                    child.setSize(child.rect.width, finalContentArea.height);
                }
            } else {
                // For vertical list, cross-axis is X
                if (childXDef.sizeMode === 'percentFree' || childXDef.sizeMode === 'percent') {
                    // Fill the cross-axis width
                    child.setSize(finalContentArea.width, child.rect.height);
                }
            }

            // Then position based on alignment (only matters if child is smaller than cross-axis)
            const childRect = child.rect;
            if (isHorizontal) {
                let newY = 0;
                if (childYDef.align === 'center') {
                    newY = (finalContentArea.height - childRect.height) / 2;
                } else if (childYDef.align === 'end') {
                    newY = finalContentArea.height - childRect.height;
                }
                child.setPosition(child.rect.x, newY);
            } else {
                let newX = 0;
                if (childXDef.align === 'center') {
                    newX = (finalContentArea.width - childRect.width) / 2;
                } else if (childXDef.align === 'end') {
                    newX = finalContentArea.width - childRect.width;
                }
                child.setPosition(newX, child.rect.y);
            }
        }
    }

    /**
     * Calculate total gap space based on gapMode:
     * - between: gaps only between children (n-1 gaps)
     * - before: gap before first + between (n gaps)
     * - after: between + gap after last (n gaps)
     * - all: before + between + after (n+1 gaps)
     */
    #calculateTotalGaps(): number {
        if (this.#children.length === 0) return 0;

        let totalGaps = 0;

        // Gap before first child
        if (this.#gapMode === 'before' || this.#gapMode === 'all') {
            totalGaps += this.#gap;
        }

        // Gaps between children
        for (let i = 0; i < this.#children.length - 1; i++) {
            totalGaps += this.#gap;
        }

        // Gap after last child
        if (this.#gapMode === 'after' || this.#gapMode === 'all') {
            totalGaps += this.#gap;
        }

        return totalGaps;
    }

    protected override resolve(): void {
        this.#syncChildrenDimensionSubscription();
        this.#layoutChildren();
        super.resolve();
    }

    override cleanup(): void {
        this.#clearChildrenDimensionSubscription();
        for (const child of this.#children) {
            child.cleanup();
        }
        this.#children = [];
        super.cleanup();
    }
}
