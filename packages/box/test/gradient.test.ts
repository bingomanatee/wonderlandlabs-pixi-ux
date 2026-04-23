import { describe, expect, it } from 'vitest';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import { resolvePixiFill, resolvePixiGradient } from '../src/toPixi.helpers.js';

const SAMPLE_RECT = {
  x: 0,
  y: 0,
  w: 200,
  h: 50,
};
const HEADLESS_PIXI = new PixiProvider(PixiProvider.fallbacks);

describe('background gradients', () => {
  it('resolves gradient from fill values', () => {
    const fillStyle = {
      direction: 'vertical',
      colors: ['#3B82F6', '#FFFFFF', '#EF4444'],
    };
    const gradient = resolvePixiFill(fillStyle, SAMPLE_RECT, HEADLESS_PIXI).gradient;

    expect(fillStyle).toEqual({
      direction: 'vertical',
      colors: ['#3B82F6', '#FFFFFF', '#EF4444'],
    });
    expect(gradient).toBeInstanceOf(HEADLESS_PIXI.FillGradient);
    expect(gradient?.colorStops).toHaveLength(3);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 0, y: 1 });
  });

  it('supports direction shortcut gradients with raw color arrays', () => {
    const gradient = resolvePixiGradient({
      direction: 'horizontal',
      colors: ['#000000', '#ffffff'],
    }, SAMPLE_RECT, HEADLESS_PIXI);

    expect(gradient).toBeInstanceOf(HEADLESS_PIXI.FillGradient);
    expect(gradient?.colorStops).toEqual([
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#ffffff' },
    ]);
    expect(gradient?.start).toEqual({ x: 0, y: 0 });
    expect(gradient?.end).toEqual({ x: 1, y: 0 });
  });
});
