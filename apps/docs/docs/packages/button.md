---
title: "button"
description: "Package README for @wonderlandlabs-pixi-ux/button"
---
# @wonderlandlabs-pixi-ux/button

Repository: [https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux](https://github.com/wonderlandlabs-pixi-ux/wonderlandlabs-pixi-ux)


`button` is the current low-level Pixi button primitive in this repo.
It renders from a `ButtonStateType`, lays itself out with `box`, and styles itself from `style-tree`.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/button @wonderlandlabs-pixi-ux/style-tree pixi.js
```

`pixi.js` is a peer dependency. `ButtonStore` renders through `PixiProvider`, so callers should either pass `pixi` explicitly or initialize `PixiProvider.shared` once at app startup.

## Shared Runtime Setup

`button` depends on `@wonderlandlabs-pixi-ux/utils` through the shared `PixiProvider` boundary.
Before using `ButtonStore`, read the shared provider guidance in [utils docs](/packages/utils) and initialize `PixiProvider` at app boot with `PixiProvider.init(Pixi)`.
For style naming, prefer the shared [Style DSL](/packages/style-tree-style-dsl). `button` is aligned with that DSL and still accepts a few older nested paths during migration.

## Basic Usage

```ts
import * as Pixi from 'pixi.js';
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';
import { PixiProvider } from '@wonderlandlabs-pixi-ux/utils';
import {
  ButtonStore,
  BTYPE_BASE,
} from '@wonderlandlabs-pixi-ux/button';

PixiProvider.init(Pixi);

const app = new Pixi.Application();
await app.init({ width: 800, height: 600 });

const styleTree = fromJSON({
  container: {
    padding: {
      '$*': [8, 14],
    },
    background: {
      fill: {
        '$*': '#2f7f74',
        '$hover': '#379286',
        '$disabled': '#70827e',
      },
    },
    border: {
      radius: {
        '$*': 8,
      },
      width: {
        '$*': 0,
      },
    },
    gap: {
      '$*': 8,
    },
  },
  label: {
    font: {
      size: {
        '$*': 14,
      },
      color: {
        '$*': '#ffffff',
      },
      alpha: {
        '$*': 1,
        '$disabled': 0.45,
      },
    },
  },
  icon: {
    size: {
      width: {
        '$*': 18,
      },
      height: {
        '$*': 18,
      },
    },
  },
});

const button = new ButtonStore({
  variant: BTYPE_BASE,
  label: 'Save',
  icon: '/icons/demo-icon.png',
  size: {
    x: 120,
    y: 120,
    width: 0,
    height: 0,
  },
}, {
  app,
  pixi: PixiProvider.shared,
  styleTree,
  handlers: {
    click: () => console.log('clicked'),
  },
});

app.stage.addChild(button.container);
button.kickoff();
```

## Constructor Contract

```ts
new ButtonStore(
  value: {
    variant: 'base' | 'text' | 'vertical' | 'avatar',
    label?: string,
    icon?: string,
    state?: string,
    modifiers?: string[],
    isDisabled?: boolean,
    isHovered?: boolean,
    isDebug?: boolean,
    size?: {
      x?: number,
      y?: number,
      width?: number,
      height?: number,
    },
  },
  options: {
    app?: Application,
    pixi?: PixiProvider,
    styleTree?: StyleTree | StyleTree[],
    styleDef?: unknown,
    handlers: Record<string, () => void>,
  },
)
```

Notes:
- `icon` is a URL string, not a `Sprite` or `Container`.
- `variant` controls the layout shape.
- `state` and `modifiers` become style states for lookup.
- `isDisabled` and `isHovered` are convenience inputs that normalize into `state`.
- If you want the button to wrap to its content, set `size.width` and `size.height` to `0`.
- `container.background.fill` can be either a solid color or a gradient object.

## Variants

- `base`: row layout for icon + label.
- `text`: text-first layout.
- `vertical`: icon over label.
- `avatar`: centered avatar-style content.

## StyleTree Shape

See the shared [Style DSL](/packages/style-tree-style-dsl) for the canonical naming model.
`button` is intended to follow that DSL directly, with only a small set of compatibility paths still accepted during migration.

Preferred DSL paths:

- `container.padding`
- `container.width`
- `container.height`
- `container.background.fill`
- `container.border.width`
- `container.border.color`
- `container.border.radius`
- `container.gap`
- `label.font.size`
- `label.font.family`
- `label.font.color`
- `label.font.alpha`
- `icon.size.width`
- `icon.size.height`
- `icon.alpha`

Compatibility paths still accepted during migration:

- `container.background.padding`
- `container.background.width`
- `container.background.height`
- `container.content.gap`
- `label.size`
- variant-specific branches such as `container.background.base` and `container.background.text`

Example variant targeting:

```ts
{
  container: {
    background: {
      base: {
        '$*': { fill: '#2f7f74' },
        '$hover': { fill: '#379286' },
      },
      text: {
        '$*': { fill: '#4b5563' },
      },
    },
  },
}
```

Example modifier targeting:

```ts
{
  container: {
    background: {
      fill: {
        '$danger': '#aa3f3f',
      },
    },
  },
}
```

## Main API

- `kickoff()`
- `dirty()`
- `resolve()`
- `hasStatus(name)`
- `setStatus(name, enabled)`
- `set(key, value)` / `mutate(fn)` from the underlying store
- `container`

## Notes

- Hover and tap listeners are bound to the rendered button container.
- The button uses `box` layout internally and resolves Pixi classes through `PixiProvider`; the public surface is the state object plus the Pixi container.
- The package docs and stories should use this state-driven contract as the source of truth.
