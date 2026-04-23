---
title: "style tree style dsl"
description: "Topic guide for style-tree: style tree style dsl"
---
# Style DSL

This file defines the shared style topology for the `@wonderlandlabs-pixi-ux` monorepo.

The goal is to make package styling feel close to CSS:

- use familiar buckets like `background`, `border`, `font`, `padding`, and `gap`
- keep paths dot-separated and lowercase
- allow package-specific nouns only when the concept is truly package-specific
- use `fill` instead of `color` when a value may be either a solid color or a gradient

## Core Rules

- Prefer exploded paths over compound keys.
  - Use `label.font.size`
  - Avoid `label.fontSize`
- Prefer structural nouns over package-specific nouns.
  - Use `background.fill`
  - Avoid inventing `bubble.fill` unless the geometry is truly special
- Use `fill` for paint values that may be solid or gradient.
- Keep state handling orthogonal.
  - `button.$hover.label.font.color`
  - `button.$disabled.background.alpha`

## Canonical Paths

These are the shared paths packages should converge on.

### Background

- `*.background.fill`
- `*.background.alpha`
- `*.background.visible`

`background.fill` is polymorphic:

- solid string color
- solid numeric color
- rgb object
- gradient object

Examples:

```json
{
  "button": {
    "background": {
      "fill": "#1f2937",
      "alpha": 1
    }
  }
}
```

```json
{
  "button": {
    "background": {
      "fill": {
        "direction": "vertical",
        "colors": ["#f4f4f5", "#d4d4d8"]
      }
    }
  }
}
```

### Border

- `*.border.color`
- `*.border.width`
- `*.border.alpha`
- `*.border.radius`
- `*.border.visible`

### Font / Label

- `*.label.font.size`
- `*.label.font.family`
- `*.label.font.color`
- `*.label.font.alpha`
- `*.label.font.align`
- `*.label.font.weight`
- `*.label.font.style`
- `*.label.font.lineHeight`
- `*.label.font.letterSpacing`
- `*.label.font.wordWrap`
- `*.label.font.wordWrapWidth`
- `*.label.font.visible`

For generic text surfaces that are not explicitly labels, `*.font.*` is also acceptable.

### Spacing

- `*.padding`
- `*.gap`

`padding` may be:

- a single number
- a two-value array `[vertical, horizontal]`
- a four-value array `[top, right, bottom, left]`
- an object `{ top, right, bottom, left }`

## Package-Specific Extensions

Package-specific nouns are allowed when the concept is not just a normal box/background/font concern.

Examples:

- `caption.pointer.*`
- `caption.thought.*`
- `window.titlebar.*`

These should sit beside the shared structural DSL, not replace it.

Good:

- `caption.background.fill`
- `caption.border.radius`
- `caption.pointer.length`

Avoid:

- `caption.bubble.fill`
- `caption.bubble.stroke`

unless there is a concrete reason that the package must distinguish multiple background-like surfaces.

## Targeted Resolvers

`style-tree` now exposes shared parsers for common style roots:

- `resolveSpacing(tree, root, fallback?, options?)`
- `resolveGap(tree, root, fallback?, options?)`
- `resolveFill(tree, root, fallback?, options?)`
- `resolveBackgroundStyle(tree, root, fallback?, options?)`
- `resolveBorderStyle(tree, root, fallback?, options?)`
- `resolveFontStyle(tree, root, fallback?, options?)`

These helpers take a root such as:

- `button.container`
- `button.label`
- `window.titlebar`
- `caption`

and return normalized typed objects instead of requiring each package to manually query:

- `background.fill`
- `border.radius`
- `label.font.size`
- `padding`

Example:

```ts
import { fromJSON, resolveBackgroundStyle, resolveFontStyle } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = fromJSON({
  button: {
    container: {
      background: {
        fill: {
          direction: 'vertical',
          colors: ['#f8fafc', '#e2e8f0'],
        },
        alpha: 1,
      },
      border: {
        color: '#334155',
        width: 1,
        radius: 999,
      },
    },
    label: {
      font: {
        size: 14,
        family: 'IBM Plex Sans',
        color: '#0f172a',
      },
    },
  },
});

const background = resolveBackgroundStyle(tree, 'button.container');
const labelFont = resolveFontStyle(tree, 'button.label');
```

## Migration Guidance

When normalizing older package styles:

1. Move package-specific paint nouns toward `background.*` and `border.*`.
2. Move text styling toward `label.font.*`.
3. Preserve only truly custom geometry nouns.
4. Replace package-local parsers with the shared `style-tree` resolvers where possible.
