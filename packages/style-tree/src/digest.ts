import { StyleTree } from './StyleTree.js';

/**
 * Options for digesting JSON trees
 */
export interface DigestOptions {
  /** Prefix for state keys (default: '$') */
  statePrefix?: string;
  /** Whether to merge values or overwrite (default: false - overwrite) */
  merge?: boolean;
  /** Custom value transformer */
  transformValue?: (value: any, path: string[], states: string[]) => any;
}

/**
 * Check if a key is a state key (starts with state prefix)
 */
function isStateKey(key: string, prefix: string): boolean {
  return key.startsWith(prefix);
}

/**
 * Extract state names from a state key (removes prefix and splits comma-delimited states)
 */
function extractStateNames(key: string, prefix: string): string[] {
  return key
    .slice(prefix.length)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Check if a value is a plain object (not array, null, etc.)
 */
function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Digest a JSON tree into a StyleTree
 *
 * Plain keys form the noun hierarchy.
 * Keys starting with $ (or custom prefix) represent states.
 *
 * Example:
 * ```json
 * {
 *   "navigation": {
 *     "button": {
 *       "text": {
 *         "color": "black",
 *         "$hover": { "color": "blue" },
 *         "$disabled": { "color": "gray" },
 *         "$disabled-selected": { "color": "darkgray" }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * This creates:
 * - navigation.button.text.color: "black"
 * - navigation.button.text.color:hover: "blue"
 * - navigation.button.text.color:disabled: "gray"
 * - navigation.button.text.color:disabled-selected: "darkgray"
 *
 * @param tree - StyleTree to populate
 * @param json - JSON object to digest
 * @param options - Digest options
 */
export function digestJSON(
  tree: StyleTree,
  json: any,
  options: DigestOptions = {}
): void {
  const { statePrefix = '$', merge = false, transformValue } = options;

  /**
   * Recursively process the JSON tree
   * @param obj - Current object being processed
   * @param nounPath - Current noun path
   * @param states - Current states
   */
  function processNode(obj: any, nounPath: string[] = [], states: string[] = []): void {
    if (!isPlainObject(obj)) {
      // Leaf value - create style entry
      const value = transformValue ? transformValue(obj, nounPath, states) : obj;
      const nounKey = nounPath.join('.');

      if (merge && tree.has(nounKey, states)) {
        const existing = tree.get(nounKey, states);
        if (isPlainObject(existing) && isPlainObject(value)) {
          tree.set(nounKey, states, { ...existing, ...value });
        } else {
          tree.set(nounKey, states, value);
        }
      } else {
        tree.set(nounKey, states, value);
      }
      return;
    }

    // Process object properties
    for (const [key, value] of Object.entries(obj)) {
      if (isStateKey(key, statePrefix)) {
        // State key - extract state and recurse with same noun path
        const stateNames = extractStateNames(key, statePrefix);
        // Filter out '*' - it represents base/default state (empty states)
        const nextStates = stateNames.filter((stateName) => stateName !== '*');
        const newStates = nextStates.length === 0 ? states : [...states, ...nextStates];
        processNode(value, nounPath, newStates);
      } else {
        // Noun key - add to path and recurse
        const newNounPath = [...nounPath, key];
        processNode(value, newNounPath, states);
      }
    }
  }

  processNode(json);
}

/**
 * Create a StyleTree from a JSON object
 *
 * @param json - JSON object to digest
 * @param options - Digest options
 * @returns New StyleTree populated with the JSON data
 */
export function fromJSON(
  json: any,
  options: DigestOptions = {}
): StyleTree {
  const tree = new StyleTree();
  digestJSON(tree, json, options);
  return tree;
}

/**
 * Export a StyleTree to a JSON object
 * This is the inverse of digestJSON
 *
 * @param tree - StyleTree to export
 * @param options - Export options
 * @returns JSON object representation
 */
export function toJSON(
  tree: StyleTree,
  options: { statePrefix?: string } = {}
): any {
  const { statePrefix = '$' } = options;
  const result: any = {};

  for (const [key, value] of tree.entries()) {
    const [nounPath, statePath] = key.split(':');
    const nouns = nounPath.split('.');
    const states = statePath ? statePath.split('-') : [];

    // Navigate/create the noun path
    let current = result;
    for (const noun of nouns) {
      if (!current[noun]) {
        current[noun] = {};
      }
      current = current[noun];
    }

    // Set the value at the appropriate state level
    // Empty states [] are exported as $* (base state)
    const stateKey = states.length === 0 ? statePrefix + '*' : statePrefix + states.join('-');
    if (isPlainObject(value)) {
      if (!current[stateKey]) {
        current[stateKey] = {};
      }
      Object.assign(current[stateKey], value);
    } else {
      // Primitive value under a state
      current[stateKey] = value;
    }
  }

  return result;
}
