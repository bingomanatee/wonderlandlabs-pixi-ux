import { describe, expect, it } from 'vitest';
import { InsetDigest } from '../src/InsetDigest.js';
import {
    INSET_SCOPE_ALL,
    INSET_SCOPE_HORIZ,
    INSET_SCOPE_RIGHT,
    INSET_SCOPE_TOP,
} from '../src/constants.js';

describe('InsetDigest', () => {
    it('resolves the all scope uniformly', () => {
        expect(new InsetDigest([
            { scope: INSET_SCOPE_ALL, value: 4 },
        ], { x: 0, y: 0, w: 100, h: 100 }).toRecord()).toEqual({
            top: 4,
            right: 4,
            bottom: 4,
            left: 4,
        });
    });

    it('applies later scope definitions over earlier broader ones', () => {
        expect(new InsetDigest([
            { scope: INSET_SCOPE_ALL, value: 4 },
            { scope: INSET_SCOPE_HORIZ, value: 8 },
            { scope: INSET_SCOPE_TOP, value: 2 },
            { scope: INSET_SCOPE_RIGHT, value: 10 },
        ], { x: 0, y: 0, w: 100, h: 100 }).toRecord()).toEqual({
            top: 2,
            right: 10,
            bottom: 4,
            left: 8,
        });
    });

    it('resolves percent inset values against each axis independently', () => {
        expect(new InsetDigest([
            { scope: INSET_SCOPE_ALL, value: { value: 10, unit: '%' } },
        ], { x: 0, y: 0, w: 200, h: 100 }).toRecord()).toEqual({
            top: 10,
            right: 20,
            bottom: 10,
            left: 20,
        });
    });
});
