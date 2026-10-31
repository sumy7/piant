import { createEffect, createState, root, View } from '@piant/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTheme,
  defaultTheme,
  UIProvider,
  type UIProviderProps,
  type UITheme,
  useUITheme,
} from '../dist/index.js';

afterEach(() => vi.unstubAllGlobals());

function media() {
  let matches = false;
  const listeners = new Set<() => void>();
  const query = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, callback: () => void) =>
      listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      listeners.delete(callback),
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    listeners,
    change(value: boolean) {
      matches = value;
      for (const fn of [...listeners]) fn();
    },
  };
}

describe('theme tokens', () => {
  it('provides immutable defaults and does not mutate overrides or other themes', () => {
    expect(useUITheme()()).toBe(defaultTheme);
    const theme = {
      colors: { primary: '#123456' },
      typography: { fontSize: 18 },
    };
    const custom = createTheme({ theme, fontScale: 2 });
    expect(custom.colors.primary).toBe('#123456');
    expect(custom.typography.fontSize).toBe(36);
    expect(theme.typography.fontSize).toBe(18);
    expect(defaultTheme.colors.primary).toBe('#1d4ed8');
    expect(Object.isFrozen(custom)).toBe(true);
    for (const group of [
      'colors',
      'spacing',
      'controlSize',
      'typography',
      'radius',
      'motion',
    ] as const)
      expect(Object.isFrozen(custom[group])).toBe(true);
  });

  it('scales typography once, grows controls to fit, and suppresses overridden motion', () => {
    const large = createTheme({
      fontScale: 2,
      density: 'compact',
      reducedMotion: true,
      theme: { typography: { lineHeight: 24 }, motion: { fast: 500 } },
    });
    expect(large.typography.fontSize).toBe(28);
    expect(large.typography.lineHeight).toBe(48);
    expect(large.controlSize.md).toBeGreaterThanOrEqual(
      48 + large.spacing.sm * 2,
    );
    expect([large.motion.fast, large.motion.normal, large.motion.slow]).toEqual(
      [0, 0, 0],
    );
    expect(
      createTheme({ theme: { colors: { text: undefined } } }).colors.text,
    ).toBe(defaultTheme.colors.text);
  });

  it.each([0, -1, Number.NaN, Infinity])(
    'rejects invalid fontScale %s',
    (fontScale) => {
      expect(() => createTheme({ fontScale })).toThrow(RangeError);
    },
  );
});

