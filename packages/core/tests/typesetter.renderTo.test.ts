import { Container, Sprite, Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import {
  type InlineItem,
  type TextRenderSurface,
  Typesetter,
} from '../src/elements/text';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => {
    let currentFont = '16px Arial';
    return {
      get font() {
        return currentFont;
      },
      set font(value: string) {
        currentFont = value;
      },
      fillStyle: '#000000',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      setTransform: () => {},
      clearRect: () => {},
      measureText: (text: string) => ({
        width: text.length * 8,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
      }),
      fillText: () => {},
    };
  },
});

describe('Typesetter renderTo', () => {
  const createSurface = (): TextRenderSurface => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    return {
      canvas,
      ctx,
      sprite: new Sprite(Texture.from(canvas)),
    };
  };

  it('reuses render objects across repeated renders', () => {
    const imageSprite = new Sprite(Texture.WHITE);
    imageSprite.width = 24;
    imageSprite.height = 24;

    const items: InlineItem[] = [
      { type: 'text', content: 'Hello ' },
      { type: 'image', content: imageSprite },
      { type: 'text', content: 'world' },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const container = new Container();
    const surface = createSurface();
    typesetter.flow(280);
    typesetter.renderTo(container, surface, { width: 280, height: 20 });
    const first = [...container.children];

    typesetter.renderTo(container, surface, { width: 280, height: 20 });
    const second = [...container.children];

    expect(second.length).toBeGreaterThan(0);
    expect(first[0]).toBe(surface.sprite);
    expect(second.length).toBe(first.length);
    for (let i = 0; i < first.length; i++) {
      expect(second[i]).toBe(first[i]);
    }
  });

  it('updates cached sprite bounds and canvas texture dimensions without replacing them', () => {
    const typesetter = new Typesetter([{ type: 'text', content: 'Resize' }]);
    const container = new Container();
    const surface = createSurface();
    const sprite = surface.sprite;
    const texture = sprite.texture;
    typesetter.flow(80);
    typesetter.renderTo(container, surface, { width: 80, height: 20 });
    expect(sprite.getBounds().width).toBe(80);

    typesetter.flow(160);
    typesetter.renderTo(container, surface, { width: 160, height: 40 });

    expect(surface.sprite).toBe(sprite);
    expect(surface.texture).toBe(texture);
    expect(texture.source.pixelWidth).toBe(surface.canvas.width);
    expect(texture.source.pixelHeight).toBe(surface.canvas.height);
    expect(sprite.getBounds().width).toBe(160);
    expect(sprite.getBounds().height).toBe(40);
    expect(container.children).toEqual([sprite]);
  });

  it('keeps renderTo benchmark stable and without child growth', () => {
    const text = 'Benchmark text render on canvas texture sprite path.';
    const items: InlineItem[] = [{ type: 'text', content: text }];
    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 1,
    });

    const container = new Container();
    const surface = createSurface();
    typesetter.flow(240);

    const start = performance.now();
    for (let i = 0; i < 300; i++) {
      typesetter.renderTo(container, surface, { width: 240, height: 20 });
    }
    const durationMs = performance.now() - start;

    expect(container.children.length).toBe(1);
    expect(container.children[0]).toBe(surface.sprite);
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it('renders same image source in multiple positions without parent conflict', () => {
    const sharedSource = new Sprite(Texture.WHITE);
    sharedSource.width = 18;
    sharedSource.height = 18;

    const items: InlineItem[] = [
      { type: 'image', source: sharedSource, width: 18, height: 18 },
      { type: 'text', content: ' gap ' },
      { type: 'image', source: sharedSource, width: 18, height: 18 },
    ];

    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const container = new Container();
    const surface = createSurface();
    typesetter.flow(300);
    typesetter.renderTo(container, surface, { width: 300, height: 24 });

    const imageNodes = container.children.filter(
      (node) => node !== surface.sprite,
    ) as Sprite[];

    expect(imageNodes.length).toBe(2);
    expect(imageNodes[0]).not.toBe(imageNodes[1]);
    expect(imageNodes[0].texture).toBe(sharedSource.texture);
    expect(imageNodes[1].texture).toBe(sharedSource.texture);
  });

  it('adds top leading when lineHeight exceeds glyph height', () => {
    const items: InlineItem[] = [{ type: 'text', content: 'Hello' }];
    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
    });

    const drawCalls: Array<{ x: number; y: number }> = [];
    const surface = createSurface();
    surface.ctx.fillText = ((_text: string, x: number, y: number) => {
      drawCalls.push({ x, y });
    }) as CanvasRenderingContext2D['fillText'];

    const container = new Container();
    typesetter.flow(200);
    typesetter.renderTo(container, surface, { width: 200, height: 20 });

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls[0]?.y).toBe(14);
  });

  it('positions text immediately after the native inline image box', () => {
    const image = new Sprite(Texture.WHITE);
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A' },
        { type: 'image', source: image, width: 24, height: 20 },
        { type: 'text', content: 'B' },
      ],
      { lineHeight: 20 },
    );
    const surface = createSurface();
    const drawCalls: Array<{ text: string; x: number }> = [];
    surface.ctx.fillText = ((text: string, x: number) => {
      drawCalls.push({ text, x });
    }) as CanvasRenderingContext2D['fillText'];
    const container = new Container();

    typesetter.flow(40);
    typesetter.renderTo(container, surface);

    expect(drawCalls).toEqual([
      { text: 'A', x: 0 },
      { text: 'B', x: 32 },
    ]);
    const imageNode = container.children.find(
      (node) => node !== surface.sprite,
    );
    expect(imageNode?.x).toBe(8);
    expect(imageNode?.width).toBe(24);
  });

  it('draws text after preserved tabs at pretext tab stops', () => {
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A\tB' },
        { type: 'text', content: '\tC', fontWeight: 'bold' },
      ],
      { lineHeight: 20, whiteSpace: 'pre-wrap' },
    );
    const surface = createSurface();
    const drawCalls: Array<{ text: string; x: number }> = [];
    surface.ctx.fillText = ((text: string, x: number) => {
      drawCalls.push({ text, x });
    }) as CanvasRenderingContext2D['fillText'];

    expect(typesetter.flow(200)).toEqual({ width: 136, height: 20 });
    typesetter.renderTo(new Container(), surface);

    expect(drawCalls).toEqual([
      { text: 'A', x: 0 },
      { text: 'B', x: 64 },
      { text: 'C', x: 128 },
    ]);
  });

  it('keeps inline images atomic when trimming a clamped line', () => {
    const image = new Sprite(Texture.WHITE);
    const typesetter = new Typesetter(
      [
        { type: 'text', content: 'A' },
        { type: 'image', source: image, width: 24, height: 20 },
        { type: 'text', content: ' long overflow text' },
      ],
      { lineHeight: 20, lineClamp: 1, textOverflow: 'ellipsis' },
    );
    const surface = createSurface();
    const drawCalls: string[] = [];
    surface.ctx.fillText = ((text: string) => {
      drawCalls.push(text);
    }) as CanvasRenderingContext2D['fillText'];
    const container = new Container();

    expect(typesetter.flow(32).height).toBe(20);
    typesetter.renderTo(container, surface);

    expect(drawCalls).toEqual(['A', '…']);
    expect(container.children).toEqual([surface.sprite]);
  });

  it('renders a text ellipsis when a clamped line contains only images', () => {
    const image = new Sprite(Texture.WHITE);
    const typesetter = new Typesetter(
      [
        { type: 'image', source: image, width: 24, height: 24 },
        { type: 'image', source: image, width: 24, height: 24 },
      ],
      { lineHeight: 20, lineClamp: 1, textOverflow: 'ellipsis' },
    );
    const surface = createSurface();
    const drawCalls: string[] = [];
    surface.ctx.fillText = ((text: string) => {
      drawCalls.push(text);
    }) as CanvasRenderingContext2D['fillText'];
    const container = new Container();

    expect(typesetter.flow(24)).toEqual({ width: 8, height: 20 });
    typesetter.renderTo(container, surface);

    expect(drawCalls).toEqual(['…']);
    expect(container.children).toEqual([surface.sprite]);
  });

  it('draws ellipsis on the last visible line when clamped', () => {
    const items: InlineItem[] = [
      {
        type: 'text',
        content:
          'This sentence should overflow and render an ellipsis after clamping.',
      },
    ];
    const typesetter = new Typesetter(items, {
      fontSize: 16,
      lineHeight: 20,
      textOverflow: 'ellipsis',
      lineClamp: 1,
    });

    const drawCalls: string[] = [];
    const surface = createSurface();
    surface.ctx.fillText = ((text: string) => {
      drawCalls.push(text);
    }) as CanvasRenderingContext2D['fillText'];

    const container = new Container();
    typesetter.flow(90);
    typesetter.renderTo(container, surface, { width: 90, height: 20 });

    expect(drawCalls.length).toBeGreaterThan(0);
    expect(drawCalls.some((text) => text.includes('…'))).toBe(true);
  });
});
