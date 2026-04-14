import { createState } from '@piant/core';
import type { KeyFilter } from './useKey';
import { useKey } from './useKey';

/**
 * Tracks whether a key is currently pressed.
 * Returns a tuple of reactive getters: `[pressed, lastEvent]`.
 *
 * @param keyFilter - Key name or predicate to match.
 * @returns `[() => boolean, () => KeyboardEvent | null]`
 */
export function useKeyPress(
  keyFilter: KeyFilter,
): [() => boolean, () => KeyboardEvent | null] {
  const [pressed, setPressed] = createState<boolean>(false);
  const [lastEvent, setLastEvent] = createState<KeyboardEvent | null>(null);

  useKey(
    keyFilter,
    (e) => {
      setPressed(true);
      setLastEvent(e);
    },
    { event: 'keydown' },
  );

  useKey(
    keyFilter,
    (e) => {
      setPressed(false);
      setLastEvent(e);
    },
    { event: 'keyup' },
  );

  return [pressed, lastEvent];
}
