import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTestKeystrokes,
  setGlobalKeystrokes,
} from '@rwh/keystrokes';
import { root } from '@piant/core';
import { useKeystroke } from '../src/useKeystroke';

describe('useKeystroke', () => {
  let testKeystrokes: ReturnType<typeof createTestKeystrokes>;

  beforeEach(() => {
    testKeystrokes = createTestKeystrokes();
    testKeystrokes.activate();
    setGlobalKeystrokes(testKeystrokes as any);
  });

  afterEach(() => {
    testKeystrokes.deactivate();
    setGlobalKeystrokes(undefined);
  });

  it('calls handler when a simple key is pressed', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKeystroke('a', handler);
      testKeystrokes.press({ key: 'a' });
      dispose();
    });
    expect(handler).toHaveBeenCalled();
  });

  it('calls onPressed handler when a key is pressed', () => {
    const onPressed = vi.fn();
    root((dispose) => {
      useKeystroke('a', { onPressed });
      testKeystrokes.press({ key: 'a' });
      dispose();
    });
    expect(onPressed).toHaveBeenCalled();
  });

  it('calls onReleased handler when a key is released', () => {
    const onReleased = vi.fn();
    root((dispose) => {
      useKeystroke('a', { onReleased });
      testKeystrokes.press({ key: 'a' });
      testKeystrokes.release({ key: 'a' });
      dispose();
    });
    expect(onReleased).toHaveBeenCalled();
  });

  it('calls handler for a key combo expression', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKeystroke('a + b', handler);
      testKeystrokes.press({ key: 'a' });
      testKeystrokes.press({ key: 'b' });
      dispose();
    });
    expect(handler).toHaveBeenCalled();
  });

  it('calls handler for a key sequence expression', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKeystroke('a > b', handler);
      testKeystrokes.press({ key: 'a' });
      testKeystrokes.press({ key: 'b' });
      dispose();
    });
    expect(handler).toHaveBeenCalled();
  });

  it('removes the key binding when the reactive owner is disposed', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKeystroke('a', handler);
      dispose();
    });
    testKeystrokes.press({ key: 'a' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('removes the key combo binding when the reactive owner is disposed', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKeystroke('a + b', handler);
      dispose();
    });
    testKeystrokes.press({ key: 'a' });
    testKeystrokes.press({ key: 'b' });
    expect(handler).not.toHaveBeenCalled();
  });
});
