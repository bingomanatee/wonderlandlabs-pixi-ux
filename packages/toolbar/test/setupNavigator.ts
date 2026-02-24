if (!('navigator' in globalThis)) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'vitest' },
    configurable: true,
  });
}
