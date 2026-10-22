import { Container, Sprite, Texture } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Span, Text } from '../src/components/Text';
import type { PText } from '../src/elements/PText';
import {
  type InlineItem,
  type TextDecoration,
  type TextLayoutStyle,
  type TextRenderSurface,
  Typesetter,
} from '../src/elements/text';
import type { TextStyles } from '../src/elements/text/textStyles';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

type TextDraw = {
  text: string;
  x: number;
  y: number;
  color: string;
  font: string;
};
type RectDraw = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};
type RecordingContext = CanvasRenderingContext2D & {
  texts: TextDraw[];
  rects: RectDraw[];
  clears: number;
};

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);

beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: () => {
      const context = {
        font: '16px Arial',
        fillStyle: '#000000',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        texts: [] as TextDraw[],
        rects: [] as RectDraw[],
        clears: 0,
        setTransform() {},
        clearRect() {
          this.texts.length = 0;
          this.rects.length = 0;
          this.clears++;
        },
        measureText(text: string) {
          const size = Number.parseFloat(
            this.font.match(/([\d.]+)px/)?.[1] ?? '16',
          );
          return {
            width: (text.length * size) / 2,
            actualBoundingBoxAscent: size * (text === 'x' ? 0.5 : 0.75),
            actualBoundingBoxDescent: text === 'ABC' ? 0 : size * 0.25,
          };
        },
        fillText(text: string, x: number, y: number) {
          this.texts.push({
            text,
            x,
            y,
            color: this.fillStyle,
            font: this.font,
          });
        },
        fillRect(x: number, y: number, width: number, height: number) {
          this.rects.push({ x, y, width, height, color: this.fillStyle });
        },
      };
      return context;
    },
  });
});

afterAll(() => {
  if (originalGetContext) {
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext,
    );
  }
  vi.unstubAllGlobals();
});

function createSurface() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d') as RecordingContext;
  const surface: TextRenderSurface = {
    canvas,
    ctx,
    sprite: new Sprite(Texture.from(canvas)),
  };
  return { surface, ctx, container: new Container() };
}

function render(
  items: InlineItem[],
  style: Partial<TextLayoutStyle> = {},
  width = 200,
) {
  const typesetter = new Typesetter(items, { lineHeight: 20, ...style });
  const result = createSurface();
  const size = typesetter.flow(width);
  typesetter.renderTo(result.container, result.surface);
  return { ...result, typesetter, size };
}

