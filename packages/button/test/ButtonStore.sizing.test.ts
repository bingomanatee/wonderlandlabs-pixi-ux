import {describe, expect, it, vi} from 'vitest';
import {type Application, CanvasTextMetrics} from 'pixi.js';
import {fromJSON, type StyleTree} from '@wonderlandlabs-pixi-ux/style-tree';
import {ButtonStore} from '../src/ButtonStore';
import sizingStyles from './fixtures/button.sizing.styles.json';

type QueuedTick = {
    fn: () => void;
    context?: unknown;
};

function createMockApplication(): { app: Application; flushTicker: () => void } {
    const queuedTicks: QueuedTick[] = [];

    const ticker = {
        addOnce(fn: () => void, context?: unknown) {
            queuedTicks.push({fn, context});
        },
        remove() {
            // no-op in tests
        },
    };

    const app = {ticker} as unknown as Application;

    const flushTicker = () => {
        let guard = 0;
        while (queuedTicks.length > 0) {
            guard += 1;
            if (guard > 200) {
                throw new Error('Ticker flush exceeded safety limit');
            }
            const next = queuedTicks.shift()!;
            next.fn.call(next.context);
        }
    };

    return {app, flushTicker};
}

function createStyleTree() {
    return fromJSON(sizingStyles);
}

const TEXT_LABEL = 'Test';
const TEXT_HEIGHT_FACTOR = 1.2;

function getStyleNumber(
    styleTree: StyleTree,
    nouns: string[],
    states: string[] = []
): number {
    const value = styleTree.match({nouns, states});
    if (typeof value !== 'number') {
        throw new Error(`Expected numeric style value for ${nouns.join('.')} with states [${states.join(',')}]`);
    }
    return value;
}

