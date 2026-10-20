import { describe, expect, it } from 'vitest';
import { type InlineItem, Typesetter } from '../src/elements/text';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => ({
    font: '',
    measureText: (text: string) => ({ width: text.length * 8 }),
  }),
});

describe('Typesetter', () => {
  it('wraps text to more lines under narrow width', () => {
    const items: InlineItem[] = [
      {
        type: 'text',
        content: 'Hello world from rich text layout with automatic wrapping.',
      },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const wide = typesetter.flow(400);
    const narrow = typesetter.flow(120);

    expect(wide.height).toBeGreaterThan(0);
    expect(narrow.height).toBeGreaterThan(wide.height);
  });

  it('handles image inline item in layout flow', () => {
    const fakeSprite = {
      width: 80,
      height: 20,
      texture: { width: 80, height: 20 },
    } as any;

    const items: InlineItem[] = [
      { type: 'text', content: 'A ' },
      { type: 'image', content: fakeSprite },
      { type: 'text', content: ' B' },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const narrow = typesetter.flow(60);
    const wide = typesetter.flow(300);

    expect(narrow.width).toBeGreaterThan(0);
    expect(narrow.height).toBeGreaterThan(0);
    expect(wide.width).toBeGreaterThan(0);
    expect(wide.height).toBeGreaterThan(0);
  });

  it('measures an inline image at its exact width without a placeholder glyph', () => {
    const typesetter = new Typesetter(
      [{ type: 'image', width: 24, height: 24 }],
      { lineHeight: 20 },
    );

    expect(typesetter.flow(100)).toEqual({ width: 24, height: 24 });
  });

  it('fits adjacent text and an image exactly on one line', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A' },
        { type: 'image', width: 24, height: 20 },
        { type: 'text', content: 'B' },
      ],
      { lineHeight: 20 },
    );

    expect(typesetter.flow(40)).toEqual({ width: 40, height: 20 });
    expect(typesetter.flow(32).height).toBe(40);
  });

  it('preserves spaces and hard breaks across styled runs with pre-wrap', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A  ' },
        { type: 'text', content: 'B\nC', fontWeight: 'bold' },
      ],
      { lineHeight: 20, whiteSpace: 'pre-wrap' },
    );

    expect(typesetter.flow(100)).toEqual({ width: 32, height: 40 });
  });

  it('keeps CJK words together across styled runs with keep-all', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A 甲乙' },
        { type: 'text', content: '丙丁', fontWeight: 'bold' },
      ],
      { lineHeight: 20, wordBreak: 'keep-all' },
    );

    expect(typesetter.flow(40)).toEqual({ width: 32, height: 40 });
  });

  it('wraps a word split across styled runs as one word', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A ab' },
        { type: 'text', content: 'cd', fontWeight: 'bold' },
      ],
      { lineHeight: 20 },
    );

    expect(typesetter.flow(40)).toEqual({ width: 32, height: 40 });
  });

  it('keeps punctuation at the start of a styled run with its preceding word', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A word' },
        { type: 'text', content: ', end', fontWeight: 'bold' },
      ],
      { lineHeight: 20 },
    );

    expect(typesetter.flow(48)).toEqual({ width: 40, height: 60 });
  });

  it('uses max lineHeight for each line box', () => {
    const items: InlineItem[] = [
      { type: 'text', content: 'short ', lineHeight: 20 },
      { type: 'text', content: 'veryverylong', lineHeight: '3x', fontSize: 20 },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const result = typesetter.flow(50);
    // line1 ~= 20, line2 ~= 60 (3x * 20)
    expect(result.height).toBeGreaterThanOrEqual(80);
  });

  it('supports verticalAlign variants without layout errors', () => {
    const fakeSprite = {
      width: 24,
      height: 24,
      texture: { width: 24, height: 24 },
    } as any;

    const items: InlineItem[] = [
      { type: 'text', content: 'top', verticalAlign: 'top', lineHeight: 40 },
      { type: 'text', content: 'mid', verticalAlign: 'middle', lineHeight: 40 },
      {
        type: 'text',
        content: 'base',
        verticalAlign: 'baseline',
        lineHeight: 40,
      },
      {
        type: 'image',
        content: fakeSprite,
        verticalAlign: 'bottom',
        lineHeight: 40,
      },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const result = typesetter.flow(500);
    expect(result.height).toBeGreaterThanOrEqual(40);
  });

  it('limits visible lines when lineClamp is set', () => {
    const items: InlineItem[] = [
      {
        type: 'text',
        content:
          'line one line two line three line four line five line six line seven',
      },
    ];

    const noClamp = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      textOverflow: 'clip',
    });
    const clamped = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      lineClamp: 2,
      textOverflow: 'clip',
    });

    const noClampResult = noClamp.flow(80);
    const clampedResult = clamped.flow(80);

    expect(clampedResult.height).toBe(40);
    expect(noClampResult.height).toBeGreaterThan(clampedResult.height);
  });

  it('letterSpacing widens measured width compared to no spacing', () => {
    const items: InlineItem[] = [{ type: 'text', content: 'Hello' }];

    const noSpacing = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
    });
    const withSpacing = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 10,
    });

    const noSpacingResult = noSpacing.flow(Number.POSITIVE_INFINITY);
    const withSpacingResult = withSpacing.flow(Number.POSITIVE_INFINITY);

    expect(withSpacingResult.width).toBeGreaterThan(noSpacingResult.width);
  });

  it('letterSpacing causes more or equal line breaks under narrow width', () => {
    const items: InlineItem[] = [
      { type: 'text', content: 'Hello world test' },
    ];

    const noSpacing = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
    });
    const withSpacing = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 10,
    });

    const noSpacingResult = noSpacing.flow(200);
    const withSpacingResult = withSpacing.flow(200);

    expect(withSpacingResult.height).toBeGreaterThanOrEqual(
      noSpacingResult.height,
    );
  });
});
