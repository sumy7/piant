import { describe, expect, it } from 'vitest';
import { Typesetter, type InlineItem } from '../src/elements/text/index.ts';

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
});
