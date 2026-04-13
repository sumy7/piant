import { describe, expect, it } from 'vitest';
import { root } from '@piant/core';
import { useKeyPress } from '../src/useKeyPress';

describe('useKeyPress', () => {
  it('returns false initially', () => {
    root((dispose) => {
      const [pressed] = useKeyPress('a');
      expect(pressed()).toBe(false);
      dispose();
    });
  });

  it('returns true when the key is pressed', () => {
    root((dispose) => {
      const [pressed] = useKeyPress('a');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(pressed()).toBe(true);
      dispose();
    });
  });

  it('returns false after the key is released', () => {
    root((dispose) => {
      const [pressed] = useKeyPress('a');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(pressed()).toBe(true);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      expect(pressed()).toBe(false);
      dispose();
    });
  });

  it('stores the last keyboard event', () => {
    root((dispose) => {
      const [, lastEvent] = useKeyPress('a');
      expect(lastEvent()).toBeNull();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(lastEvent()?.key).toBe('a');
      dispose();
    });
  });

  it('does not change state when a different key is pressed', () => {
    root((dispose) => {
      const [pressed] = useKeyPress('a');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      expect(pressed()).toBe(false);
      dispose();
    });
  });

  it('stops tracking after the reactive owner is disposed', () => {
    const handler = vi.fn();
    let pressedGetter: () => boolean;
    root((dispose) => {
      const [pressed] = useKeyPress('a');
      pressedGetter = pressed;
      // Verify it works before dispose
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(pressedGetter()).toBe(true);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      dispose();
    });
    // After dispose, further events should not update state
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(pressedGetter!()).toBe(false);
  });
});
