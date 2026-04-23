import { describe, expect, it } from 'vitest';
import { boxTreeToJSON, type BoxLayoutCellType, type BoxStyleManagerLike } from '../src/index.js';

function createStyleManager(entries: Record<string, unknown>): BoxStyleManagerLike {
  const lookup = (nouns: string[], states: string[]) => {
    const nounKey = nouns.join('.');
    const stateKey = states.join(',');
    const exactKey = `${nounKey}:${stateKey}`;
    if (exactKey in entries) {
      return entries[exactKey];
    }

    const result: Record<string, unknown> = {};
    const prefixes = [`${nounKey}.`, `*.${nounKey}.`];
    const suffix = `:${stateKey}`;
    for (const [key, value] of Object.entries(entries)) {
      const prefix = prefixes.find((candidate) => key.startsWith(candidate) && key.endsWith(suffix));
      if (!prefix) {
        continue;
      }
      const remainder = key.slice(prefix.length, key.length - suffix.length).split('.');
      let current = result;
      remainder.forEach((segment, index) => {
        if (index === remainder.length - 1) {
          current[segment] = value;
          return;
        }
        current[segment] = (current[segment] as Record<string, unknown> | undefined) ?? {};
        current = current[segment] as Record<string, unknown>;
      });
    }

    return Object.keys(result).length > 0 ? result : undefined;
  };

  return {
    match: (query) => lookup(query.nouns, query.states),
    matchHierarchy: (query) => lookup(query.nouns, query.states),
  };
}

describe('boxTreeToJSON', () => {
  it('parses fill and text styling without Pixi', () => {
    const styles = createStyleManager({
      '*.button.primary.background.fill.direction:': 'vertical',
      '*.button.primary.background.fill.colors:': ['#111111', '#eeeeee'],
      '*.button.primary.border.color:': '#333333',
      '*.button.primary.border.width:': 2,
      '*.button.primary.font.color:': '#ffffff',
      '*.button.primary.font.size:': 18,
      '*.button.primary.font.align:': 'center',
    });

    const root: BoxLayoutCellType = {
      id: 'button-background',
      name: 'button',
      absolute: true,
      variant: 'primary',
      dim: { x: 10, y: 20, w: 200, h: 48 },
      location: { x: 10, y: 20, w: 200, h: 48 },
      align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
      content: {
        type: 'text',
        value: 'Launch',
      },
    };

    const model = boxTreeToJSON(root, [styles]);

    expect(model.background.fill).toEqual({
      direction: 'vertical',
      colors: ['#111111', '#eeeeee'],
    });
    expect(model.background.borderColor).toBe('#333333');
    expect(model.background.borderWidth).toBe(2);
    expect(model.content.kind).toBe('text');
    if (model.content.kind !== 'text') {
      throw new Error('expected text content');
    }
    expect(model.content.style.fill).toBe('#ffffff');
    expect(model.content.style.fontSize).toBe(18);
    expect(model.content.style.align).toBe('center');
  });
});
