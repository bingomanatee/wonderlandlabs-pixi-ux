import { describe, expect, it } from 'vitest';
import { BoxTree, createBoxTreeState } from '../src/BoxTree';
import { ALIGN, MEASUREMENT_MODE, SIZE_MODE_INPUT } from '../src/constants';

describe('BoxTree', () => {
  describe('state creation', () => {
    it('defaults order to 0 and absolute to false', () => {
      const state = createBoxTreeState({
        id: 'root',
        area: { x: 0, y: 0 },
      });

      expect(state.order).toBe(0);
      expect(state.absolute).toBe(false);
      expect(state.align.direction).toBe('column');
    });

    it('requires explicit x/y for the root area anchor', () => {
      expect(() => createBoxTreeState({
        id: 'bad-root',
        area: { width: 10, height: 10 },
      })).toThrow(/root requires explicit x and y/i);
    });

    it('supports only valid align values', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: { x: 0, y: 0 },
        align: {
          x: 'outer' as never,
        },
      })).toThrow(/invalid option|unsupported align/i);
    });

    it('supports only numeric px constrain values', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: { x: 0, y: 0 },
        constrain: {
          x: {
            min: { mode: SIZE_MODE_INPUT.HUG as never, value: 10 },
          },
        },
      })).toThrow(/number/i);
    });

    it('normalizes area pivot aliases to canonical values', () => {
      const state = createBoxTreeState({
        id: 'pivot-test',
        area: {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          px: '>',
          py: '|',
        },
      });

      expect(state.area.px).toBe('e');
      expect(state.area.py).toBe('c');
    });

    it('accepts text and url content payloads', () => {
      const textState = createBoxTreeState({
        id: 'text-node',
        area: { x: 0, y: 0 },
        content: { type: 'text', value: 'hello' },
      });
      const urlState = createBoxTreeState({
        id: 'url-node',
        area: { x: 0, y: 0 },
        content: { type: 'url', value: 'https://example.com/image.png' },
      });

      expect(textState.content).toEqual({ type: 'text', value: 'hello' });
      expect(urlState.content).toEqual({ type: 'url', value: 'https://example.com/image.png' });
    });

    it('rejects invalid content type', () => {
      expect(() => createBoxTreeState({
        id: 'bad-content',
        area: { x: 0, y: 0 },
        content: { type: 'markdown', value: 'oops' } as never,
      })).toThrow(/invalid option|invalid enum value/i);
    });
  });

  describe('branching and identity', () => {
    it('computes full identity path from ids + child map keys', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
      });

      expect(root.identityPath).toBe('root');
      expect(child.identityPath).toBe('root/child');
    });

    it('passively creates child branches with wildcard branch params', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 500, height: 300 },
        children: new Map([
          ['a', {
            area: { width: 100, height: 50 },
          }],
        ]),
      });

      const child = root.getChild('a');
      expect(child).toBeDefined();
      expect(child?.identityPath).toBe('root/a');

      const children = root.children;
      expect(children.map((c) => c.name)).toEqual(['a']);
    });

    it('passively creates nested child branches through children.* wildcard', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 500, height: 300 },
        children: new Map([
          ['a', {
            area: { x: 0, y: 0, width: 100, height: 100 },
            children: new Map([
              ['b', {
                area: { width: 50, height: 50 },
              }],
            ]),
          }],
        ]),
      });

      const a = root.getChild('a');
      expect(a).toBeDefined();

      const b = a?.getChild('b');
      expect(b).toBeDefined();
      expect(b?.identityPath).toBe('root/a/b');
    });

    it('mappifies non-Map object children during state prep', () => {
      class ChildBag {
        alpha: { area: { width: number; height: number } };

        constructor() {
          this.alpha = { area: { width: 20, height: 10 } };
        }
      }

      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: new ChildBag() as unknown as Record<string, { area: { width: number; height: number } }>,
      });

      expect(root.value.children).toBeInstanceOf(Map);
      expect(root.value.children?.has('alpha')).toBe(true);
      expect(root.getChild('alpha')?.identityPath).toBe('root/alpha');
    });

    it('rejects object children when constructing from StoreParams value', () => {
      expect(() => new BoxTree({
        value: {
          id: 'root',
          area: { x: 0, y: 0, width: 100, height: 100 },
          align: { x: 's', y: 's', direction: 'column' },
          children: {
            alpha: {
              id: 'alpha',
              area: { x: 0, y: 0, width: 10, height: 10 },
              align: { x: 's', y: 's', direction: 'column' },
            },
          },
        } as unknown as never,
        branchParams: new Map(),
      } as never)).toThrow(/map/i);
    });
  });

  describe('geometry resolution', () => {
    it('arranges siblings in a column by default', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          a: { area: { width: 10, height: 10 } },
          b: { area: { width: 10, height: 10 } },
        },
      });

      const a = root.getChild('a');
      const b = root.getChild('b');
      expect(a?.x).toBe(0);
      expect(a?.y).toBe(0);
      expect(b?.x).toBe(0);
      expect(b?.y).toBe(10);
    });

    it('arranges siblings in a row when direction is row', () => {
      const root = new BoxTree({
        id: 'root',
        align: { direction: 'row' },
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          a: { area: { width: 10, height: 10 } },
          b: { area: { width: 10, height: 10 } },
        },
      });

      const a = root.getChild('a');
      const b = root.getChild('b');
      expect(a?.x).toBe(0);
      expect(a?.y).toBe(0);
      expect(b?.x).toBe(10);
      expect(b?.y).toBe(0);
    });

    it('resolves px constraints from local values', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
        constrain: {
          x: {
            min: 200,
            max: 200,
          },
          y: {
            min: 50,
            max: 50,
          },
        },
      });

      expect(child.value.area.width).toEqual({ mode: MEASUREMENT_MODE.PX, value: 10 });
      expect(child.value.area.height).toEqual({ mode: MEASUREMENT_MODE.PX, value: 10 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);

      root.setWidthPx(300);
      root.setHeightPx(120);

      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('uses relative x/y and computes absolute world coordinates via absX/absY', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.E, y: ALIGN.C },
      });

      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
      expect(child.absX).toBe(305);
      expect(child.absY).toBe(101);
    });

    it('applies area pivot offsets to resolved x/y', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 200, height: 100 },
      });

      const child = root.addChild('child', {
        area: {
          x: 40,
          y: 20,
          width: 10,
          height: 8,
          px: '>',
          py: '|',
        },
      });

      expect(child.anchorX).toBe(40);
      expect(child.anchorY).toBe(20);
      expect(child.x).toBe(30);
      expect(child.y).toBe(16);
      expect(child.absX).toBe(30);
      expect(child.absY).toBe(16);
    });

    it('supports fill alignment for child sizing', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 2, y: 3, width: 10, height: 10 },
        align: { x: ALIGN.F, y: ALIGN.F },
      });

      expect(child.width).toBe(400);
      expect(child.height).toBe(200);
      expect(child.x).toBe(2);
      expect(child.y).toBe(3);
      expect(child.absX).toBe(12);
      expect(child.absY).toBe(23);
    });

    it('absolute children ignore align positioning and fill sizing', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 10, y: 20, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: {
          x: 7,
          y: 8,
          width: { mode: MEASUREMENT_MODE.PERCENT, value: 0.25 },
          height: { mode: MEASUREMENT_MODE.PERCENT, value: 0.5 },
        },
        align: { x: ALIGN.FILL, y: ALIGN.END },
        absolute: true,
      });

      expect(child.x).toBe(7);
      expect(child.y).toBe(8);
      expect(child.width).toBe(100);
      expect(child.height).toBe(100);
      expect(child.absX).toBe(17);
      expect(child.absY).toBe(28);
    });
  });

  describe('align input', () => {
    it('accepts symbol aliases for start/center/end align', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.END, y: ALIGN.CENTER },
      });

      expect(child.value.align).toEqual({ x: ALIGN.E, y: ALIGN.C, direction: 'column' });
      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
    });

    it('supports readable align constants', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 5, y: 6, width: 100, height: 50 },
        align: { x: ALIGN.RIGHT, y: ALIGN.MIDDLE },
      });

      expect(child.value.align).toEqual({ x: ALIGN.E, y: ALIGN.C, direction: 'column' });
      expect(child.x).toBe(295);
      expect(child.y).toBe(81);
    });

    it('accepts "<>" alias for fill align', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });

      const child = root.addChild('child', {
        area: { x: 2, y: 3, width: 10, height: 10 },
        align: { x: ALIGN.FILL, y: ALIGN.F },
      });

      expect(child.value.align).toEqual({ x: ALIGN.F, y: ALIGN.F, direction: 'column' });
      expect(child.width).toBe(400);
      expect(child.height).toBe(200);
    });
  });

  describe('constraints', () => {
    it('respects only min when min/max constraints are impossible', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 200, height: 100 },
      });

      const child = root.addChild('child', {
        area: { width: 5, height: 10 },
        constrain: {
          x: {
            min: 10,
            max: 8,
          },
        },
      });

      expect(child.width).toBe(10);
    });
  });

  describe('children lifecycle', () => {
    it('manages optional children map with add/remove', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      root.addChild('a', {
        area: { width: 10, height: 10 },
      });

      expect(root.value.children?.has('a')).toBe(true);

      root.removeChild('a');
      expect(root.value.children).toBeUndefined();
      expect(root.children).toEqual([]);
    });

    it('sorts children by order ascending, then key', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
        children: {
          z: { area: { width: 10, height: 10 }, order: 2 },
          a: { area: { width: 10, height: 10 }, order: 1 },
          b: { area: { width: 10, height: 10 }, order: 1 },
        },
      });

      expect([...root.childrenMap.keys()]).toEqual(['a', 'b', 'z']);

      const z = root.getChild('z');
      expect(z).toBeDefined();
      z?.setOrder(0);

      expect([...root.childrenMap.keys()]).toEqual(['z', 'a', 'b']);
    });
  });

  describe('measurement and setter helpers', () => {
    it('supports direction setter', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.direction).toBe('column');
      root.setDirection('row');
      expect(root.direction).toBe('row');
    });

    it('supports px and % setter helpers', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: { width: 10, height: 10 },
      });

      child.setWidthPercent(0.5);
      child.setHeightPercent(0.25);
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);

      child.setWidthPx(320);
      child.setHeightPx(180);
      expect(child.value.area.width).toEqual({ mode: MEASUREMENT_MODE.PX, value: 320 });
      expect(child.value.area.height).toEqual({ mode: MEASUREMENT_MODE.PX, value: 180 });
    });

    it('accepts "/" measurements as a % alias', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: {
          width: { mode: MEASUREMENT_MODE.FRACTION, value: 1, base: 2 },
          height: { mode: MEASUREMENT_MODE.FRACTION, value: 1, base: 4 },
        },
      });

      expect(child.value.area.width).toEqual({ mode: MEASUREMENT_MODE.PERCENT, value: 0.5 });
      expect(child.value.area.height).toEqual({ mode: MEASUREMENT_MODE.PERCENT, value: 0.25 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('supports readable measurement mode constants', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 400, height: 200 },
      });
      const child = root.addChild('child', {
        area: {
          width: { mode: MEASUREMENT_MODE.FRACTION, value: 1, base: 2 },
          height: { mode: MEASUREMENT_MODE.PERCENT, value: 0.25 },
        },
      });

      expect(child.value.area.width).toEqual({ mode: MEASUREMENT_MODE.PERCENT, value: 0.5 });
      expect(child.value.area.height).toEqual({ mode: MEASUREMENT_MODE.PERCENT, value: 0.25 });
      expect(child.width).toBe(200);
      expect(child.height).toBe(50);
    });

    it('rejects "/" measurements when base is less than value', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: {
          x: 0,
          y: 0,
          width: { mode: MEASUREMENT_MODE.FRACTION, value: 3, base: 2 },
        },
      })).toThrow(/base must be >= value/i);
    });

    it('requires base for "/" measurements', () => {
      expect(() => createBoxTreeState({
        id: 'bad',
        area: {
          x: 0,
          y: 0,
          width: { mode: MEASUREMENT_MODE.FRACTION, value: 0.5 },
        },
      })).toThrow(/required|invalid input/i);
    });

    it('supports content setter helpers', () => {
      const root = new BoxTree({
        id: 'root',
        area: { x: 0, y: 0, width: 100, height: 100 },
      });

      expect(root.content).toBeUndefined();

      root.setContent({ type: 'text', value: 'Caption body' });
      expect(root.content).toEqual({ type: 'text', value: 'Caption body' });

      root.setContent({ type: 'url', value: 'https://example.com/caption.svg' });
      expect(root.content).toEqual({ type: 'url', value: 'https://example.com/caption.svg' });

      root.clearContent();
      expect(root.content).toBeUndefined();
    });
  });
});
