# @wonderlandlabs-pixi-ux/style-tree

A hierarchical style matching system with noun paths and state-based selection.

## Features

- **Hierarchical noun paths**: Define styles using dot-separated paths (e.g., `navigation.button.icon`)
- **State-based selection**: Add states with colon separator (e.g., `:disabled-selected`)
- **Wildcard matching**: Use `*` in noun paths for flexible matching (e.g., `base.*.label`)
- **Base state matching**: Use `:*` to match any state combination
- **Intelligent ranking**: Automatic scoring based on specificity

## Installation

```bash
yarn add @wonderlandlabs-pixi-ux/style-tree
```

## Usage

```typescript
import { StyleTree } from '@wonderlandlabs-pixi-ux/style-tree';

// Create a style tree
const tree = new StyleTree<{ color: string; fontSize: number }>();

// Set styles with different specificity levels
tree.set('base.*.label', { color: '#666', fontSize: 12 });
tree.set('navigation.button.text', { color: '#000', fontSize: 14 });
tree.set('navigation.button.text:hover', { color: '#0066cc', fontSize: 14 });
tree.set('navigation.button.text:disabled-selected', { color: '#999', fontSize: 14 });

// Match styles - returns the best match
const style = tree.match({
  nouns: 'navigation.button.text',
  states: 'hover'
});
// Returns: { color: '#0066cc', fontSize: 14 }

// Get detailed match information
const match = tree.findBestMatch({
  nouns: 'navigation.button.text',
  states: 'hover'
});
// Returns: { key: '...', value: {...}, score: 301, matchingNouns: 3, matchingStates: 1 }

// Get all matches sorted by score
const allMatches = tree.findAllMatches({
  nouns: 'navigation.button.text',
  states: 'hover'
});
```

## Style Key Format

Style keys follow the format: `noun.noun.noun:state-state-state`

- **Nouns**: Dot-separated hierarchy (e.g., `navigation.button.icon`)
- **States**: Colon-separated, alphabetically ordered (e.g., `:disabled-selected`)
- **Wildcards**: Use `*` in noun paths (e.g., `base.*.label`)
- **Base state**: Use `:*` to match any state combination

### Examples

```typescript
// Exact match
tree.set('navigation.button.icon:disabled-selected', value);

// Wildcard in noun path
tree.set('base.*.label', value);

// Base state (matches any states)
tree.set('navigation.button.text:*', value);

// No states
tree.set('navigation.button.text', value);
```

## Scoring Algorithm

The scoring system ensures the most specific match is selected:

**Score = (matching nouns × 100) + matching states**

- Wildcards (`*`) in noun paths match anything but **don't count** toward score
- Base state (`:*`) matches any state combination but **doesn't count** toward score
- Higher scores indicate more specific matches

### Scoring Examples

| Style Key | Query | Score | Calculation |
|-----------|-------|-------|-------------|
| `navigation.button.icon:disabled-selected` | `navigation.button.icon:disabled-selected` | 302 | 3 nouns × 100 + 2 states |
| `navigation.*.icon:hover` | `navigation.button.icon:hover` | 201 | 2 nouns × 100 + 1 state |
| `navigation.button.icon:*` | `navigation.button.icon:hover` | 300 | 3 nouns × 100 + 0 states |
| `base.*.label` | `base.anything.label` | 200 | 2 nouns × 100 + 0 states |

## API

### `StyleTree<T>`

#### Constructor

```typescript
new StyleTree<T>(options?: StyleTreeOptions)
```

Options:
- `validateKeys?: boolean` - Validate keys on set (default: `true`)
- `autoSortStates?: boolean` - Auto-sort states alphabetically (default: `true`)

#### Methods

- `set(key: StyleKey, value: T): void` - Set a style value
- `get(key: StyleKey): T | undefined` - Get a style by exact key
- `has(key: StyleKey): boolean` - Check if a key exists
- `delete(key: StyleKey): boolean` - Delete a style
- `clear(): void` - Clear all styles
- `match(query: StyleQuery): T | undefined` - Find the best matching style
- `findBestMatch(query: StyleQuery): StyleMatch<T> | undefined` - Find best match with details
- `findAllMatches(query: StyleQuery): StyleMatch<T>[]` - Find all matches sorted by score

### Types

```typescript
interface StyleQuery {
  nouns: string | string[];
  states?: string | string[];
}

interface StyleMatch<T> {
  key: StyleKey;
  value: T;
  score: number;
  matchingNouns: number;
  matchingStates: number;
}
```

## JSON Tree Digestion

StyleTree can digest arbitrary JSON trees where plain keys form the noun hierarchy and `$`-prefixed keys represent states.

### Example

```typescript
import { fromJSON, digestJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const themeJSON = {
  navigation: {
    button: {
      text: {
        color: 'black',
        fontSize: 14,
        $hover: {
          color: 'blue',
        },
        $disabled: {
          color: 'gray',
        },
        '$disabled-selected': {
          color: 'darkgray',
        },
      },
    },
  },
};

// Create a StyleTree from JSON
const tree = fromJSON(themeJSON);

// This creates the following entries:
// - navigation.button.text.color: "black"
// - navigation.button.text.fontSize: 14
// - navigation.button.text.color:hover: "blue"
// - navigation.button.text.color:disabled: "gray"
// - navigation.button.text.color:disabled-selected: "darkgray"

// Query the tree
tree.match({ nouns: 'navigation.button.text', states: 'hover' });
// Returns: { color: 'blue', fontSize: 14 }
```

### Digest Options

```typescript
digestJSON(tree, json, {
  statePrefix: '$',        // Prefix for state keys (default: '$')
  merge: false,            // Merge with existing values (default: false)
  transformValue: (value, path, states) => {
    // Custom value transformation
    return value;
  },
});
```

### Export to JSON

```typescript
import { toJSON } from '@wonderlandlabs-pixi-ux/style-tree';

const json = toJSON(tree, { statePrefix: '$' });
// Converts StyleTree back to JSON format
```

## License

MIT

