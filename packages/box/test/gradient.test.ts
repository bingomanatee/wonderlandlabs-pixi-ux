import { describe, expect, it } from 'vitest';
import { FillGradient } from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { resolveStyleValue, styleContextForCell } from '../src/styleHelpers.js';
import { resolvePixiGradient } from '../src/toPixi.helpers.js';
import type { BoxCellType } from '../src/types.js';

const SAMPLE_RECT = {
  x: 0,
  y: 0,
  w: 200,
  h: 50,
};

describe('background gradients', () => {
  it('resolves gradient from background object values', () => {
    const styles = [fromJSON({
      container: {
        background: {
          $base: {
            gradient: {
              direction: 'vertical',
              colors: ['#3B82F6', '#FFFFFF', '#EF4444'],
            },
          },
        },
      },
    })];

    const cell: BoxCellType = {
      id: 'button-background',
      name: 'container',
      absolute: true,
      dim: SAMPLE_RECT,
      align: { direction: 'horizontal' },
      verbs: ['base?'],
    };
    const context = styleContextForCell(cell);
    const gradientStyle = {
      direction: resolveStyleValue(styles, context, ['background', 'gradient', 'direction']),
      colors: resolveStyleValue(styles, context, ['background', 'gradient', 'colors']),
    };
    const gradient = resolvePixiGradient(gradientStyle, SAMPLE_RECT);

    expect(gradientStyle.direction).toBe('vertical');
    expect(gradientStyle.colors).toEqual(['#3B82F6', '#FFFFFF', '#EF4444']);
    expect(gradient).toBeInstanceOf(FillGradient);
    expect(gradient?.colorStops).toHaveLength(3);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 0, y: 1 });
  });

  it('supports direction shortcut gradients with raw color arrays', () => {
    const gradient = resolvePixiGradient({
      direction: 'horizontal',
      colors: ['#000000', '#ffffff'],
    }, SAMPLE_RECT);

    expect(gradient).toBeInstanceOf(FillGradient);
    expect(gradient?.colorStops).toEqual([
      { offset: 0, color: '#000000ff' },
      { offset: 1, color: '#ffffffff' },
    ]);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 1, y: 0 });
  });
});
