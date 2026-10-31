export type ColorMode = 'light' | 'dark';
export type ControlDensity = 'comfortable' | 'compact';

export interface ThemeTokens {
  readonly colors: Readonly<{
    canvas: string;
    surface: string;
    surfaceRaised: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    danger: string;
    onDanger: string;
    focusRing: string;
  }>;
  readonly spacing: Readonly<{
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  }>;
  /** Minimum control heights in logical pixels, expanded to fit scaled text. */
  readonly controlSize: Readonly<{ sm: number; md: number; lg: number }>;
  readonly typography: Readonly<{
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    smallFontSize: number;
    smallLineHeight: number;
    headingFontSize: number;
    headingLineHeight: number;
  }>;
  readonly radius: Readonly<{
    sm: number;
    md: number;
    lg: number;
    pill: number;
  }>;
  /** Durations in milliseconds. Reduced motion resolves every duration to zero. */
  readonly motion: Readonly<{
    fast: number;
    normal: number;
    slow: number;
    easing: string;
  }>;
}

/** Only declared groups/leaves may be overridden; undefined leaves inherit. */
export type ThemeOverrides = {
  readonly [Group in keyof ThemeTokens]?: Partial<ThemeTokens[Group]>;
};

export interface ThemeOptions {
  colorMode?: ColorMode;
  density?: ControlDensity;
  /** Positive finite multiplier applied to typography after merging overrides. */
  fontScale?: number;
  reducedMotion?: boolean;
  theme?: ThemeOverrides;
}

export interface UITheme extends ThemeTokens {
  readonly colorMode: ColorMode;
  readonly density: ControlDensity;
  readonly fontScale: number;
  readonly reducedMotion: boolean;
}
