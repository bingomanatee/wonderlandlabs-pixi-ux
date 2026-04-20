import type { ParsedStyleKey, StyleKey } from './types.js';
import { BASE_STATE, WILDCARD } from './types.js';

/**
 * Parse a style key into its components
 * @param key - Style key (e.g., "navigation.button.icon:disabled-selected")
 * @returns Parsed components
 */
export function parseStyleKey(key: StyleKey): ParsedStyleKey {
  const [nounPath, statePath] = key.split(':');
  
  const nouns = nounPath ? nounPath.split('.').filter(Boolean) : [];
  const states = statePath ? statePath.split('-').filter(Boolean).sort() : [];
  
  return {
    nouns,
    states,
    key,
  };
}

/**
 * Build a style key from components
 * @param nouns - Noun path segments
 * @param states - State segments (will be sorted)
 * @returns Style key string
 */
export function buildStyleKey(nouns: string[], states: string[] = []): StyleKey {
  const nounPath = nouns.join('.');
  const sortedStates = [...states].sort();
  const statePath = sortedStates.length > 0 ? sortedStates.join('-') : '';
  
  return statePath ? `${nounPath}:${statePath}` : nounPath;
}

/**
 * Normalize states by sorting them alphabetically
 * @param states - Array of state strings
 * @returns Sorted array of states
 */
export function normalizeStates(states: string[]): string[] {
  return [...states].sort();
}

type QueryStateGroups = {
  required: string[];
  optional: string[];
  hasOptional: boolean;
};

function splitQueryStates(states: string[]): QueryStateGroups {
  const required: string[] = [];
  const optional: string[] = [];

  for (const state of states) {
    if (state.endsWith('?')) {
      const name = state.slice(0, -1);
      if (name) {
        optional.push(name);
      }
      continue;
    }
    required.push(state);
  }

  return {
    required,
    optional,
    hasOptional: optional.length > 0,
  };
}

/**
 * Check if a noun segment matches (considering wildcards)
 * @param pattern - Pattern segment (may be wildcard)
 * @param target - Target segment
 * @returns True if matches
 */
export function nounSegmentMatches(pattern: string, target: string): boolean {
  return pattern === WILDCARD || pattern === target;
}

/**
 * Check if a state matches (considering wildcards)
 * @param pattern - Pattern state (may be wildcard)
 * @param target - Target state
 * @returns True if matches
 */
export function stateMatches(pattern: string, target: string): boolean {
  return pattern === BASE_STATE || pattern === target;
}

/**
 * Calculate match score between a pattern and target
 * Score = (matching nouns * 100) + matching states
 * Wildcards don't count toward the score
 * 
 * @param patternNouns - Pattern noun segments
 * @param patternStates - Pattern state segments
 * @param targetNouns - Target noun segments
 * @param targetStates - Target state segments
 * @returns Match score and details, or null if no match
 */
export function calculateMatchScore(
  patternNouns: string[],
  patternStates: string[],
  targetNouns: string[],
  targetStates: string[]
): { score: number; matchingNouns: number; matchingStates: number } | null {
  // Nouns must match in length
  if (patternNouns.length !== targetNouns.length) {
    return null;
  }
  
  // Check if all noun segments match
  let matchingNouns = 0;
  for (let i = 0; i < patternNouns.length; i++) {
    if (!nounSegmentMatches(patternNouns[i], targetNouns[i])) {
      return null;
    }
    // Count non-wildcard matches
    if (patternNouns[i] !== WILDCARD) {
      matchingNouns++;
    }
  }
  
  const queryStates = splitQueryStates(targetStates);
  const explicitPatternStates = patternStates.filter((state) => state !== BASE_STATE);
  const candidateStates = normalizeStates([...queryStates.required, ...queryStates.optional]);

  // Optional query states change the fallback contract slightly:
  // explicit pattern states must still include all required states.
  if (queryStates.hasOptional && explicitPatternStates.length > 0) {
    for (const requiredState of queryStates.required) {
      if (!explicitPatternStates.includes(requiredState)) {
        return null;
      }
    }
  }

  let matchingStates = 0;

  if (patternStates.length === 1 && patternStates[0] === BASE_STATE) {
    // Base state matches anything, but contributes 0 to score
    matchingStates = 0;
  } else if (patternStates.length === 0 && candidateStates.length === 0) {
    // Both have no states - perfect match
    matchingStates = 0;
  } else if (patternStates.length === 0 && candidateStates.length > 0) {
    // Pattern has no states but target does - pattern is less specific, matches
    matchingStates = 0;
  } else if (patternStates.length > candidateStates.length) {
    // Pattern has more states than target - pattern is MORE specific, no match
    return null;
  } else {
    // Check if all pattern states exist in target states
    // Pattern states must be a subset of target states
    for (const patternState of patternStates) {
      if (patternState === BASE_STATE) {
        // Wildcard state - matches but doesn't count
        continue;
      }
      if (!candidateStates.includes(patternState)) {
        return null;
      }
      matchingStates++;
    }
  }
  
  const score = matchingNouns * 100 + matchingStates;
  
  return {
    score,
    matchingNouns,
    matchingStates,
  };
}
