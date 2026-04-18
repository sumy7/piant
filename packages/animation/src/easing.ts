import {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  cubicBezier,
  circIn,
  circOut,
  circInOut,
  backIn,
  backOut,
  backInOut,
  anticipate,
} from 'popmotion';

export type EasingFunction = (t: number) => number;

/**
 * Parses a CSS/Web Animation API easing string and returns a popmotion-compatible
 * easing function (progress: 0–1 → value: 0–1).
 */
export function parseEasing(easing: string): EasingFunction {
  switch (easing) {
    case 'linear':
      return linear;
    case 'ease':
      return cubicBezier(0.25, 0.1, 0.25, 1.0);
    case 'ease-in':
      return easeIn;
    case 'ease-out':
      return easeOut;
    case 'ease-in-out':
      return easeInOut;
    case 'circ-in':
    case 'circIn':
      return circIn;
    case 'circ-out':
    case 'circOut':
      return circOut;
    case 'circ-in-out':
    case 'circInOut':
      return circInOut;
    case 'back-in':
    case 'backIn':
      return backIn;
    case 'back-out':
    case 'backOut':
      return backOut;
    case 'back-in-out':
    case 'backInOut':
      return backInOut;
    case 'anticipate':
      return anticipate;
    default: {
      // Parse cubic-bezier(x1, y1, x2, y2)
      const cbMatch = easing.match(
        /^cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/,
      );
      if (cbMatch) {
        const x1 = Number(cbMatch[1]);
        const y1 = Number(cbMatch[2]);
        const x2 = Number(cbMatch[3]);
        const y2 = Number(cbMatch[4]);
        return cubicBezier(x1, y1, x2, y2);
      }
      return linear;
    }
  }
}