describe('text decoration drawing', () => {
  it('defaults to no decoration and does not change measured layout', () => {
    const items: InlineItem[] = [{ type: 'text', content: 'AB CD EF' }];
    const plain = render(items, {}, 32);
    const decorated = render(
      items,
      { textDecoration: 'underline line-through' },
      32,
    );
    expect(plain.ctx.rects).toEqual([]);
    expect(decorated.size).toEqual(plain.size);
    expect(decorated.ctx.texts).toEqual(plain.ctx.texts);
    expect(decorated.ctx.rects.length).toBeGreaterThan(0);
  });

  it.each<TextDecoration>(['underline line-through', 'line-through underline'])(
    'draws %s at font descent and x-height using the occupied letter-spaced width',
    (textDecoration) => {
      const { ctx, size } = render([{ type: 'text', content: 'AB' }], {
        textDecoration,
        letterSpacing: 2,
        color: '#123456',
      });
      expect(ctx.texts).toEqual([
        {
          text: 'A',
          x: 0,
          y: 14,
          color: '#123456',
          font: 'normal normal 16px Arial',
        },
        {
          text: 'B',
          x: 10,
          y: 14,
          color: '#123456',
          font: 'normal normal 16px Arial',
        },
      ]);
      expect(ctx.rects).toEqual([
        { x: 0, y: 15.5, width: size.width, height: 1, color: '#123456' },
        { x: 0, y: 9.5, width: size.width, height: 1, color: '#123456' },
      ]);
    },
  );

  it('uses each font size, color and vertically aligned baseline for mixed fragments', () => {
    const { ctx } = render([
      {
        type: 'text',
        content: 'A',
        fontSize: 32,
        color: 'red',
        textDecoration: 'underline',
      },
      {
        type: 'text',
        content: 'B',
        fontSize: 16,
        fontFamily: 'serif',
        color: 'blue',
        verticalAlign: 'top',
        textDecoration: 'line-through',
      },
      {
        type: 'text',
        content: 'C',
        fontSize: 16,
        color: 'green',
        verticalAlign: 'bottom',
        textDecoration: 'underline',
      },
    ]);
    expect(ctx.texts.map(({ x, y, font }) => ({ x, y, font }))).toEqual([
      { x: 0, y: 24, font: 'normal normal 32px Arial' },
      { x: 16, y: 12, font: 'normal normal 16px serif' },
      { x: 24, y: 28, font: 'normal normal 16px Arial' },
    ]);
    expect(ctx.rects).toEqual([
      { x: 0, y: 27, width: 16, height: 2, color: 'red' },
      { x: 16, y: 7.5, width: 8, height: 1, color: 'blue' },
      { x: 24, y: 29.5, width: 8, height: 1, color: 'green' },
    ]);
  });

  it.each([
    ['center', 8],
    ['right', 16],
  ] as const)(
    'follows wrapped line widths and %s alignment',
    (textAlign, x) => {
      const { ctx, size } = render(
        [{ type: 'text', content: 'AB\nC' }],
        {
          textDecoration: 'underline',
          whiteSpace: 'pre-wrap',
          textAlign,
        },
        24,
      );
      expect(size).toEqual({ width: 16, height: 40 });
      expect(
        ctx.texts.map(({ text, x: textX, y }) => ({ text, x: textX, y })),
      ).toEqual([
        { text: 'AB', x: x / 2, y: 14 },
        { text: 'C', x, y: 34 },
      ]);
      expect(ctx.rects).toEqual([
        { x: x / 2, y: 15.5, width: 16, height: 1, color: '#000000' },
        { x, y: 35.5, width: 8, height: 1, color: '#000000' },
      ]);
    },
  );

  it('keeps underline segments within each naturally wrapped letter-spaced fragment', () => {
    const { ctx, size } = render(
      [{ type: 'text', content: 'ABCD' }],
      {
        textDecoration: 'underline',
        letterSpacing: 2,
      },
      20,
    );
    expect(size.height).toBe(40);
    expect(ctx.texts.map(({ text, x, y }) => ({ text, x, y }))).toEqual([
      { text: 'A', x: 0, y: 14 },
      { text: 'B', x: 10, y: 14 },
      { text: 'C', x: 0, y: 34 },
      { text: 'D', x: 10, y: 34 },
    ]);
    expect(ctx.rects).toEqual([
      { x: 0, y: 15.5, width: size.width, height: 1, color: '#000000' },
      { x: 0, y: 35.5, width: size.width, height: 1, color: '#000000' },
    ]);
  });

  it('draws only the visible wrapped fragments when clipped by lineClamp', () => {
    const { ctx, size } = render(
      [{ type: 'text', content: 'ABCD' }],
      {
        textDecoration: 'underline',
        lineClamp: 1,
        textOverflow: 'clip',
      },
      16,
    );
    expect(size).toEqual({ width: 16, height: 20 });
    expect(ctx.texts.map(({ text }) => text)).toEqual(['AB']);
    expect(ctx.rects).toEqual([
      { x: 0, y: 15.5, width: 16, height: 1, color: '#000000' },
    ]);
  });

  it('decorates a trimmed ellipsis using the selected source text style', () => {
    const { ctx } = render(
      [
        { type: 'text', content: 'A', textDecoration: 'none' },
        {
          type: 'text',
          content: 'BCDEFG',
          textDecoration: 'line-through',
          color: 'red',
        },
      ],
      { lineClamp: 1, textOverflow: 'ellipsis' },
      32,
    );
    expect(ctx.texts.map(({ text }) => text).join('')).toBe('ABC…');
    expect(ctx.rects.reduce((width, rect) => width + rect.width, 0)).toBe(24);
    expect(
      ctx.rects.every(
        ({ y, height, color }) => y === 9.5 && height === 1 && color === 'red',
      ),
    ).toBe(true);
    expect(ctx.rects.at(-1)).toMatchObject({ x: 24, width: 8 });
  });

  it('skips inline images and preserved tab gaps', () => {
    const { ctx, container, surface } = render(
      [
        { type: 'text', content: 'A\t' },
        { type: 'image', source: Texture.WHITE, width: 24, height: 20 },
        { type: 'text', content: 'B' },
      ],
      { textDecoration: 'underline', whiteSpace: 'pre-wrap' },
    );
    expect(ctx.texts.map(({ text, x }) => ({ text, x }))).toEqual([
      { text: 'A', x: 0 },
      { text: 'B', x: 88 },
    ]);
    expect(ctx.rects.map(({ x, width }) => ({ x, width }))).toEqual([
      { x: 0, width: 8 },
      { x: 88, width: 8 },
    ]);
    expect(
      container.children.filter((child) => child !== surface.sprite),
    ).toHaveLength(1);
  });

  it('uses the image source style for image-only clamped ellipsis, without decorating the image box', () => {
    const { ctx, container, surface } = render(
      [
        {
          type: 'image',
          source: Texture.WHITE,
          width: 24,
          height: 24,
          textDecoration: 'line-through',
          color: 'purple',
        },
        { type: 'image', source: Texture.WHITE, width: 24, height: 24 },
      ],
      { lineClamp: 1, textOverflow: 'ellipsis' },
      24,
    );
    expect(ctx.texts.map(({ text }) => text)).toEqual(['…']);
    expect(ctx.rects).toEqual([
      { x: 0, y: 9.5, width: 8, height: 1, color: 'purple' },
    ]);
    expect(container.children).toEqual([surface.sprite]);
  });

  it('keeps the underline inside a tight line box when glyphs have no descenders', () => {
    const items: InlineItem[] = [{ type: 'text', content: 'ABC' }];
    const plain = render(items, { lineHeight: 10 });
    const decorated = render(items, {
      lineHeight: 10,
      textDecoration: 'underline',
    });
    expect(decorated.size).toEqual(plain.size);
    expect(decorated.ctx.texts).toEqual(plain.ctx.texts);
    expect(decorated.ctx.rects).toHaveLength(1);
    const underline = decorated.ctx.rects[0]!;
    expect(underline.y + underline.height).toBeLessThanOrEqual(
      decorated.size.height,
    );
    expect(underline.width).toBe(decorated.size.width);
  });

  it('clears removed decorations while retaining the canvas, texture and sprite', () => {
    const { typesetter, ctx, surface, container } = render(
      [{ type: 'text', content: 'AB' }],
      { textDecoration: 'underline' },
    );
    const { canvas, texture, sprite } = surface;
    expect(ctx.rects).toHaveLength(1);
    typesetter.setStyles({ textDecoration: 'none' });
    typesetter.flow(200);
    typesetter.renderTo(container, surface);
    expect(ctx.rects).toEqual([]);
    expect(ctx.texts.map(({ text }) => text)).toEqual(['AB']);
    expect(ctx.clears).toBe(2);
    expect(surface.canvas).toBe(canvas);
    expect(surface.texture).toBe(texture);
    expect(container.children).toEqual([sprite]);
  });
});

