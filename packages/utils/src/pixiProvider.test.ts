import { describe, expect, it } from 'vitest';
import { PixiProvider } from './pixiProvider.js';

describe('PixiProvider', () => {
  it('throws when shared is accessed before init', () => {
    expect(() => PixiProvider.shared).toThrow(/PixiProvider\.init/);
  });

  it('exposes lazy static fallbacks through provider instances', () => {
    const provider = new PixiProvider({});

    expect(provider.Graphics).toBe(PixiProvider.fallbacks.Graphics);
    expect(provider.Texture.EMPTY).toBeDefined();
  });
});
