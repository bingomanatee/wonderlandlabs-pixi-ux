# @wonderlandlabs-pixi-ux/style-tree

A hierarchical style matching system with noun paths and state arrays.

## Features

- Hierarchical noun paths (`navigation.button.icon`)
- State-based selection (`hover`, `disabled`, `selected`, ...)
- Wildcard matching in noun segments (`base.*.label`)
- Base-state matching with `*` state
- Hierarchical-to-atomic fallback via `matchHierarchy()`
- Ranking by specificity

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/style-tree
```

## Usage

```typescript
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

const tree = new StyleTree();

tree.set('base.*.label', [], { color: '#666', fontSize: 12 });
tree.set('navigation.button.text', [], { color: '#000', fontSize: 14 });
tree.set('navigation.button.text', ['hover'], { color: '#0066cc', fontSize: 14 });
tree.set('navigation.button.text', ['disabled', 'selected'], { color: '#999', fontSize: 14 });

const style = tree.match({
  nouns: ['navigation', 'button', 'text'],
  states: ['hover'],
});

const match = tree.findBestMatch({
  nouns: ['navigation', 'button', 'text'],
  states: ['hover'],
});

// Hierarchical first, then leaf fallback.
// Example: if "button.icon" is missing, fallback to "icon".
const iconStyle = tree.matchHierarchy({
  nouns: ['button', 'icon'],
  states: ['disabled'],
});
```

## Matching Rules

Score: `(matching nouns * 100) + matching states`

- Wildcard nouns (`*`) match any segment but do not add score.
- State `*` is a base state that matches any query states.
- State patterns can be less specific than query states:
  - `['disabled']` matches query `['disabled', 'selected']`
  - `['disabled', 'selected']` does not match query `['disabled']`

## API

Constructor:
- `new StyleTree(options?)`
  - `validateKeys?: boolean` (default `true`)
  - `autoSortStates?: boolean` (default `true`)

Methods:
- `set(nouns: string, states: string[], value: unknown): void`
- `get(nouns: string, states: string[]): unknown`
- `has(nouns: string, states: string[]): boolean`
- `match(query: { nouns: string[]; states: string[] }): unknown`
- `matchHierarchy(query: { nouns: string[]; states: string[] }): unknown`
- `findBestMatch(query): StyleMatch | undefined`
- `findAllMatches(query): StyleMatch[]`

## JSON Tree Digestion

`fromJSON()` converts nested JSON into tree entries.
Plain keys build noun paths; `$` keys create state variants.

### Example

```typescript
import { fromJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const themeJSON = {
  button: {
    icon: {
      fill: {
        $*: { color: { r: 1, g: 1, b: 1 }, alpha: 1 },
        $disabled: { color: { r: 0.5, g: 0.5, b: 0.5 }, alpha: 1 },
      },
    },
  },
};

const tree = fromJSON(themeJSON);
```

## License

MIT
