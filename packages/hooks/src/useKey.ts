import { onCleanup } from '@piant/core';

export type KeyFilter = null | undefined | string | ((event: KeyboardEvent) => boolean);
export type Handler = (event: KeyboardEvent) => void;
export type KeyEventType = 'keydown' | 'keypress' | 'keyup';

export interface UseKeyOptions {
  event?: KeyEventType;
  target?: EventTarget;
}

function createKeyPredicate(keyFilter: KeyFilter): (event: KeyboardEvent) => boolean {
  if (typeof keyFilter === 'function') return keyFilter;
  if (typeof keyFilter === 'string') return (event: KeyboardEvent) => event.key === keyFilter;
  if (keyFilter) return () => true;
  return () => false;
}

/**
 * Listens to a keyboard event and calls `handler` when the key matches `key`.
 * The listener is automatically removed when the current reactive owner is disposed.
 *
 * @param key - Key name, predicate function, or null/undefined.
 * @param handler - Callback invoked on matching keyboard events.
 * @param opts - Optional event type ('keydown' | 'keypress' | 'keyup') and target element.
 */
export function useKey(key: KeyFilter, handler: Handler, opts: UseKeyOptions = {}): void {
  const { event = 'keydown', target } = opts;
  const t: EventTarget =
    target ?? (typeof window !== 'undefined' ? window : (null as unknown as EventTarget));
  if (!t) return;

  const predicate = createKeyPredicate(key);
  const wrappedHandler = (e: Event) => {
    const ke = e as KeyboardEvent;
    if (predicate(ke)) handler(ke);
  };

  t.addEventListener(event, wrappedHandler);
  onCleanup(() => {
    t.removeEventListener(event, wrappedHandler);
  });
}
