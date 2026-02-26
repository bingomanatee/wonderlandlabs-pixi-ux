import type {
  StyleQuery,
  StyleMatch,
  StyleTreeOptions,
} from './types.js';
import { StyleKeySchema } from './types.js';
import {
  normalizeStates,
  calculateMatchScore,
} from './utils.js';

/**
 * StyleTree - A hierarchical style matching system
 *
 * Stores styles in a double-nested map structure:
 * Map<nounPath, Map<stateKey, value>>
 *
 * Example:
 * "nav.button.bgColor" -> {
 *   "" -> "black",           // no states
 *   "*" -> "red",            // base state
 *   "hover" -> "blue",       // single state
 *   "disabled-selected" -> "gray"  // multi-state
 * }
 *
 * Supports wildcard matching with "*" in noun paths
 * Ranks matches by: (matching nouns * 100) + matching states
 */
export class StyleTree {
  // Map<nounPath, Map<stateKey, value>>
  private styles: Map<string, Map<string, any>> = new Map();
  private options: Required<StyleTreeOptions>;

  constructor(options: StyleTreeOptions = {}) {
    this.options = {
      validateKeys: options.validateKeys ?? true,
      autoSortStates: options.autoSortStates ?? true,
    };
  }

  /**
   * Set a style value
   * Note: For v1, data is assumed to be static - set once during initialization
   * If a key is set twice, a warning is logged but the override is accepted
   * @param nouns - Noun path as string (e.g., "navigation.button.icon")
   * @param states - States as array (e.g., ["disabled", "selected"], ["hover"], or [] for no states)
   * @param value - Style value (can be any type)
   * @example
   * tree.set('nav.button.bgColor', ['*'], 'red')
   * tree.set('nav.button.bgColor', ['hover'], 'blue')
   * tree.set('nav.button.bgColor', ['disabled', 'selected'], 'gray')
   * tree.set('nav.button.bgColor', [], 'black')
   */
  set(nouns: string, states: string[], value: any): void {
    const { nounKey, stateKey } = this.buildKeys(nouns, states);

    if (this.options.validateKeys) {
      const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
      StyleKeySchema.parse(fullKey);
    }

    // Get or create the state map for this noun path
    let stateMap = this.styles.get(nounKey);
    if (!stateMap) {
      stateMap = new Map();
      this.styles.set(nounKey, stateMap);
    }

    // Warn if overwriting an existing value
    if (stateMap.has(stateKey)) {
      const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
      console.warn(`StyleTree: Overwriting existing key "${fullKey}"`);
    }

    stateMap.set(stateKey, value);
  }

  /**
   * Get a style value by exact key match
   * @param nouns - Noun path as string (e.g., "navigation.button.icon")
   * @param states - States as array (e.g., ["hover"], [] for no states)
   * @returns Style value or undefined
   */
  get(nouns: string, states: string[]): any {
    const { nounKey, stateKey } = this.buildKeys(nouns, states);
    const stateMap = this.styles.get(nounKey);
    return stateMap?.get(stateKey);
  }

  /**
   * Check if a style key exists
   * @param nouns - Noun path as string
   * @param states - States as array
   * @returns True if exists
   */
  has(nouns: string, states: string[]): boolean {
    const { nounKey, stateKey } = this.buildKeys(nouns, states);
    const stateMap = this.styles.get(nounKey);
    return stateMap?.has(stateKey) ?? false;
  }

  /**
   * Helper method to build noun and state keys from inputs
   * @private
   */
  private buildKeys(nouns: string, states: string[]): { nounKey: string; stateKey: string } {
    const nounKey = nouns;

    // Sort states if enabled
    const normalizedStates = this.options.autoSortStates ? normalizeStates(states) : states;
    const stateKey = normalizedStates.join('-');

    return { nounKey, stateKey };
  }

  /**
   * Get the total number of styles (across all noun paths and states)
   */
  get size(): number {
    let count = 0;
    for (const stateMap of this.styles.values()) {
      count += stateMap.size;
    }
    return count;
  }

  /**
   * Get all style keys in "noun.noun:state-state" format
   */
  *keys(): IterableIterator<string> {
    for (const [nounKey, stateMap] of this.styles.entries()) {
      for (const stateKey of stateMap.keys()) {
        yield stateKey ? `${nounKey}:${stateKey}` : nounKey;
      }
    }
  }

  /**
   * Get all style values
   */
  *values(): IterableIterator<any> {
    for (const stateMap of this.styles.values()) {
      yield* stateMap.values();
    }
  }

  /**
   * Get all style entries as [key, value] pairs
   */
  *entries(): IterableIterator<[string, any]> {
    for (const [nounKey, stateMap] of this.styles.entries()) {
      for (const [stateKey, value] of stateMap.entries()) {
        const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
        yield [fullKey, value];
      }
    }
  }

  /**
   * Find the best matching style for a query
   * @param query - Query with nouns and states as arrays
   * @returns Best matching style or undefined
   */
  match(query: StyleQuery): any {
    const match = this.findBestMatch(query);
    return match?.value;
  }

  /**
   * Match a noun hierarchy, then fallback to the leaf noun if no hierarchical
   * style exists. Example: ["button", "icon"] -> fallback ["icon"].
   */
  matchHierarchy(query: StyleQuery): any {
    const hierarchical = this.match(query);
    if (hierarchical !== undefined) {
      return hierarchical;
    }

    const leaf = query.nouns[query.nouns.length - 1];
    if (!leaf || query.nouns.length <= 1) {
      return undefined;
    }

    return this.match({
      nouns: [leaf],
      states: query.states,
    });
  }

  /**
   * Find the best matching style with details
   * @param query - Query with nouns and states as arrays
   * @returns Best match with score details or undefined
   */
  findBestMatch(query: StyleQuery): StyleMatch | undefined {
    const matches = this.findAllMatches(query);
    return matches.length > 0 ? matches[0] : undefined;
  }

  /**
   * Find all matching styles, sorted by score (highest first)
   * @param query - Query with nouns and states as arrays
   * @returns Array of matches sorted by score
   */
  findAllMatches(query: StyleQuery): StyleMatch[] {
    const targetNouns = query.nouns;
    const targetStates = query.states;
    const normalizedTargetStates = normalizeStates(targetStates);

    const matches: StyleMatch[] = [];

    // Iterate through all noun paths and their state maps
    for (const [nounKey, stateMap] of this.styles.entries()) {
      const patternNouns = nounKey.split('.');

      // Check each state variant for this noun path
      for (const [stateKey, value] of stateMap.entries()) {
        const patternStates = stateKey === '' ? [] : stateKey.split('-');

        const matchResult = calculateMatchScore(
          patternNouns,
          patternStates,
          targetNouns,
          normalizedTargetStates
        );

        if (matchResult) {
          const fullKey = stateKey ? `${nounKey}:${stateKey}` : nounKey;
          matches.push({
            key: fullKey,
            value,
            score: matchResult.score,
            matchingNouns: matchResult.matchingNouns,
            matchingStates: matchResult.matchingStates,
          });
        }
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }
}