describe('UIProvider', () => {
  it('updates styles without rebuilding children and restores scoped DOM styles', () => {
    const domRoot = document.createElement('div');
    domRoot.style.setProperty('color', 'red', 'important');
    domRoot.style.setProperty('font-size', '11px');
    domRoot.style.setProperty('padding', '3px');
    let theme!: () => UITheme;
    let node!: ReturnType<typeof View> & {
      _layoutStyle: { height: number; backgroundColor: string };
      destroyRecursive(): void;
    };
    let setOptions!: (value: UIProviderProps) => void;
    let creations = 0;
    let reads = 0;
    const dispose = root((dispose) => {
      const [options, set] = createState<UIProviderProps>({});
      setOptions = set;
      UIProvider({
        get colorMode() {
          return options().colorMode;
        },
        get density() {
          return options().density;
        },
        get fontScale() {
          return options().fontScale;
        },
        get theme() {
          return options().theme;
        },
        reducedMotion: false,
        domRoot,
        children: () => {
          creations++;
          theme = useUITheme();
          createEffect(() => {
            theme();
            reads++;
          });
          node = View({
            get style() {
              return {
                height: theme().controlSize.md,
                backgroundColor: theme().colors.surface,
              };
            },
          }) as typeof node;
          return node;
        },
      });
      return dispose;
    });
    expect(creations).toBe(1);
    const original = node;
    setOptions({
      colorMode: 'dark',
      density: 'compact',
      fontScale: 2,
      theme: { colors: { surface: '#112233' } },
    });
    expect(theme().colorMode).toBe('dark');
    expect(node).toBe(original);
    expect(creations).toBe(1);
    expect(node._layoutStyle.height).toBe(theme().controlSize.md);
    expect(node._layoutStyle.backgroundColor).toBe('#112233');
    expect(domRoot.style.fontSize).toBe('28px');
    expect(domRoot.style.color).toBe(theme().colors.text);
    setOptions({});
    expect(theme().colors.surface).toBe(defaultTheme.colors.surface);
    dispose();
    const previousReads = reads;
    setOptions({ colorMode: 'dark' });
    expect(reads).toBe(previousReads);
    expect(domRoot.style.color).toBe('red');
    expect(domRoot.style.getPropertyPriority('color')).toBe('important');
    expect(domRoot.style.fontSize).toBe('11px');
    expect(domRoot.style.fontFamily).toBe('');
    expect(domRoot.style.padding).toBe('3px');
    node.destroyRecursive();
  });

  it('isolates roots and nested overrides, inherits unscaled configuration, and restores parent scope', () => {
    let parent!: () => UITheme;
    let child!: () => UITheme;
    let sibling!: () => UITheme;
    let other!: () => UITheme;
    let setParent!: (value: UIProviderProps) => void;
    let setChild!: (value: UIProviderProps) => void;
    let creations = 0;
    const first = root((dispose) => {
      const [options, set] = createState<UIProviderProps>({
        colorMode: 'dark',
        fontScale: 2,
        theme: { colors: { primary: '#654321' }, spacing: { md: 19 } },
      });
      setParent = set;
      const [nested, update] = createState<UIProviderProps>({
        theme: { colors: { primary: '#abcdef' } },
      });
      setChild = update;
      UIProvider({
        get colorMode() {
          return options().colorMode;
        },
        get fontScale() {
          return options().fontScale;
        },
        get theme() {
          return options().theme;
        },
        reducedMotion: false,
        children: () => {
          creations++;
          parent = useUITheme();
          UIProvider({
            get theme() {
              return nested().theme;
            },
            get colorMode() {
              return nested().colorMode;
            },
            children: () => {
              child = useUITheme();
              return undefined;
            },
          });
          sibling = useUITheme();
          return undefined;
        },
      });
      return dispose;
    });
    const second = root((dispose) => {
      UIProvider({
        reducedMotion: false,
        children: () => {
          other = useUITheme();
          return undefined;
        },
      });
      return dispose;
    });
    try {
      expect(sibling).toBe(parent);
      expect(child().colors.primary).toBe('#abcdef');
      expect(child().spacing.md).toBe(19);
      expect(child().typography.fontSize).toBe(28);
      expect(other().colorMode).toBe('light');
      setParent({
        colorMode: 'light',
        fontScale: 1.5,
        theme: { colors: { primary: '#123456' } },
      });
      expect(parent().colors.primary).toBe('#123456');
      expect(child().colors.primary).toBe('#abcdef');
      expect(child().spacing.md).toBe(defaultTheme.spacing.md);
      expect(child().typography.fontSize).toBe(21);
      setChild({
        colorMode: 'dark',
        theme: { colors: { primary: undefined } },
      });
      expect(child().colorMode).toBe('dark');
      expect(child().colors.primary).toBe('#123456');
      expect(parent().colorMode).toBe('light');
      expect(other().fontScale).toBe(1);
      expect(creations).toBe(1);
    } finally {
      first();
      second();
    }
  });

  it('follows live reduced-motion preferences per root, inherits them, and removes listeners on override/disposal', () => {
    const system = media();
    system.change(true);
    let one!: () => UITheme;
    let nested!: () => UITheme;
    let two!: () => UITheme;
    let setPreference!: (value: boolean | 'system') => void;
    const first = root((dispose) => {
      const [preference, set] = createState<boolean | 'system'>('system');
      setPreference = set;
      UIProvider({
        get reducedMotion() {
          return preference();
        },
        children: () => {
          one = useUITheme();
          UIProvider({
            children: () => {
              nested = useUITheme();
              return undefined;
            },
          });
          return undefined;
        },
      });
      return dispose;
    });
    const second = root((dispose) => {
      UIProvider({
        children: () => {
          two = useUITheme();
          return undefined;
        },
      });
      return dispose;
    });
    expect(system.listeners.size).toBe(2);
    expect(one().motion.normal).toBe(0);
    expect(nested().reducedMotion).toBe(true);
    system.change(false);
    expect(one().motion.normal).toBe(200);
    expect(two().reducedMotion).toBe(false);
    setPreference(true);
    expect(system.listeners.size).toBe(1);
    expect(nested().reducedMotion).toBe(true);
    setPreference('system');
    expect(system.listeners.size).toBe(2);
    expect(one().reducedMotion).toBe(false);
    first();
    expect(system.listeners.size).toBe(1);
    system.change(true);
    expect(two().reducedMotion).toBe(true);
    second();
    expect(system.listeners.size).toBe(0);
  });

  it('supports changing DOM scopes without leaking styles and never changes body', () => {
    const originalBody = document.body.style.cssText;
    const a = document.createElement('div');
    const b = document.createElement('div');
    let setTarget!: (value: HTMLElement) => void;
    const dispose = root((dispose) => {
      const [target, set] = createState<HTMLElement>(a);
      setTarget = set;
      UIProvider({
        get domRoot() {
          return target();
        },
        reducedMotion: false,
      });
      return dispose;
    });
    expect(a.style.fontSize).toBe('14px');
    setTarget(b);
    expect(a.style.fontSize).toBe('');
    expect(b.style.fontSize).toBe('14px');
    dispose();
    expect(b.style.fontSize).toBe('');
    expect(document.body.style.cssText).toBe(originalBody);
  });
});

// W3C sRGB relative luminance; test defaults only, not arbitrary application overrides.
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

it.each(['light', 'dark'] as const)(
  '%s defaults meet text and essential boundary contrast targets',
  (colorMode) => {
    const { colors } = createTheme({ colorMode });
    for (const background of [
      colors.canvas,
      colors.surface,
      colors.surfaceRaised,
    ]) {
      expect(contrast(colors.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.textMuted, background)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(colors.border, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.focusRing, background)).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(colors.primary, colors.onPrimary)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(colors.danger, colors.onDanger)).toBeGreaterThanOrEqual(
      4.5,
    );
  },
);
