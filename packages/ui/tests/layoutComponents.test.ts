import { createState, type PNode, PRoot, render, View } from '@piant/core';
import { Container } from 'pixi.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Badge } from '../dist/components/Badge.js';
import { Separator } from '../dist/components/Separator.js';
import { Stack, type StackProps } from '../dist/components/Stack.js';
import { Surface, type SurfaceProps } from '../dist/components/Surface.js';
import { UIProvider, type UIProviderProps } from '../dist/index.js';

const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      font: '12px Arial',
      setTransform() {},
      clearRect() {},
      fillText() {},
      fillRect() {},
      measureText(text: string) {
        const size = Number.parseFloat(
          this.font.match(/([\d.]+)px/)?.[1] ?? '12',
        );
        return {
          width: (text.length * size) / 2,
          actualBoundingBoxAscent: size * 0.75,
          actualBoundingBoxDescent: size * 0.25,
        };
      },
    }),
  });
});
afterAll(() => {
  if (originalGetContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext,
    );
  vi.unstubAllGlobals();
});

function fixture(
  content: () => ReturnType<typeof View>,
  width = 240,
  height = 160,
) {
  const host = new PRoot(new Container(), { width, height });
  const dispose = render(content, host);
  return {
    host,
    dispose: () => {
      dispose();
      host.destroyRecursive();
    },
  };
}

