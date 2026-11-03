/** Encoded sRGB channels in bytes, plus alpha in [0, 1]. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Hue in degrees [0, 360); saturation, value and alpha in [0, 1]. */
export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

function finite(value: number): number {
  if (!Number.isFinite(value))
    throw new Error('Color channels must be finite numbers.');
  return value;
}

const unit = (value: number) => Math.max(0, Math.min(1, finite(value)));
const byte = (value: number) =>
  Math.round(Math.max(0, Math.min(255, finite(value))));
const alphaByte = (value: number) => Math.round(unit(value) * 255) / 255;

function normalizeRgba(rgba: Rgba): Rgba {
  return {
    r: byte(rgba.r),
    g: byte(rgba.g),
    b: byte(rgba.b),
    a: alphaByte(rgba.a),
  };
}

/** Finite values clamp to range; hue wraps, alpha uses the serialized byte grid. */
export function normalizeHsva(hsva: Hsva): Hsva {
  const hue = finite(hsva.h) % 360;
  return {
    h: hue === 0 ? 0 : hue < 0 ? hue + 360 : hue,
    s: unit(hsva.s),
    v: unit(hsva.v),
    a: alphaByte(hsva.a),
  };
}

/** CSS hex notation only: #rgb, #rgba, #rrggbb, #rrggbbaa. */
export function parseHexColor(text: string): Rgba | undefined {
  const value = text.trim();
  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value))
    return;
  const short = value.length === 4 || value.length === 5;
  const hex = short
    ? [...value.slice(1)].map((channel) => channel + channel).join('')
    : value.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

/** Canonical lowercase hex; alpha=false intentionally projects to opaque RGB. */
export function formatHexColor(rgba: Rgba, alpha = true): string {
  const normalized = normalizeRgba(rgba);
  const channels = [normalized.r, normalized.g, normalized.b];
  if (alpha) channels.push(Math.round(normalized.a * 255));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Gray has no determined hue; black also has no determined saturation.
 * Retain those latent components from the previous editing state when supplied.
 */
export function rgbaToHsva(rgba: Rgba, previous?: Hsva): Hsva {
  const color = normalizeRgba(rgba);
  const old = previous === undefined ? undefined : normalizeHsva(previous);
  const r = color.r / 255,
    g = color.g / 255,
    b = color.b / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const delta = max - min;
  let hue = old?.h ?? 0;
  if (delta !== 0) {
    hue =
      max === r
        ? ((g - b) / delta) * 60
        : max === g
          ? ((b - r) / delta + 2) * 60
          : ((r - g) / delta + 4) * 60;
  }
  return normalizeHsva({
    h: hue,
    s: max === 0 ? (old?.s ?? 0) : delta / max,
    v: max,
    a: color.a,
  });
}

/** Convert HSV in encoded sRGB space, rounding the result onto RGB/alpha bytes. */
export function hsvaToRgba(hsva: Hsva): Rgba {
  const { h, s, v, a } = normalizeHsva(hsva);
  const chroma = v * s;
  const sector = h / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const components =
    sector < 1
      ? [chroma, x, 0]
      : sector < 2
        ? [x, chroma, 0]
        : sector < 3
          ? [0, chroma, x]
          : sector < 4
            ? [0, x, chroma]
            : sector < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const match = v - chroma;
  return {
    r: byte((components[0] + match) * 255),
    g: byte((components[1] + match) * 255),
    b: byte((components[2] + match) * 255),
    a,
  };
}
