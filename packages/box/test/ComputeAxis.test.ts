import { describe, expect, it } from 'vitest';
import { ComputeAxis } from '../src/ComputeAxis.js';
import {
  DIR_HORIZ,
  DIR_VERT,
  POS_CENTER,
  POS_END,
  POS_START,
  SIZE_PCT,
} from '../src/constants.js';
import type { BoxAlign, RectPXType, RectPartialType } from '../src/types.js';
import { renderComputeAxisHtml } from './renderComputeAxisHtml.js';
import { renderComputeAxisSvg } from './renderComputeAxisSvg.js';

const parent: RectPXType = { x: 10, y: 20, w: 300, h: 120 };

function expectScenario(
  name: string,
  align: BoxAlign['_type'],
  dims: RectPartialType[],
  expected: RectPXType[],
): void {
  const locations = new ComputeAxis(align, parent, dims).compute();
  const svgPath = renderComputeAxisSvg({ name, parent, align, dims, locations });
  renderComputeAxisHtml({ name, svgPath, parent, align, dims, locations });
  expect(locations).toEqual(expected);
}

describe('ComputeAxis', () => {
  it('stacks horizontal children from the start by default', () => {
    expectScenario(
      'stacks horizontal children from the start by default',
      { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
      [
        { w: 50, h: 20 },
        { w: 100, h: 30 },
      ],
      [
      { x: 10, y: 20, w: 50, h: 20 },
      { x: 60, y: 20, w: 100, h: 30 },
      ],
    );
  });

  it('aligns the run on the main axis and children on the cross axis', () => {
    expectScenario(
      'aligns the run on the main axis and children on the cross axis',
      { direction: DIR_HORIZ, xPosition: POS_CENTER, yPosition: POS_END },
      [
        { w: 50, h: 20 },
        { w: 100, h: 30 },
      ],
      [
      { x: 85, y: 120, w: 50, h: 20 },
      { x: 135, y: 110, w: 100, h: 30 },
      ],
    );
  });

  it('resolves width and height against their own parent dimensions', () => {
    expectScenario(
      'resolves width and height against their own parent dimensions',
      { direction: DIR_VERT, xPosition: POS_START, yPosition: POS_START },
      [
        {
          w: { value: 50, unit: SIZE_PCT },
          h: { value: 25, unit: SIZE_PCT },
        },
      ],
      [
      { x: 10, y: 20, w: 150, h: 30 },
      ],
    );
  });

  it('stacks vertical children and centers them on the cross axis', () => {
    expectScenario(
      'stacks vertical children and centers them on the cross axis',
      { direction: DIR_VERT, xPosition: POS_CENTER, yPosition: POS_START },
      [
        { w: 60, h: 20 },
        { w: 100, h: 30 },
      ],
      [
      { x: 130, y: 20, w: 60, h: 20 },
      { x: 110, y: 40, w: 100, h: 30 },
      ],
    );
  });
});
