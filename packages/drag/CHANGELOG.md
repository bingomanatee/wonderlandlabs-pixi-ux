# CHANGELOG

## 1.1.8 - 2026-03-04

- Added an optional `coordinateSpace` parameter to `startDragContainer(...)` so drag deltas are resolved in an explicit shared local space.
- Resolved dragged item start position in the same coordinate space via `toGlobal(...)` + `toLocal(...)`, avoiding immediate-parent scale assumptions.

## 1.1.6 - 2026-03-03

- Fixed drag delta scaling under zoom/transformed parents by resolving pointer coordinates in the dragged target's parent space (`toLocal`), so drag distance matches pointer movement.

## 1.1.3 - 2026-03-02

- upgrade to pixi 8.16

## 1.1.1 - 2026-02-27

- Instituted a deeper style-key pattern using dot-separated noun parts, with interCaps compatibility in style-tree.
- Raised the Node runtime baseline to `>=20.0.0`.
