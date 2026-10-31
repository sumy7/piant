export interface InputCompositionState {
  composing: boolean;
  settling: boolean;
  guardedKeys: Set<string>;
}

const states = new WeakMap<EventTarget, InputCompositionState>();
const composingKeys = new WeakSet<KeyboardEvent>();

export function registerInputComposition(element: HTMLInputElement) {
  const state: InputCompositionState = {
    composing: false,
    settling: false,
    guardedKeys: new Set(),
  };
  states.set(element, state);
  return {
    state,
    dispose() {
      state.composing = false;
      state.settling = false;
      state.guardedKeys.clear();
      if (states.get(element) === state) states.delete(element);
    },
  };
}

export function isInputComposing(element: HTMLInputElement): boolean {
  const state = states.get(element);
  return Boolean(state?.composing || state?.settling);
}

/** Check before consuming a business shortcut, including in ancestor capture. */
export function isComposingInput(event: KeyboardEvent): boolean {
  if (composingKeys.has(event)) return true;
  const targets = event.composedPath();
  if (event.target && !targets.includes(event.target))
    targets.push(event.target);
  const composing =
    event.isComposing ||
    event.keyCode === 229 ||
    targets.some((target) => {
      const state = states.get(target);
      return Boolean(
        state?.composing ||
        state?.settling ||
        state?.guardedKeys.has(event.key),
      );
    });
  // Keep this event's origin after the target has consumed its pending keyup.
  // Later listeners on the same input must still identify the IME boundary.
  if (composing) composingKeys.add(event);
  return composing;
}
