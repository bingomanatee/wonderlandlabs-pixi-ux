---
slug: utils-shared-render-helper-march-2026
title: Forestry Pixi UX 1.2.2 Release Notes -- Utils, Shared Render Helper (March 2026)
tags: [utils, rendering, observe-drag, root-container, release]
---

`@wonderlandlabs-pixi-ux/utils` now provides a shared app-level render helper used by `observe-drag` and `root-container`.

## What shipped

- `getSharedRenderHelper(app, config?)` for app-scoped throttled render coordination.
- `WeakMap` singleton behavior keyed by app instance.
- First-config-wins policy per app (timing is locked by first retrieval).
- Automatic helper cleanup when `app.destroy(...)` is called.

## Why it matters

Multiple drag/zoom consumers on the same app now share one render-throttle stream 
instead of each creating independent throttled render pipelines. This ensures that multiple calls to the helper will 
all be throttled by the same initial settings and not multiply the number of renders requested. 

If your app needs a specific timing profile, initialize the shared helper during app boot with your preferred config.