describe('layout foundations', () => {
  it('updates Stack layout, density gaps and style overrides without recreating children', () => {
    let node!: PNode;
    let second!: PNode;
    let creations = 0;
    let update!: (value: StackProps) => void;
    let setCompact!: (value: boolean) => void;
    const app = fixture(() => {
      const [props, set] = createState<StackProps>({ direction: 'row' });
      const [compact, setDensity] = createState(false);
      update = set;
      setCompact = setDensity;
      return UIProvider({
        get density() {
          return compact() ? 'compact' : 'comfortable';
        },
        reducedMotion: false,
        children: () => {
          creations++;
          return Stack({
            ref: (value) => {
              node = value;
            },
            get direction() {
              return props().direction;
            },
            get gap() {
              return props().gap;
            },
            get wrap() {
              return props().wrap;
            },
            get style() {
              return [
                { width: 110, height: 120, alignItems: 'flex-start' as const },
                props().style,
              ];
            },
            children: [
              View({ style: { width: 40, height: 30 } }),
              View({
                ref: (value) => {
                  second = value;
                },
                style: { width: 40, height: 30 },
              }),
            ],
          });
        },
      });
    });
    try {
      app.host.doLayout();
      expect(second._layoutNode.getComputedLeft()).toBe(52);
      setCompact(true);
      app.host.doLayout();
      expect(second._layoutNode.getComputedLeft()).toBe(48);
      update({ direction: 'column', gap: 5 });
      app.host.doLayout();
      expect(second._layoutNode.getComputedTop()).toBe(35);
      update({ direction: 'row', wrap: true, style: { width: 60, gap: 3 } });
      app.host.doLayout();
      expect(second._layoutNode.getComputedTop()).toBe(33);
      expect(node._layoutNode.getComputedWidth()).toBe(60);
      expect(creations).toBe(1);
    } finally {
      app.dispose();
    }
    expect(node.isDestroyed).toBe(true);
  });

  it('keeps Surface overrides reactive and restores themed defaults when removed', () => {
    let node!: PNode;
    let update!: (value: SurfaceProps) => void;
    let setTheme!: (value: UIProviderProps) => void;
    const app = fixture(() => {
      const [props, set] = createState<SurfaceProps>({ bordered: true });
      const [options, setOptions] = createState<UIProviderProps>({});
      update = set;
      setTheme = setOptions;
      return UIProvider({
        get colorMode() {
          return options().colorMode;
        },
        get density() {
          return options().density;
        },
        reducedMotion: false,
        children: () =>
          Surface({
            ref: (value) => {
              node = value;
            },
            get tone() {
              return props().tone;
            },
            get bordered() {
              return props().bordered;
            },
            get padding() {
              return props().padding;
            },
            get style() {
              return props().style;
            },
          }),
      });
    });
    try {
      expect(node._layoutStyle.backgroundColor).toBe('#ffffff');
      expect(node._layoutStyle.padding).toBe(12);
      update({
        tone: 'raised',
        padding: 0,
        style: { backgroundColor: '#123456', overflow: 'hidden' },
      });
      setTheme({ colorMode: 'dark', density: 'compact' });
      expect(node._layoutStyle.backgroundColor).toBe('#123456');
      expect(node._layoutStyle.padding).toBe(0);
      expect(node._layoutStyle.borderWidth).toBe(0);
      update({ tone: 'raised' });
      expect(node._layoutStyle.backgroundColor).toBe('#334155');
      expect(node._layoutStyle.padding).toBe(8);
      expect(node._layoutStyle.overflow).not.toBe('hidden');
    } finally {
      app.dispose();
    }
  });

  it('changes Separator orientation without leaving stale axis sizes, and clamps invalid thickness', () => {
    let node!: PNode;
    let update!: (value: {
      orientation?: 'horizontal' | 'vertical';
      thickness?: number;
      length?: number;
    }) => void;
    const app = fixture(() => {
      const [props, set] = createState<{
        orientation?: 'horizontal' | 'vertical';
        thickness?: number;
        length?: number;
      }>({});
      update = set;
      return View({
        style: { flexDirection: 'row', width: 180, height: 80 },
        children: Separator({
          ref: (value) => {
            node = value;
          },
          get orientation() {
            return props().orientation;
          },
          get thickness() {
            return props().thickness;
          },
          get length() {
            return props().length;
          },
        }),
      });
    });
    try {
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBe(180);
      expect(node._layoutNode.getComputedHeight()).toBe(1);
      update({ orientation: 'vertical', thickness: 2 });
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBe(2);
      expect(node._layoutNode.getComputedHeight()).toBe(80);
      update({ orientation: 'horizontal', thickness: Number.NaN, length: 45 });
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBe(45);
      expect(node._layoutNode.getComputedHeight()).toBe(1);
      update({ thickness: 0, length: 45 });
      app.host.doLayout();
      expect(node._layoutNode.getComputedHeight()).toBe(0);
    } finally {
      app.dispose();
    }
  });

  it('measures Badge content, updates typography/density and fits a narrow container', () => {
    let node!: PNode;
    let setLabel!: (value: string | number) => void;
    let setOptions!: (value: UIProviderProps) => void;
    let setNarrow!: (value: boolean) => void;
    const app = fixture(() => {
      const [label, update] = createState<string | number>('AB');
      const [options, changeOptions] = createState<UIProviderProps>({});
      const [narrow, changeNarrow] = createState(false);
      setLabel = update;
      setOptions = changeOptions;
      setNarrow = changeNarrow;
      return UIProvider({
        get density() {
          return options().density;
        },
        get fontScale() {
          return options().fontScale;
        },
        get colorMode() {
          return options().colorMode;
        },
        reducedMotion: false,
        children: () =>
          View({
            style: { width: 100 },
            children: Badge({
              ref: (value) => {
                node = value;
              },
              tone: 'primary',
              get children() {
                return label();
              },
              get style() {
                return narrow() ? { maxWidth: 40 } : undefined;
              },
            }),
          }),
      });
    });
    try {
      app.host.doLayout();
      const initialWidth = node._layoutNode.getComputedWidth();
      expect(initialWidth).toBeGreaterThan(16);
      const text = node._children[0];
      expect(text._layoutNode.getComputedLeft()).toBe(8);
      expect(text._layoutNode.getComputedTop()).toBe(4);
      expect(initialWidth).toBe(text._layoutNode.getComputedWidth() + 16);
      expect(node._layoutNode.getComputedHeight()).toBe(24);
      setLabel('ABCDEFGHIJ');
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBeGreaterThan(initialWidth);
      setOptions({ density: 'compact', fontScale: 2, colorMode: 'dark' });
      app.host.doLayout();
      expect(node._layoutNode.getComputedHeight()).toBe(36);
      expect(node._layoutStyle.backgroundColor).toBe('#93c5fd');
      expect(text._layoutNode.getComputedLeft()).toBe(4);
      expect(text._layoutNode.getComputedTop()).toBe(2);
      expect(node._layoutNode.getComputedWidth()).toBeLessThanOrEqual(100);
      setNarrow(true);
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBeLessThanOrEqual(40);
      expect(text._layoutNode.getComputedWidth()).toBeLessThanOrEqual(32);
      expect(
        text._layoutNode.getComputedLeft() +
          text._layoutNode.getComputedWidth(),
      ).toBeLessThanOrEqual(node._layoutNode.getComputedWidth() - 4);
      setLabel(0);
      app.host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBeGreaterThan(8);
    } finally {
      app.dispose();
    }
    expect(node.isDestroyed).toBe(true);
  });
});
