# TODO

- Achieve recursive layout so each child can compute and apply layout to its own children.
- Properly compute fractional dimensions on the main axis.
- Replace the current no-op fractional completion step with remainder distribution across unresolved spans.
- Decide how overflow should resolve when content exceeds the parent container:
  squash content to fit, crop content to the container, or allow overflow without intervention.
- Consider adding min/max sizing constraints, especially if fractional sizing makes alignment too inert.
- Keep the parent-owned alignment model strict: children define dimensions, parents place them.
