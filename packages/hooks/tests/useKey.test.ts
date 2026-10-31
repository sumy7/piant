import { Input, type PInput, root } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import { useKey } from '../src/useKey';

describe('useKey', () => {
  it.each([{ isComposing: true }, { keyCode: 229 }])(
    'ignores composing boundary flags %s by default',
    (flags) => {
      const handler = vi.fn();
      root((dispose) => {
        useKey('Enter', handler);
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', ...flags }),
        );
        expect(handler).not.toHaveBeenCalled();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(handler).toHaveBeenCalledTimes(1);
        dispose();
      });
    },
  );

  it('can explicitly observe raw composing keys', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey('Enter', handler, { ignoreComposition: false });
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
      dispose();
    });
  });

  it('ignores a core Input composition and its final keyup on the same target', async () => {
    const handler = vi.fn();
    const stop = root((dispose) => {
      const input = Input({}) as PInput;
      useKey('Enter', handler, { target: input.element });
      useKey('Enter', handler, { event: 'keyup', target: input.element });
      input.element.dispatchEvent(new CompositionEvent('compositionstart'));
      input.element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter' }),
      );
      input.element.dispatchEvent(new CompositionEvent('compositionend'));
      return { dispose, input };
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    stop.input.element.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter' }),
    );
    expect(handler).not.toHaveBeenCalled();
    stop.input.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter' }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    stop.dispose();
    stop.input.destroy();
  });
  it('calls handler when the matching key is pressed', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey('a', handler);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      dispose();
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as KeyboardEvent).key).toBe('a');
  });

  it('does not call handler for a different key', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey('a', handler);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      dispose();
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('listens to keyup when event option is keyup', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey('a', handler, { event: 'keyup' });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
      dispose();
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports a predicate function as key filter', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey((e) => e.key === 'Enter', handler);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      dispose();
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('accepts a custom event target', () => {
    const handler = vi.fn();
    const target = document.createElement('div');
    root((dispose) => {
      useKey('a', handler, { target });
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      );
      dispose();
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removes the event listener when the reactive owner is disposed', () => {
    const handler = vi.fn();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    root((dispose) => {
      useKey('a', handler);
      dispose();
    });
    expect(removeSpy).toHaveBeenCalled();
    // Dispatching after dispose should not trigger the handler
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(handler).not.toHaveBeenCalled();
    removeSpy.mockRestore();
  });

  it('does nothing when key filter is null', () => {
    const handler = vi.fn();
    root((dispose) => {
      useKey(null, handler);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      dispose();
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
