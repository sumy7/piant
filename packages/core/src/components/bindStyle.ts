import { effect } from '../reactivity/effects';

type StyleTarget = {
  _layoutStyle: object;
  setStyle(style: any): void;
};

/**
 * Binds a component's declarative style prop to the element's patch-style API.
 * Removed properties are emitted as `undefined`, while element defaults are
 * restored from the style state that existed before the binding was installed.
 */
export function bindStyle<T extends object>(
  element: StyleTarget,
  resolveStyle: () => Partial<T> | undefined,
): void {
  const defaults = { ...element._layoutStyle } as Record<string, unknown>;
  let previous = { ...defaults };

  effect(() => {
    const resolved = resolveStyle();
    const next = { ...defaults };

    if (resolved) {
      for (const [key, value] of Object.entries(resolved)) {
        if (value === undefined) {
          if (!(key in defaults)) {
            delete next[key];
          }
        } else {
          next[key] = value;
        }
      }
    }

    const patch: Record<string, unknown> = { ...next };
    for (const key of Object.keys(previous)) {
      if (!(key in next)) {
        patch[key] = undefined;
      }
    }

    element.setStyle(patch);
    previous = { ...next };
  });
}
