import type { Handler, KeyFilter } from './useKey';
import { useKey } from './useKey';

/**
 * Calls `keydown` or `keyup` handlers when the specified key is pressed or released.
 *
 * @param key - Key name or predicate to match.
 * @param keydown - Handler called on keydown.
 * @param keyup - Handler called on keyup.
 */
export function useKeyPressEvent(
  key: KeyFilter,
  keydown?: Handler | null,
  keyup?: Handler | null,
): void {
  if (keydown) {
    useKey(key, keydown, { event: 'keydown' });
  }
  if (keyup) {
    useKey(key, keyup, { event: 'keyup' });
  }
}
