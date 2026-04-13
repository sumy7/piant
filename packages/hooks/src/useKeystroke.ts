import {
  bindKey,
  bindKeyCombo,
  unbindKey,
  unbindKeyCombo,
  type Handler,
  type BrowserKeyEvent,
  type BrowserKeyComboEvent,
} from '@rwh/keystrokes';
import { onCleanup } from '@piant/core';

export type KeystrokeHandler = Handler<BrowserKeyEvent>;
export type KeyComboHandler = Handler<BrowserKeyComboEvent>;

/**
 * Returns true if `key` looks like a key combo expression (contains `+`, `>`, or `,`
 * outside of a backslash escape sequence).
 */
function isComboExpression(key: string): boolean {
  for (let i = 0; i < key.length; i++) {
    if (key[i] === '\\') {
      i++;
      continue;
    }
    if (key[i] === '+' || key[i] === '>' || key[i] === ',') {
      return true;
    }
  }
  return false;
}

/**
 * Binds a key or key combo handler using `@rwh/keystrokes`.
 * The binding is automatically removed when the current reactive owner is disposed.
 *
 * For simple keys (e.g. `'a'`, `'control'`), uses `bindKey`.
 * For combo expressions (e.g. `'a + b'`, `'control > y, r'`), uses `bindKeyCombo`.
 *
 * @param key - A key name or combo expression.
 * @param handler - A handler function or `{ onPressed, onPressedWithRepeat, onReleased }` object.
 */
export function useKeystroke(key: string, handler: KeystrokeHandler | KeyComboHandler): void {
  if (isComboExpression(key)) {
    bindKeyCombo(key, handler as KeyComboHandler);
    onCleanup(() => {
      unbindKeyCombo(key, handler as KeyComboHandler);
    });
  } else {
    bindKey(key, handler as KeystrokeHandler);
    onCleanup(() => {
      unbindKey(key, handler as KeystrokeHandler);
    });
  }
}
