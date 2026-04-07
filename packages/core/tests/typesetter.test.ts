import { describe, expect, it } from 'vitest';
import { Typesetter, type InlineItem } from '../src/elements/text';

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
});
