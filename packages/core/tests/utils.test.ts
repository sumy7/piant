import { describe, it, expect } from 'vitest';

describe('Vitest Setup', () => {
  it('should be able to import vitest globals', () => {
    // Test globals are working
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should work with happy-dom environment', () => {
    // Test that happy-dom provides DOM APIs
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('should support async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should work with ES modules', () => {
    // This confirms ESM support is working
    const dynamicImport = import('vitest');
    expect(dynamicImport).resolves.toBeDefined();
  });
});
