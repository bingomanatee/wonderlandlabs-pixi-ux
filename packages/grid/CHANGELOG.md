# CHANGELOG

## 1.2.0 - 2026-03-07

- Simplified grid spec API: replaced `gridMajor` spacing config with `majorGridFrequency`.
- `majorGridFrequency` supports either:
  - `number` (uniform X/Y frequency)
  - `{x, y}` (per-axis frequency)
- Major line spacing is now derived from base `grid` spacing (`grid * majorGridFrequency`).
- Updated grid rendering internals to treat base grid as the primary layer and compute major lines from frequency.

## 1.1.3 - 2026-03-02

- upgrade to pixi 8.16

## 1.1.2 - 2026-02-28

- Replaced previous texture-repeat grid rendering with direct `Graphics` redraw.
- Eliminated texture seam artifacts that could produce unintended intermediate-weight lines.
- Added optional grid container bitmap caching via `cacheAsTexture` (enabled by default at 2x resolution).
- Made cache resolution fully dynamic with zoom (`effectiveResolution = baseResolution * zoom`).
- Added optional cache debug mode (`cache.debug`) to report texture size and memory estimates on zoom redraw.
- Added cache debug log throttling support via `cache.debug.logIntervalMs`.
- Added renderer resize invalidation so the grid redraws when viewport size changes.
- Updated minor-line density fallback to preserve visible minor lines between majors at reduced zoom.

## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
