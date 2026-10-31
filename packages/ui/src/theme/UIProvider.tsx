import type { View } from '@piant/core';
import {
  createContext,
  createEffect,
  createMemo,
  createState,
  onCleanup,
  useContext,
} from '@piant/core';
import { FocusContext, FocusScope } from '../primitives/focusScope';
import { createTheme, defaultTheme, mergeThemeOverrides } from './createTheme';
import type { ThemeOptions, UITheme } from './tokens';

export interface UIProviderProps extends Omit<ThemeOptions, 'reducedMotion'> {
  /** Root providers follow the system; nested providers inherit unless explicitly set. */
  reducedMotion?: boolean | 'system';
  /** Explicit DOM scope for native input text. Never styles document/body globally. */
  domRoot?: HTMLElement;
  /** Nested providers share focus by default; isolate only for a separate surface. */
  focusScope?: 'inherit' | 'isolate';
  /** Defer child creation until the context has been installed. */
  children?: () => ReturnType<typeof View>;
}

type ThemeScope = {
  options: () => ThemeOptions;
  theme: () => UITheme;
};
const ThemeContext = createContext<ThemeScope>();

/** Read the current provider's stable reactive accessor, or the default theme. */
export function useUITheme(): () => UITheme {
  return useContext(ThemeContext)?.theme ?? (() => defaultTheme);
}

export function UIProvider(
  props: UIProviderProps,
): ReturnType<typeof ThemeContext.Provider> {
  const parent = useContext(ThemeContext);
  const parentFocus = useContext(FocusContext);
  const focus =
    parentFocus && props.focusScope !== 'isolate'
      ? parentFocus
      : new FocusScope();
  if (focus !== parentFocus) onCleanup(() => focus.dispose());
  const [systemReduced, setSystemReduced] = createState(false);
  createEffect(() => {
    const preference = props.reducedMotion ?? (parent ? undefined : 'system');
    if (
      preference !== 'system' ||
      typeof window === 'undefined' ||
      !window.matchMedia
    )
      return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReduced(query.matches);
    query.addEventListener('change', change);
    onCleanup(() => query.removeEventListener('change', change));
    change();
  });
  const options = createMemo<ThemeOptions>(() => {
    const inherited = parent?.options();
    const preference = props.reducedMotion;
    return {
      colorMode: props.colorMode ?? inherited?.colorMode,
      density: props.density ?? inherited?.density,
      fontScale: props.fontScale ?? inherited?.fontScale,
      reducedMotion:
        preference === 'system' || (!parent && preference === undefined)
          ? systemReduced()
          : (preference ?? inherited?.reducedMotion),
      theme: mergeThemeOverrides(inherited?.theme, props.theme),
    };
  });
  const theme = createMemo(() => createTheme(options()));
  createEffect(() => {
    const element = props.domRoot;
    if (!element) return;
    const current = theme();
    const values = {
      color: current.colors.text,
      'color-scheme': current.colorMode,
      'font-family': current.typography.fontFamily,
      'font-size': `${current.typography.fontSize}px`,
      'line-height': `${current.typography.lineHeight}px`,
    };
    const previous = Object.keys(values).map((name) => [
      name,
      element.style.getPropertyValue(name),
      element.style.getPropertyPriority(name),
    ]);
    for (const [name, value] of Object.entries(values))
      element.style.setProperty(name, value);
    onCleanup(() => {
      for (const [name, value, priority] of previous) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    });
  });
  const scope: ThemeScope = { options, theme };
  return (
    <FocusContext.Provider value={focus}>
      {() => (
        <ThemeContext.Provider value={scope}>
          {props.children}
        </ThemeContext.Provider>
      )}
    </FocusContext.Provider>
  );
}
