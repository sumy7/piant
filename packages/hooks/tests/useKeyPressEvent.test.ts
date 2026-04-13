import { describe, expect, it, vi } from 'vitest';
import { root } from '@piant/core';
import { useKeyPressEvent } from '../src/useKeyPressEvent';

describe('useKeyPressEvent', () => {
  it('calls keydown handler when key is pressed', () => {
    const onDown = vi.fn();
    root((dispose) => {
      useKeyPressEvent('a', onDown);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      dispose();
    });
    expect(onDown).toHaveBeenCalledTimes(1);
    expect((onDown.mock.calls[0][0] as KeyboardEvent).key).toBe('a');
  });

  it('calls keyup handler when key is released', () => {
    const onUp = vi.fn();
    root((dispose) => {
      useKeyPressEvent('a', null, onUp);
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      dispose();
    });
    expect(onUp).toHaveBeenCalledTimes(1);
  });

  it('calls both keydown and keyup handlers', () => {
    const onDown = vi.fn();
    const onUp = vi.fn();
    root((dispose) => {
      useKeyPressEvent('a', onDown, onUp);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      dispose();
    });
    expect(onDown).toHaveBeenCalledTimes(1);
    expect(onUp).toHaveBeenCalledTimes(1);
  });

  it('does not call keydown handler for different keys', () => {
    const onDown = vi.fn();
    root((dispose) => {
      useKeyPressEvent('a', onDown);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      dispose();
    });
    expect(onDown).not.toHaveBeenCalled();
  });

  it('works with only a keydown handler provided', () => {
    const onDown = vi.fn();
    root((dispose) => {
      useKeyPressEvent('Enter', onDown);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
      dispose();
    });
    expect(onDown).toHaveBeenCalledTimes(1);
  });

  it('stops firing after the reactive owner is disposed', () => {
    const onDown = vi.fn();
    root((dispose) => {
      useKeyPressEvent('a', onDown);
      dispose();
    });
    // Dispatch event after dispose - handler must not be called
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(onDown).not.toHaveBeenCalled();
  });
});