describe('ButtonStore sizing', () => {
    it('computes icon mode size from icon.size + padding', () => {
        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const button = new ButtonStore(
            {id: 'icon-size', mode: 'icon'},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();

        const iconSizeX = getStyleNumber(styleTree, ['button', 'icon', 'size', 'x']);
        const iconSizeY = getStyleNumber(styleTree, ['button', 'icon', 'size', 'y']);
        const paddingX = getStyleNumber(styleTree, ['button', 'padding', 'x']);
        const paddingY = getStyleNumber(styleTree, ['button', 'padding', 'y']);
        const expectedWidth = iconSizeX + paddingX * 2;
        const expectedHeight = iconSizeY + paddingY * 2;

        expect(button.rect.width).toBe(expectedWidth);
        expect(button.rect.height).toBe(expectedHeight);

        button.cleanup();
    });

    it('recomputes icon mode size on hover state', () => {
        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const button = new ButtonStore(
            {id: 'icon-hover-size', mode: 'icon'},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();
        const baseIconSizeX = getStyleNumber(styleTree, ['button', 'icon', 'size', 'x']);
        const baseIconSizeY = getStyleNumber(styleTree, ['button', 'icon', 'size', 'y']);
        const paddingX = getStyleNumber(styleTree, ['button', 'padding', 'x']);
        const paddingY = getStyleNumber(styleTree, ['button', 'padding', 'y']);
        const expectedBaseWidth = baseIconSizeX + paddingX * 2;
        const expectedBaseHeight = baseIconSizeY + paddingY * 2;
        expect(button.rect.width).toBe(expectedBaseWidth);
        expect(button.rect.height).toBe(expectedBaseHeight);

        button.setHovered(true);
        flushTicker();
        const hoverIconSizeX = getStyleNumber(styleTree, ['button', 'icon', 'size', 'x'], ['hover']);
        const hoverIconSizeY = getStyleNumber(styleTree, ['button', 'icon', 'size', 'y'], ['hover']);
        const expectedHoverWidth = hoverIconSizeX + paddingX * 2;
        const expectedHoverHeight = hoverIconSizeY + paddingY * 2;
        expect(button.rect.width).toBe(expectedHoverWidth);
        expect(button.rect.height).toBe(expectedHoverHeight);

        button.cleanup();
    });

    it('uses iconVertical style path for iconVertical mode sizing', () => {
        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const button = new ButtonStore(
            {id: 'icon-vertical-size', mode: 'iconVertical'},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();

        const iconSizeX = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'x']);
        const iconSizeY = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'y']);
        const paddingX = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'x']);
        const paddingY = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'y']);
        const expectedWidth = iconSizeX + paddingX * 2;
        const expectedHeight = iconSizeY + paddingY * 2;

        expect(button.rect.width).toBe(expectedWidth);
        expect(button.rect.height).toBe(expectedHeight);

        button.cleanup();
    });

    it('recomputes iconVertical size on hover with iconVertical hover styles', () => {
        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const button = new ButtonStore(
            {id: 'icon-vertical-hover-size', mode: 'iconVertical'},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();
        const baseIconSizeX = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'x']);
        const baseIconSizeY = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'y']);
        const paddingX = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'x']);
        const paddingY = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'y']);
        const expectedBaseWidth = baseIconSizeX + paddingX * 2;
        const expectedBaseHeight = baseIconSizeY + paddingY * 2;
        expect(button.rect.width).toBe(expectedBaseWidth);
        expect(button.rect.height).toBe(expectedBaseHeight);

        button.setHovered(true);
        flushTicker();
        const hoverIconSizeX = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'x'], ['hover']);
        const hoverIconSizeY = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'y'], ['hover']);
        const expectedHoverWidth = hoverIconSizeX + paddingX * 2;
        const expectedHoverHeight = hoverIconSizeY + paddingY * 2;
        expect(button.rect.width).toBe(expectedHoverWidth);
        expect(button.rect.height).toBe(expectedHoverHeight);

        button.cleanup();
    });

    it('distributes iconVertical children with iconGap on the y axis', () => {
        const textMetricsSpy = vi
            .spyOn(CanvasTextMetrics, 'measureText')
            .mockImplementation((text: string, style: { fontSize?: number }) => {
                const fontSize = style.fontSize ?? 13;
                return {
                    width: text.length * fontSize,
                    height: fontSize * TEXT_HEIGHT_FACTOR,
                } as any;
            });

        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const labelText = 'ABCD';
        const button = new ButtonStore(
            {id: 'icon-vertical-layout', mode: 'iconVertical', label: labelText},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();

        const iconGap = getStyleNumber(styleTree, ['button', 'iconVertical', 'iconGap']);
        const paddingX = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'x']);
        const paddingY = getStyleNumber(styleTree, ['button', 'iconVertical', 'padding', 'y']);
        const iconSizeX = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'x']);
        const iconSizeY = getStyleNumber(styleTree, ['button', 'iconVertical', 'icon', 'size', 'y']);
        const labelFontSize = getStyleNumber(styleTree, ['button', 'iconVertical', 'label', 'fontSize']);

        const [iconChild, labelChild] = button.children;
        const expectedLabelWidth = labelText.length * labelFontSize;
        const expectedLabelHeight = labelFontSize * TEXT_HEIGHT_FACTOR;

        expect(iconChild.rect.y).toBe(0);
        expect(labelChild.rect.y).toBe(iconChild.rect.height + iconGap);

        const expectedWidth = Math.max(iconSizeX, expectedLabelWidth) + paddingX * 2;
        const expectedHeight = iconSizeY + iconGap + expectedLabelHeight + paddingY * 2;

        expect(button.rect.width).toBe(expectedWidth);
        expect(button.rect.height).toBe(expectedHeight);

        button.cleanup();
        textMetricsSpy.mockRestore();
    });

    it('computes text mode size with mocked text metrics (no browser canvas required)', () => {
        const textMetricsSpy = vi
            .spyOn(CanvasTextMetrics, 'measureText')
            .mockImplementation((text: string, style: { fontSize?: number }) => {
                const fontSize = style.fontSize ?? 13;
                return {
                    width: text.length * fontSize,
                    height: fontSize * 1.2,
                } as any;
            });

        const {app, flushTicker} = createMockApplication();
        const styleTree = createStyleTree();
        const button = new ButtonStore(
            {id: 'text-size', mode: 'text', label: TEXT_LABEL},
            styleTree,
            app
        );

        button.kickoff();
        flushTicker();

        const textFontSize = getStyleNumber(styleTree, ['button', 'text', 'label', 'fontSize']);
        const textPaddingX = getStyleNumber(styleTree, ['button', 'text', 'padding', 'x']);
        const textPaddingY = getStyleNumber(styleTree, ['button', 'text', 'padding', 'y']);
        const textWidth = TEXT_LABEL.length * textFontSize;
        const textHeight = textFontSize * TEXT_HEIGHT_FACTOR;
        const expectedWidth = textWidth + textPaddingX * 2;
        const expectedHeight = textHeight + textPaddingY * 2;

        expect(button.rect.width).toBe(expectedWidth);
        expect(button.rect.height).toBe(expectedHeight);

        button.cleanup();
        textMetricsSpy.mockRestore();
    });
});
