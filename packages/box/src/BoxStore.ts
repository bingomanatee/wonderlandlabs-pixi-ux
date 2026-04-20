import {Forest} from '@wonderlandlabs/forestry4';
import {map, pairwise, Subscription} from 'rxjs';
import type {BoxCellType, BoxPreparedCellType, BoxStyleManagerLike, RectStaticType} from './types.js';
import {collectRemovedIds, layoutCell, prepareBoxCellTree, rectToAbsolute} from "./helpers.js";

type BoxStoreConfig = {
    value: BoxCellType;
};

export class BoxStore extends Forest<BoxPreparedCellType> {
    #styles: BoxStyleManagerLike[] = [];
    #killSubscription?: Subscription;
    public killList = new Set<string>();

    constructor(config: BoxStoreConfig) {
        super({
            value: prepareBoxCellTree(config.value),
            // @ts-ignore Forestry binds prep to the store instance at runtime.
            prep(next: BoxCellType) {
                return prepareBoxCellTree(next, (this as BoxStore).value);
            },
        });
        this.#killSubscription = this.$subject.pipe(
            map((value) => value as BoxPreparedCellType),
            pairwise(),
        ).subscribe(this.$.addToKillList);
    }

    update() {
        for (let pass = 0; pass < 5; pass += 1) {
            const next = layoutCell(this.value);
            if (samePreparedCell(this.value, next)) {
                break;
            }
            this.mutate((draft) => {
                Object.assign(draft, next);
            });
        }
    }

    get location(): RectStaticType {
        const {dim, location} = this.value;
        return rectToAbsolute(dim ?? location);
    }

    get rect(): { x: number; y: number; width: number; height: number } {
        const {x, y, w, h} = this.location;
        return {x, y, width: w, height: h};
    }

    get styles(): BoxStyleManagerLike[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return [...(parentStore?.styles ?? []), ...this.#styles];
    }

    set styles(styles: BoxStyleManagerLike[] | undefined) {
        this.#styles = styles ?? [];
    }

    get styleStates(): string[] {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return Array.from(new Set([
            ...(parentStore?.styleStates ?? []),
            ...(this.value.verbs ?? this.value.states ?? []),
        ]));
    }

    get variant(): string | undefined {
        const parentStore = this.$parent instanceof BoxStore ? this.$parent : undefined;
        return this.value.variant ?? parentStore?.variant;
    }

    addToKillList([previous, next]: [BoxPreparedCellType, BoxPreparedCellType]): void {
        this.killList = collectRemovedIds(previous, next);
    }

    clearKillList(): void {
        this.killList.clear();
    }

    applyTextMeasures(measures: Map<string, {w: number; h: number}>): boolean {
        let hasChanges = false;
        this.mutate((draft) => {
            hasChanges = applyTextMeasuresToCell(draft, measures) || hasChanges;
        });
        if (hasChanges) {
            this.update();
        }
        return hasChanges;
    }

    complete(): BoxPreparedCellType {
        this.#killSubscription?.unsubscribe();
        this.#killSubscription = undefined;
        this.killList.clear();
        return super.complete();
    }
}

function samePreparedCell(a: BoxPreparedCellType, b: BoxPreparedCellType): boolean {
    if (
        a.id !== b.id
        || a.name !== b.name
        || a.textWidth !== b.textWidth
        || a.textHeight !== b.textHeight
        || !sameRect(a.location, b.location)
    ) {
        return false;
    }

    const aChildren = a.children ?? [];
    const bChildren = b.children ?? [];
    if (aChildren.length !== bChildren.length) {
        return false;
    }

    for (let index = 0; index < aChildren.length; index += 1) {
        if (!samePreparedCell(aChildren[index], bChildren[index])) {
            return false;
        }
    }

    return true;
}

function sameRect(a?: RectStaticType, b?: RectStaticType): boolean {
    if (!a || !b) {
        return a === b;
    }
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function applyTextMeasuresToCell(
    cell: BoxPreparedCellType,
    measures: Map<string, {w: number; h: number}>,
): boolean {
    let hasChanges = false;
    const measure = measures.get(cell.id);
    if (measure && cell.content?.type === 'text') {
        const nextWidth = Math.max(0, measure.w);
        const nextHeight = Math.max(0, measure.h);
        if (cell.textWidth !== nextWidth) {
            cell.textWidth = nextWidth;
            hasChanges = true;
        }
        if (cell.textHeight !== nextHeight) {
            cell.textHeight = nextHeight;
            hasChanges = true;
        }
    }

    for (const child of cell.children ?? []) {
        hasChanges = applyTextMeasuresToCell(child, measures) || hasChanges;
    }

    return hasChanges;
}
