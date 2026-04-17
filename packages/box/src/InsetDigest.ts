import {
    INSET_PART_BOTTOM,
    INSET_PART_LEFT,
    INSET_PART_RIGHT,
    INSET_PART_TOP,
    INSET_SCOPE_ALL,
    INSET_SCOPE_BOTTOM,
    INSET_SCOPE_HORIZ,
    INSET_SCOPE_LEFT,
    INSET_SCOPE_RIGHT,
    INSET_SCOPE_TOP,
    INSET_SCOPE_VERT,
    SIZE_PCT,
    SIZE_PX,
} from './constants.js';
import type { InsetPartType, BoxInsetDefType, BoxInsetType, BoxSizeType, RectStaticType } from './types.js';

export type InsetRecord = Record<InsetPartType, number>;

export class InsetDigest {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;

    constructor(defs: BoxInsetType = [], parentRect: RectStaticType) {
        const insets = defs.reduce<InsetRecord>((nextInsets, def) => {
            return InsetDigest.#apply(nextInsets, def, parentRect);
        }, {
            [INSET_PART_TOP]: 0,
            [INSET_PART_RIGHT]: 0,
            [INSET_PART_BOTTOM]: 0,
            [INSET_PART_LEFT]: 0,
        });

        this.top = insets[INSET_PART_TOP];
        this.right = insets[INSET_PART_RIGHT];
        this.bottom = insets[INSET_PART_BOTTOM];
        this.left = insets[INSET_PART_LEFT];
    }

    toRecord(): InsetRecord {
        return {
            [INSET_PART_TOP]: this.top,
            [INSET_PART_RIGHT]: this.right,
            [INSET_PART_BOTTOM]: this.bottom,
            [INSET_PART_LEFT]: this.left,
        };
    }

    apply(parentRect: RectStaticType): RectStaticType {
        return {
            x: parentRect.x + this.left,
            y: parentRect.y + this.top,
            w: Math.max(parentRect.w - this.left - this.right, 0),
            h: Math.max(parentRect.h - this.top - this.bottom, 0),
        };
    }

    static #resolveSize(input: BoxSizeType, parentSize: number): number {
        if (typeof input === 'number') {
            return input;
        }
        const { value, unit, base } = input;
        switch (unit) {
            case SIZE_PCT:
                return parentSize * value / (base ?? 100);
            case SIZE_PX:
            case undefined:
            default:
                return value;
        }
    }

    static #resolveValue(def: BoxInsetDefType, parentRect: RectStaticType): { horizontal: number; vertical: number } {
        return {
            horizontal: InsetDigest.#resolveSize(def.value, parentRect.w),
            vertical: InsetDigest.#resolveSize(def.value, parentRect.h),
        };
    }

    static #apply(insets: InsetRecord, def: BoxInsetDefType, parentRect: RectStaticType): InsetRecord {
        const { scope } = def;
        const { horizontal, vertical } = InsetDigest.#resolveValue(def, parentRect);

        switch (scope) {
            case INSET_SCOPE_ALL:
                return {
                    [INSET_PART_TOP]: vertical,
                    [INSET_PART_RIGHT]: horizontal,
                    [INSET_PART_BOTTOM]: vertical,
                    [INSET_PART_LEFT]: horizontal,
                };
            case INSET_SCOPE_HORIZ:
                return { ...insets, [INSET_PART_LEFT]: horizontal, [INSET_PART_RIGHT]: horizontal };
            case INSET_SCOPE_VERT:
                return { ...insets, [INSET_PART_TOP]: vertical, [INSET_PART_BOTTOM]: vertical };
            case INSET_SCOPE_TOP:
                return { ...insets, [INSET_PART_TOP]: vertical };
            case INSET_SCOPE_RIGHT:
                return { ...insets, [INSET_PART_RIGHT]: horizontal };
            case INSET_SCOPE_BOTTOM:
                return { ...insets, [INSET_PART_BOTTOM]: vertical };
            case INSET_SCOPE_LEFT:
                return { ...insets, [INSET_PART_LEFT]: horizontal };
            default:
                return insets;
        }
    }
}
