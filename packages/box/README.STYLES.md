# Box Styles

The rebuilt `box` package does not ship a default renderer.

Instead, [`BoxStore`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/src/BoxStore.ts) provides a small style-resolution surface that renderers can use after layout has been computed.

## Current Contract

A box cell can carry:

- `name`
- `variant`
- `states`
- `content`
- `children`

`BoxStore` contributes:

- `styles`
- `styleStates`
- `styleNouns`
- `variant`
- `resolveStyle(propertyPath, { states?, extraNouns? })`

The intent is:

- cells define nouns and state
- parents compute layout
- renderers ask the store for appearance

## Style Resolution

`resolveStyle()` builds noun paths from the current box node.

For a box named `button` with:

- `variant: 'primary'`
- `states: ['hover']`

and a renderer request of:

```ts
box.resolveStyle(['fill', 'color']);
```

the store will try, in order:

1. `button.primary.fill.color` with `['hover']`
2. `button.fill.color` with `['hover']`
3. `color` with `['hover']`

If `extraNouns` are provided, they are inserted between the box noun path and the property path. That is how higher-level components can express mode-specific branches such as:

- `button.inline.fill.color`
- `button.icon.vertical.icon.size.x`

## Expected Style Manager Shape

The style object attached to `box.styles` only needs to satisfy:

```ts
type BoxStyleQueryLike = {
  nouns: string[];
  states: string[];
};

type BoxStyleManagerLike = {
  match: (query: BoxStyleQueryLike) => unknown;
  matchHierarchy?: (query: BoxStyleQueryLike) => unknown;
};
```

[`@wonderlandlabs-pixi-ux/style-tree`](https://www.npmjs.com/package/@wonderlandlabs-pixi-ux/style-tree) already matches that shape and is the intended default pairing.

## Renderer Pattern

The happy-path renderer flow is:

1. Build or mutate the `BoxStore` tree.
2. Attach `styles` to the root store.
3. Call `box.update()` to compute locations.
4. Walk the resulting tree and render from `location`, `content`, and resolved styles.

That keeps the responsibilities separated:

- `ComputeAxis` resolves spans and alignment
- `BoxStore` owns the layout tree and style lookup context
- your renderer owns Pixi, HTML, SVG, canvas, or any other output target

## Example

```ts
import { BoxStore } from '@wonderlandlabs-pixi-ux/box';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const styles = fromJSON({
  button: {
    fill: {
      $*: { color: { r: 0.2, g: 0.4, b: 0.8 }, alpha: 1 }
    }
  }
});

const box = new BoxStore({
  value: {
    name: 'button',
    absolute: true,
    dim: { x: 0, y: 0, w: 120, h: 40 },
    align: { direction: 'horizontal', xPosition: 'center', yPosition: 'center' },
    children: [],
  },
});

box.styles = styles;
box.update();

const fillColor = box.resolveStyle(['fill', 'color']);
```

## Notes

- The old `BoxTree` / `BoxUxPixi` renderer stack still exists under [`src/_deprecated`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/src/_deprecated), but it is legacy code now.
- The new architecture is intentionally renderer-agnostic.
- `content` is descriptive data, not a renderer by itself.
