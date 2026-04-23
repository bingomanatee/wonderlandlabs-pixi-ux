import './setupNavigator';
import {describe, expect, it} from 'vitest';
import {fromJSON} from '@wonderlandlabs-pixi-ux/style-tree';
import defaultStyles from '../src/defaultStyles.json';
import {resolveStyleNumber, resolveStyleValue} from '../src/helpers';
import {BTYPE_BASE, BTYPE_VERTICAL} from '../src/constants';

const styles = [fromJSON(defaultStyles)];

describe('button style resolution', () => {
    it('resolves generic and variant dimensions through variant branches', () => {
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_BASE),
        ).toBe(200);
        expect(
            resolveStyleNumber(styles, 'container.background.width', ['start'], 0, BTYPE_VERTICAL),
        ).toBe(60);
    });

    it('stores the base resting fill as fill sub-properties and omits them on hover', () => {
        expect(
            resolveStyleValue(styles, 'container.background.fill.direction', ['start'], BTYPE_BASE),
        ).toBe('vertical');
        expect(
            resolveStyleValue(styles, 'container.background.fill.colors', ['start'], BTYPE_BASE),
        ).toEqual(['#D9D9D9', '#FFFFFF', '#BFBFBF']);
        expect(
            resolveStyleValue(styles, 'container.background.fill.direction', ['hover'], BTYPE_BASE),
        ).toBeUndefined();
    });

    it('resolves generic disabled alpha for label and icon', () => {
        expect(
            resolveStyleValue(styles, 'label.font.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
        expect(
            resolveStyleValue(styles, 'icon.alpha', ['disabled'], BTYPE_BASE),
        ).toBe(0.45);
    });

    it('accepts canonical container width, height, padding, and gap paths', () => {
        const canonicalStyles = [fromJSON({
            container: {
                width: 220,
                height: 44,
                padding: [7, 15],
                gap: 9,
            },
        })];

        expect(
            resolveStyleNumber(canonicalStyles, 'container.width', ['start'], 0, BTYPE_BASE),
        ).toBe(220);
        expect(
            resolveStyleNumber(canonicalStyles, 'container.height', ['start'], 0, BTYPE_BASE),
        ).toBe(44);
        expect(
            resolveStyleValue(canonicalStyles, 'container.padding', ['start'], BTYPE_BASE),
        ).toEqual([7, 15]);
        expect(
            resolveStyleNumber(canonicalStyles, 'container.gap', ['start'], 0, BTYPE_BASE),
        ).toBe(9);
    });
});
