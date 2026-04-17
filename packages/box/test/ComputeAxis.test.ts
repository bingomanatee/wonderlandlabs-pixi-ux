import { describe, expect, it } from 'vitest';
import { ComputeAxis } from '../src/ComputeAxis.js';
import {
  DIR_HORIZ,
  DIR_VERT,
  POS_CENTER,
  POS_END,
  POS_FILL,
  POS_START,
  SIZE_FRACTION,
  SIZE_PCT,
} from '../src/constants.js';
import type { BoxAlign, RectPXType, RectPartialType } from '../src/types.js';

const parent: RectPXType = { x: 10, y: 20, w: 300, h: 120 };

function expectScenario(
  name: string,
  align: BoxAlign['_type'],
  dims: RectPartialType[],
  expected: RectPXType[],
): void {
  void name;
  const locations = new ComputeAxis(align, parent, dims).compute();
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

  it('uses the largest resolved peer span for cross-axis fractional sizes', () => {
    expectScenario(
      'uses the largest resolved peer span for cross-axis fractional sizes',
      { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
      [
        { w: 50, h: 20 },
        { w: 60, h: { value: 1, unit: SIZE_FRACTION } },
        { w: 70, h: 30 },
      ],
      [
        { x: 10, y: 20, w: 50, h: 20 },
        { x: 60, y: 20, w: 60, h: 30 },
        { x: 120, y: 20, w: 70, h: 30 },
      ],
    );
  });

  it('distributes main-axis fractional spans by weight from the remainder', () => {
    expectScenario(
      'distributes main-axis fractional spans by weight from the remainder',
      { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_START },
      [
        { w: 60, h: 20 },
        { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
        { w: { value: 2, unit: SIZE_FRACTION }, h: 20 },
      ],
      [
        { x: 10, y: 20, w: 60, h: 20 },
        { x: 70, y: 20, w: 80, h: 20 },
        { x: 150, y: 20, w: 160, h: 20 },
      ],
    );
  });

  it('fills the parent cross span when cross-axis alignment is fill', () => {
    expectScenario(
      'fills the parent cross span when cross-axis alignment is fill',
      { direction: DIR_HORIZ, xPosition: POS_START, yPosition: POS_FILL },
      [
        { w: 50, h: 20 },
        { w: 100, h: { value: 1, unit: SIZE_FRACTION } },
      ],
      [
        { x: 10, y: 20, w: 50, h: 120 },
        { x: 60, y: 20, w: 100, h: 120 },
      ],
    );
  });

  it('treats main-axis fill as centered when there are no fractional spans', () => {
    expectScenario(
      'treats main-axis fill as centered when there are no fractional spans',
      { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
      [
        { w: 50, h: 20 },
        { w: 100, h: 20 },
      ],
      [
        { x: 85, y: 20, w: 50, h: 20 },
        { x: 135, y: 20, w: 100, h: 20 },
      ],
    );
  });

  it('treats main-axis fill as start-aligned when fractional spans are present', () => {
    expectScenario(
      'treats main-axis fill as start-aligned when fractional spans are present',
      { direction: DIR_HORIZ, xPosition: POS_FILL, yPosition: POS_START },
      [
        { w: 60, h: 20 },
        { w: { value: 1, unit: SIZE_FRACTION }, h: 20 },
      ],
      [
        { x: 10, y: 20, w: 60, h: 20 },
        { x: 70, y: 20, w: 240, h: 20 },
      ],
    );
  });
});
