import { createState, type Getter, type Setter, untrack } from '@piant/core';

export interface ControllableStateOptions<T> {
  /** undefined selects uncontrolled state; null/false/0 are controlled values. */
  value?: T;
  /** Initialization-only fallback, read once even when initially controlled. */
  defaultValue: T;
  onChange?: (value: T) => void;
}

/** Adapt value/checked/open through getters; only the caller commits controlled values. */
export function createControllableState<T>(
  options: ControllableStateOptions<T>,
): readonly [Getter<T>, Setter<T>] {
  // Store the original value separately: core's observable boxes otherwise deeply
  // wrap objects, which would change the identity used by Object.is and callbacks.
  let internal = options.defaultValue;
  const [revision, setRevision] = createState(0);
  const value = () => {
    const controlled = options.value;
    if (controlled !== undefined) return controlled;
    revision();
    return internal;
  };
  const setValue: Setter<T> = (update: T | ((previous: T) => T)) =>
    untrack(() => {
      // A setter must not subscribe its caller to the internal revision.
      const controlled = options.value;
      const previous = controlled !== undefined ? controlled : internal;
      const next =
        typeof update === 'function'
          ? (update as (previous: T) => T)(previous)
          : update;
      if (Object.is(previous, next)) return next;
      if (controlled === undefined) {
        internal = next;
        setRevision((version) => version + 1);
      }
      options.onChange?.(next);
      return next;
    });
  return [value, setValue] as const;
}