describe('Text and Span decoration inheritance', () => {
  it('inherits through nested spans and replaces the parent combination with child decoration or none', () => {
    root(() => {
      const element = Text({
        style: { textDecoration: 'underline line-through' },
        children: Span({
          children: [
            'A',
            Span({ style: { textDecoration: 'underline' }, children: 'B' }),
            Span({ style: { textDecoration: 'none' }, children: 'C' }),
            Span({ children: 'D' }),
          ],
        }),
      })() as PText;
      const { surface, ctx, container } = createSurface();
      element._textTypesetter.flow(200);
      element._textTypesetter.renderTo(container, surface);
      expect(ctx.rects.map(({ x, width }) => ({ x, width }))).toEqual([
        { x: 0, width: 8 },
        { x: 0, width: 8 },
        { x: 8, width: 8 },
        { x: 24, width: 8 },
        { x: 24, width: 8 },
      ]);
      element.destroy();
    });
  });

  it('reacts to root and Span style changes and removal, restoring inherited defaults', () => {
    root(() => {
      const [textStyle, setTextStyle] = createState<TextStyles>({
        textDecoration: 'underline',
      });
      const [spanStyle, setSpanStyle] = createState<TextStyles>({
        textDecoration: 'none',
      });
      const element = Text({
        get style() {
          return textStyle();
        },
        children: Span({
          get style() {
            return spanStyle();
          },
          children: 'AB',
        }),
      })() as PText;
      const { surface, ctx, container } = createSurface();
      const repaint = () => {
        element._textTypesetter.flow(200);
        element._textTypesetter.renderTo(container, surface);
      };
      repaint();
      expect(ctx.rects).toEqual([]);
      setSpanStyle({});
      repaint();
      expect(ctx.rects.map(({ y }) => y)).toEqual([15.5]);
      setTextStyle({ textDecoration: 'line-through' });
      repaint();
      expect(ctx.rects.map(({ y }) => y)).toEqual([9.5]);
      setSpanStyle({ textDecoration: 'underline line-through' });
      repaint();
      expect(ctx.rects).toHaveLength(2);
      setSpanStyle({});
      setTextStyle({});
      repaint();
      expect(element._textLayoutStyle.textDecoration).toBe('none');
      expect(ctx.rects).toEqual([]);
      expect(ctx.texts.map(({ text }) => text)).toEqual(['AB']);
      expect(ctx.clears).toBe(5);
      element.destroy();
    });
  });
});
