---
title: utils
description: Package README for @wonderlandlabs-pixi-ux/utils
---

# @wonderlandlabs-pixi-ux/utils

Repository: [https://github.com/bingomanatee/forestry-pixi/tree/main/packages/utils](https://github.com/bingomanatee/forestry-pixi/tree/main/packages/utils)

`utils` holds shared helpers that other Pixi UX packages use for render scheduling and scale-aware point reads.

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/utils
```

## `getSharedRenderHelper(app, options?)`

Returns one app-scoped render helper from an internal `WeakMap`, creating it on first access.

- The first call for a given `app` establishes the helper configuration.
- Later calls with the same `app` return the same helper instance.
- Shared helper internals are cleaned up automatically when `app.destroy(...)` runs.

```ts
import { getSharedRenderHelper } from '@wonderlandlabs-pixi-ux/utils';

const sharedRender = getSharedRenderHelper(app, { throttleMs: 30 });
sharedRender.request();
```

## `createRenderHelper(app, options?)`

Creates a throttled render helper for apps that expose `render()`.

Options:

- `throttleMs` default `30`
- `leading` default `true`
- `trailing` default `false`

```ts
import { createRenderHelper } from '@wonderlandlabs-pixi-ux/utils';

const helper = createRenderHelper(app, {
  throttleMs: 30,
  trailing: true,
});

helper.request();
helper.now();
helper.destroy();
```

## `readScalePoint(displayObject)`

Reads a display object's effective world scale into a point-like `{ x, y }` value.

Use it when layout or interaction code needs the actual resolved scale instead of a configured local scale.

```ts
import { readScalePoint } from '@wonderlandlabs-pixi-ux/utils';

const scale = readScalePoint(container);
console.log(scale.x, scale.y);
```
