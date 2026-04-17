import {Forest} from '@wonderlandlabs/forestry4';
import type {BoxCellType, BoxStyleManagerLike, RectPXType} from './types.js';
import {rectToAbsolute} from "./helpers.js";
import {ComputeAxis} from './ComputeAxis.js';

export class BoxStore extends Forest<BoxCellType> {
    #styles?: BoxStyleManagerLike;

    update() {
        const next = layoutCell(this.value);
        this.mutate((draft) => {
            Object.assign(draft, next);
        });
    }

    get location(): RectPXType {
        const {dim, location} = this.value;
        return rectToAbsolute(dim ?? location);
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        const {x, y, w, h} = this.location;
        return {x, y, width: w, height: h};
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
        const styles = this.styles;
        if (!styles) {
            return undefined;
        }

        const baseNouns = [...this.styleNouns, ...(options.extraNouns ?? []), ...propertyPath];
        const states = options.states ?? this.styleStates;
        const variant = this.variant;
        const leaf = baseNouns[baseNouns.length - 1];
        const withVariant = variant && baseNouns.length > 0
            ? [baseNouns[0], variant, ...baseNouns.slice(1)]
            : undefined;

        const queries = [
            ...(withVariant ? [{ nouns: withVariant, states }] : []),
            { nouns: baseNouns, states },
            ...(leaf ? [{ nouns: [leaf], states }] : []),
        ];

        for (const query of queries) {
            const result = styles.matchHierarchy
                ? styles.matchHierarchy(query)
                : styles.match(query);
            if (result !== undefined) {
                return result as T;
            }
        }

        return undefined;
    }
}

function layoutCell(cell: BoxCellType, parentRect?: RectPXType): BoxCellType {
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

    const childLocations: RectPXType[] = new ComputeAxis(
        align,
        ownLocation,
        children.map((child) => child.dim),
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
