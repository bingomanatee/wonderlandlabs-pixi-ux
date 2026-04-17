# TODO

- use Immer/diff to only recompute the children that have changed or the children of changed nodes. 
- Decide how overflow should resolve when content exceeds the parent container:
  squash content to fit, crop content to the container, or allow overflow without intervention.
- Consider adding min/max sizing constraints, especially if fractional sizing makes alignment too inert.
- Keep the parent-owned alignment model strict: children define dimensions, parents place them.
- Add a first-class renderer package or reference renderer examples for Pixi, HTML, and SVG.
- Normalize package-root exports so sibling packages do not need `dist` subpath imports during local compilation.
