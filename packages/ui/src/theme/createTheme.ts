import type {
  ThemeOptions,
  ThemeOverrides,
  ThemeTokens,
  UITheme,
} from './tokens';

const palettes = {
  light: {
    canvas: '#f8fafc',
    surface: '#ffffff',
    surfaceRaised: '#f1f5f9',
    text: '#0f172a',
    textMuted: '#475569',
    border: '#64748b',
    primary: '#1d4ed8',
    onPrimary: '#ffffff',
    danger: '#b91c1c',
    onDanger: '#ffffff',
    focusRing: '#1d4ed8',
  },
  dark: {
    canvas: '#0f172a',
    surface: '#1e293b',
    surfaceRaised: '#334155',
    text: '#f8fafc',
    textMuted: '#cbd5e1',
    border: '#94a3b8',
    primary: '#93c5fd',
    onPrimary: '#0f172a',
    danger: '#fca5a5',
    onDanger: '#0f172a',
    focusRing: '#93c5fd',
  },
} as const;

function defined<T extends object>(value: T | undefined): Partial<T> {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

/** Merge token leaves, without mutating either input or retaining undefined overrides. */
export function mergeThemeOverrides(
  parent: ThemeOverrides = {},
  local: ThemeOverrides = {},
): ThemeOverrides {
  const result: Record<string, object> = {};
  for (const group of [
    'colors',
    'spacing',
    'controlSize',
    'typography',
    'radius',
    'motion',
  ] as const) {
    result[group] = { ...defined(parent[group]), ...defined(local[group]) };
  }
  return result;
}

/** Resolve a detached, deeply immutable theme. Does not read browser preferences. */
export function createTheme(options: ThemeOptions = {}): UITheme {
  const colorMode = options.colorMode ?? 'light';
  const density = options.density ?? 'comfortable';
  const fontScale = options.fontScale ?? 1;
  if (!Number.isFinite(fontScale) || fontScale <= 0) {
    throw new RangeError('fontScale must be a positive finite number.');
  }
  const reducedMotion = options.reducedMotion ?? false;
  const overrides = options.theme ?? {};
  const spacing = {
    ...(density === 'compact'
      ? { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 }
      : { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }),
    ...defined(overrides.spacing),
  };
  const typography = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 14,
    lineHeight: 20,
    smallFontSize: 12,
    smallLineHeight: 16,
    headingFontSize: 20,
    headingLineHeight: 28,
    ...defined(overrides.typography),
  };
  for (const key of [
    'fontSize',
    'lineHeight',
    'smallFontSize',
    'smallLineHeight',
    'headingFontSize',
    'headingLineHeight',
  ] as const) {
    typography[key] *= fontScale;
  }
  const controlSize = {
    ...(density === 'compact'
      ? { sm: 28, md: 36, lg: 44 }
      : { sm: 32, md: 40, lg: 48 }),
    ...defined(overrides.controlSize),
  };
  controlSize.sm = Math.max(
    controlSize.sm,
    typography.smallLineHeight + spacing.xs * 2,
  );
  controlSize.md = Math.max(
    controlSize.md,
    typography.lineHeight + spacing.sm * 2,
  );
  controlSize.lg = Math.max(
    controlSize.lg,
    typography.lineHeight + spacing.md * 2,
  );
  const motion = {
    fast: 120,
    normal: 200,
    slow: 320,
    easing: 'ease-out',
    ...defined(overrides.motion),
  };
  if (reducedMotion) motion.fast = motion.normal = motion.slow = 0;
  const tokens: ThemeTokens = {
    colors: Object.freeze({
      ...palettes[colorMode],
      ...defined(overrides.colors),
    }),
    spacing: Object.freeze(spacing),
    controlSize: Object.freeze(controlSize),
    typography: Object.freeze(typography),
    radius: Object.freeze({
      sm: 4,
      md: 8,
      lg: 12,
      pill: 9999,
      ...defined(overrides.radius),
    }),
    motion: Object.freeze(motion),
  };
  return Object.freeze({
    colorMode,
    density,
    fontScale,
    reducedMotion,
    ...tokens,
  });
}

export const defaultTheme: UITheme = createTheme();
