# @wonderlandlabs-pixi-ux/box

`box` is a small parent-driven layout model for rectangular children.

The current implementation is centered around:

- [`BoxStore`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/src/BoxStore.ts)
- [`ComputeAxis`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/src/ComputeAxis.ts)

## Current Model

- The parent owns alignment.
- Children provide dimensions.
- Child `x` / `y` are not part of the happy-path alignment flow.
- Width and height are computed from the parent container.
- All units are relative to the parent in the dimension they address.

That means:

- width-like values resolve against the parent width
- height-like values resolve against the parent height
- percent values are always percentages of the parent dimension
- absolute pixel values are still interpreted within the parent container

## Flow

The current layout pass is:

1. Resolve the main-axis spans for the children.
2. Complete unresolved fractional spans.
3. Place children from the parent alignment and the resolved spans.
4. Recurse into child boxes using the computed location rectangles.

`ComputeAxis` currently handles:

- absolute pixel dimensions
- percentage dimensions
- fractional dimensions on the main axis by weighted remainder distribution
- fractional dimensions on the cross axis by resolving to the largest resolved peer span
- cross-axis `fill`
- parent-owned start / center / end alignment

## Styles

`BoxStore` also exposes style context for renderers:

- `styles`
- `variant`
- `styleStates`
- `styleNouns`
- `resolveStyle(...)`

See [`README.STYLES.md`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/README.STYLES.md) for the renderer-facing contract.

## Status

This package is mid-refactor.

The active architecture is the simplified `BoxStore` / `ComputeAxis` path in `src/`.
Older `BoxTree`-style code still exists under [`src/_deprecated`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/src/_deprecated), but it is not the current direction.

## Test Artifacts

The `ComputeAxis` tests generate:

- SVG diagrams for layout inspection
- HTML tables for readable scenario metadata

These artifacts are written under [`packages/box/test/artifacts`](/Users/bingomanatee/Documents/repos/wonderlandlabs-pixi-ux/packages/box/test/artifacts) and are ignored by the package-level `.gitignore`.
