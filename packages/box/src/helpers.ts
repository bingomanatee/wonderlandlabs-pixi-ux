import type {BoxSizeType, BoxSizeObjType, RectPartialType, DirectionType, RectPXType} from "./types.js";
import {BoxSizeObj} from "./types.js";
import {SIZE_PX, SIZE_PCT, SIZE_FRACTION, DIR_VERT_S, DIR_HORIZ_S, dirMap} from './constants.js';

type RectPartialKey = keyof RectPartialType;

function percentToNumber(value: number, location: RectPXType, direction: DirectionType, base?: number) {
    const dir = dirMap.get(direction);
    let parentSize = 0;

    switch (dir) {
        case DIR_HORIZ_S: {
            parentSize = location.w;
            break;
        }
        case DIR_VERT_S: {
            parentSize = location.h;
            break;
        }
        default:
            console.error('percentToNumber failure: ', arguments, 'cannot map', dir);
            throw new Error('cannot parse direction');
    }

    if (base) {
        return parentSize * value / base!;
    }
    return parentSize * value / 100; // percent values are expected to be "of 100" unless specified
}

type SizeToNumberInput = {
    input?: BoxSizeType;
    parentContainer?: RectPXType;
    direction?: DirectionType;
    skipFractional?: boolean;
}

export function toComplexSize(input?: BoxSizeType): BoxSizeObjType | undefined {
    if (input === undefined) {
        return undefined;
    }
    if (typeof input === 'number') {
        return {value: input, unit: SIZE_PX};
    }
    return input;
}

export function sizeToNumber({input, parentContainer, direction, skipFractional}: SizeToNumberInput) {
    if (input === undefined) {
        return 0;
    }
    const data = toComplexSize(input);
    const {unit, value, base} = data!;
    switch (unit) {
        case SIZE_PX: {
            return value;
        }
        case SIZE_PCT: {
            if (parentContainer && direction) {
                return percentToNumber(value, parentContainer, direction, base);
            }
            throw new Error('Cannot parse size without parent and direction');
        }
        case SIZE_FRACTION: {
            if (skipFractional) {
                return null;
            }
            throw new Error('Cannot resolve fractional size directly');
        }
        case undefined: {
            return value; // assume px
        }
        default:
            console.error('cannot parse', data, 'from', input);
            throw new Error(`unhandled unit "${unit}"`);
    }
}

const keys: RectPartialKey[] = ['x', 'y', 'w', 'h'];
const posKeys: RectPartialKey[] = ['x', 'y'];
const keyDirections: DirectionType[] = [DIR_HORIZ_S, DIR_VERT_S, DIR_HORIZ_S, DIR_VERT_S];

export function rectToAbsolute(r: RectPartialType, parentRect?: RectPXType): RectPXType {
    return keys.reduce((o: Record<string, unknown>, dim: RectPartialKey, index: number) => {
        const dir = keyDirections[index];
        const input = r[dim];
        if (input === undefined) {
            return {...o, [dim]: 0};
        }
        const computed = sizeToNumber({input, parentContainer: parentRect, direction: dir})
        return {...o, [dim]: computed}
    }, {}) as RectPXType;
}

export function rectHasFractionalSizes(r: RectPartialType, ignorePosition = false) {
    return keys.some((key: RectPartialKey) => {
        const value = r[key];
        if (value === undefined) return false;
        if (ignorePosition && posKeys.includes(key)) return false;
        return toComplexSize(value)?.unit === SIZE_FRACTION;
    })
}
