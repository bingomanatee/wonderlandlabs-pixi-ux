import './setupNavigator';
import { describe, expect, it } from 'vitest';
import { fromJSON, type StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';
import { Container } from 'pixi.js';
import { ButtonStore } from '../src/ButtonStore';
import sizingStyles from './fixtures/button.sizing.styles.json';

type QueuedTick = {
  fn: () => void;
  context?: unknown;
};

type TickerHost = {
  ticker: {
    addOnce: (fn: () => void, context?: unknown) => void;
    remove: () => void;
  };
};

function createMockTickerHost(): { host: TickerHost; flushTicker: (maxTicks?: number) => void } {
  const queuedTicks: QueuedTick[] = [];

  const ticker = {
    addOnce(fn: () => void, context?: unknown) {
      queuedTicks.push({ fn, context });
    },
    remove() {
      // no-op for tests
    },
  };

  const host: TickerHost = { ticker };

  const flushTicker = (maxTicks = 500) => {
    let ticks = 0;
    while (queuedTicks.length > 0 && ticks < maxTicks) {
      ticks += 1;
      const next = queuedTicks.shift()!;
      next.fn.call(next.context);
    }
  };

  return { host, flushTicker };
}

function createStyleTree() {
  return fromJSON(sizingStyles);
}

function getStyleNumber(
  styleTree: StyleTree,
  nouns: string[],
  states: string[] = [],
): number {
  const value = styleTree.match({ nouns, states });
  if (typeof value !== 'number') {
    throw new Error(`Expected numeric style value for ${nouns.join('.')} with states [${states.join(',')}]`);
  }
  return value;
}

describe('ButtonStore interactions', () => {
  it('uses the default BoxTree UX container stack for rendering', () => {
    const { host, flushTicker } = createMockTickerHost();
    const styleTree = createStyleTree();
    const button = new ButtonStore(
      { id: 'interaction-default-ux', mode: 'text', label: 'Hello' },
      styleTree,
      host as never,
    );

    button.kickoff();
    flushTicker();

    expect(button.container.children.length).toBe(1);
    expect(button.container.children[0]).toBeInstanceOf(Container);
    const rootUxContainer = button.container.children[0] as Container;
    expect(rootUxContainer.children.length).toBeGreaterThan(0);

    button.cleanup();
  });

  it('toggles hover on pointerover/pointerout and recomputes hover sizing', () => {
    const { host, flushTicker } = createMockTickerHost();
    const styleTree = createStyleTree();
    const button = new ButtonStore(
      { id: 'interaction-hover', mode: 'icon' },
      styleTree,
      host as never,
    );

    button.kickoff();
    flushTicker();

    const baseIconSizeX = getStyleNumber(styleTree, ['button', 'icon', 'size', 'x']);
    const baseIconSizeY = getStyleNumber(styleTree, ['button', 'icon', 'size', 'y']);
    const paddingX = getStyleNumber(styleTree, ['button', 'padding', 'x']);
    const paddingY = getStyleNumber(styleTree, ['button', 'padding', 'y']);
    expect(button.rect.width).toBe(baseIconSizeX + paddingX * 2);
    expect(button.rect.height).toBe(baseIconSizeY + paddingY * 2);

    button.container.emit('pointerover');
    flushTicker();
    expect(button.isHovered).toBe(true);
    const hoverIconSizeX = getStyleNumber(styleTree, ['button', 'icon', 'size', 'x'], ['hover']);
    const hoverIconSizeY = getStyleNumber(styleTree, ['button', 'icon', 'size', 'y'], ['hover']);
    expect(button.rect.width).toBe(hoverIconSizeX + paddingX * 2);
    expect(button.rect.height).toBe(hoverIconSizeY + paddingY * 2);

    button.container.emit('pointerout');
    flushTicker();
    expect(button.isHovered).toBe(false);
    expect(button.rect.width).toBe(baseIconSizeX + paddingX * 2);
    expect(button.rect.height).toBe(baseIconSizeY + paddingY * 2);

    button.cleanup();
  });

  it('ignores hover interactions while disabled and clears hover when disabled', () => {
    const { host, flushTicker } = createMockTickerHost();
    const styleTree = createStyleTree();
    const button = new ButtonStore(
      { id: 'interaction-disabled', mode: 'icon' },
      styleTree,
      host as never,
    );

    button.kickoff();
    flushTicker();

    button.container.emit('pointerover');
    flushTicker();
    expect(button.isHovered).toBe(true);

    button.setDisabled(true);
    flushTicker();
    expect(button.isHovered).toBe(false);

    button.container.emit('pointerover');
    flushTicker();
    expect(button.isHovered).toBe(false);

    button.setDisabled(false);
    flushTicker();
    button.container.emit('pointerover');
    flushTicker();
    expect(button.isHovered).toBe(true);

    button.cleanup();
  });
});
