import { type Sprite, type Texture } from 'pixi.js';

export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom' | 'baseline';

export type LineHeight = number | `${number}x` | 'normal';

export type TextLayoutStyle = {
  fontSize: number;
  color: string;
  lineHeight: LineHeight;
  verticalAlign: VerticalAlign;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic' | 'oblique' | string;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace: 'normal' | 'nowrap' | string;
  wordBreak: 'break-word' | 'normal' | string;
  textAlign: TextAlign;
};

export type InlineBaseStyle = Partial<TextLayoutStyle> & {
  width?: number;
  height?: number;
};

export type InlineTextItem = InlineBaseStyle & {
  type: 'text';
  content: string;
};

export type InlineImageItem = InlineBaseStyle & {
  type: 'image';
  // source is the preferred input; src/content are backward-compatible aliases.
  source?: ImageSource;
  content?: ImageSource;
  src?: ImageSource;
};

export type ImageSource = Sprite | Texture;

export type InlineItem = InlineTextItem | InlineImageItem;

export type TextRenderSurface = {
  sprite: Sprite;
  texture?: Texture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
};
