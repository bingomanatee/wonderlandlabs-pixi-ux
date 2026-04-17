# CHANGELOG

## 1.2.7 - 2026-04-17

- Added `StyleTree.setMany(...)` to expand object-shaped style values into path-based entries, with optional recursive flattening.
- Moved the package tests into `packages/style-tree/tests` for consistency with the rest of the repo.
- Added matcher-level coverage for wildcard object values and the new `setMany(...)` behavior.

## 1.2.2 - 2026-03-10

- Version alignment release: bumped package version to  for monorepo consistency.



## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
