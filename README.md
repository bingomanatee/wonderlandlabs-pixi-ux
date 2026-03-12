# Wonderlandlabs Pixi UX Monorepo

Reusable PixiJS UI/state packages for windows, drag/resize flows, layout, and rendering helpers.
This repo publishes the `@wonderlandlabs-pixi-ux/*` package set and keeps versions aligned for coordinated releases.

## Repository Layout

```text
wonderlandlabs-pixi-ux/
├── packages/                # publishable packages
│   ├── observe-drag/
│   ├── root-container/
│   ├── resizer/
│   ├── window/
│   ├── utils/
│   └── ...
└── apps/
    ├── docs/                # Docusaurus docs/blog
    ├── package-validator/   # integration/validation app
    └── reveal/              # Reveal.js presentation app
```

## Package Focus

- `@wonderlandlabs-pixi-ux/observe-drag`: serialized pointer drag ownership + drag decorators.
- `@wonderlandlabs-pixi-ux/root-container`: centered root + zoom/pan decorators.
- `@wonderlandlabs-pixi-ux/resizer`: interactive handle-based resize system.
- `@wonderlandlabs-pixi-ux/window`: draggable/resizable windows with titlebar/content renderers.
- `@wonderlandlabs-pixi-ux/ticker-forest`: ticker-synchronized resolve/dirty base class.
- `@wonderlandlabs-pixi-ux/utils`: shared runtime helpers (including shared render-helper singleton/lifecycle behavior).

See [CONTROLLERS.md](./CONTROLLERS.md) for controller conventions and usage patterns.

## Versioning and Release Policy

- Global alignment releases should update:
1. all `packages/*/package.json` versions
2. all internal `@wonderlandlabs-pixi-ux/*` dependency pins
3. the root [package.json](./package.json) version
- For the shared render-helper model:
1. first shared-helper retrieval for an app sets that app’s timing config
2. the helper lives for the app lifetime and auto-cleans on `app.destroy(...)`
3. later retrievals for the same app reuse that first helper/config

## Internal Dependency Topology

| Package | Internal dependencies |
| --- | --- |
| `@wonderlandlabs-pixi-ux/style-tree` | _none_ |
| `@wonderlandlabs-pixi-ux/ticker-forest` | _none_ |
| `@wonderlandlabs-pixi-ux/utils` | _none_ |
| `@wonderlandlabs-pixi-ux/observe-drag` | `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/root-container` | `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/utils` |
| `@wonderlandlabs-pixi-ux/box` | _none_ |
| `@wonderlandlabs-pixi-ux/button` | `@wonderlandlabs-pixi-ux/box`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/caption` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/drag` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/grid` | `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/resizer` | `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/toolbar` | `@wonderlandlabs-pixi-ux/button`, `@wonderlandlabs-pixi-ux/style-tree`, `@wonderlandlabs-pixi-ux/ticker-forest` |
| `@wonderlandlabs-pixi-ux/window` | `@wonderlandlabs-pixi-ux/observe-drag`, `@wonderlandlabs-pixi-ux/resizer`, `@wonderlandlabs-pixi-ux/ticker-forest`, `@wonderlandlabs-pixi-ux/toolbar` |

## Manual Publish Order

1. `@wonderlandlabs-pixi-ux/style-tree`
2. `@wonderlandlabs-pixi-ux/ticker-forest`
3. `@wonderlandlabs-pixi-ux/utils`
4. `@wonderlandlabs-pixi-ux/observe-drag`
5. `@wonderlandlabs-pixi-ux/box`
6. `@wonderlandlabs-pixi-ux/drag` (deprecated)
7. `@wonderlandlabs-pixi-ux/root-container`
8. `@wonderlandlabs-pixi-ux/button`
9. `@wonderlandlabs-pixi-ux/caption`
10. `@wonderlandlabs-pixi-ux/grid`
11. `@wonderlandlabs-pixi-ux/resizer`
12. `@wonderlandlabs-pixi-ux/toolbar`
13. `@wonderlandlabs-pixi-ux/window`

## Workspace Tooling (Yarn)

### Prerequisites

- Node.js `>=20`
- Corepack enabled

### Install

```bash
corepack enable
yarn install
```

### Common Commands

```bash
yarn build
yarn clean
yarn test
yarn docs:dev
yarn reveal:dev
yarn package-validator:dev
```

### Yarn Configuration

From `.yarnrc.yml`:

```yaml
nodeLinker: node-modules
enableGlobalCache: false
```

## License

MIT
