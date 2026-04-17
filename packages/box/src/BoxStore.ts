import {Forest} from '@wonderlandlabs/forestry4';
import type {BoxCellType, BoxStyleManagerLike, RectStaticType} from './types.js';
import {insetRect, rectToAbsolute} from "./helpers.js";
import {ComputeAxis} from './ComputeAxis.js';
import {resolveStyleValue} from './styleHelpers.js';

export class BoxStore extends Forest<BoxCellType> {
    #styles?: BoxStyleManagerLike;

    update() {
        const next = layoutCell(this.value);
        this.mutate((draft) => {
            Object.assign(draft, next);
        });
    }

    get location(): RectStaticType {
        const {dim, location} = this.value;
        return rectToAbsolute(dim ?? location);
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        const {x, y, w, h} = this.location;
        return {x, y, width: w, height: h};
    }

    get contentRect(): RectStaticType {
        return insetRect(this.location, this.value.insets ?? []);
    }

    get styles(): BoxStyleManagerLike | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.#styles ?? parentStore?.styles;
    }

    set styles(styles: BoxStyleManagerLike | undefined) {
        this.#styles = styles;
    }

    get styleStates(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styleStates ?? []), ...(this.value.states ?? [])];
    }

    get variant(): string | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.value.variant ?? parentStore?.variant;
    }

    get styleNouns(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styleNouns ?? []), this.value.name];
    }

    resolveStyle<T = unknown>(
        propertyPath: string[] = [],
        options: { states?: string[]; extraNouns?: string[] } = {},
    ): T | undefined {
        return resolveStyleValue<T>(this.styles, {
            nouns: this.styleNouns,
            states: this.styleStates,
            variant: this.variant,
        }, propertyPath, options);
    }
}

function layoutCell(cell: BoxCellType, parentRect?: RectStaticType): BoxCellType {
    const ownLocation = cell.location
        ? rectToAbsolute(cell.location)
        : rectToAbsolute(cell.dim, cell.absolute ? undefined : parentRect);
    const {children, align} = cell;

    if (!Array.isArray(children) || children.length === 0) {
        return {
            ...cell,
            location: ownLocation,
        };
    }

    const childLocations: RectStaticType[] = new ComputeAxis(
        align,
        ownLocation,
        children.map((child) => child.dim),
        {
            insets: cell.insets,
            gap: cell.gap,
        },
    ).compute();

    return {
        ...cell,
        location: ownLocation,
        children: children.map((child: BoxCellType, index: number) => layoutCell({
            ...child,
            location: childLocations[index],
        }, childLocations[index])),
    };
}
