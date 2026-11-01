import {
  createEffect,
  createState,
  type PNode,
  PRoot,
  render,
  View,
} from '@piant/core';
import { Container, DOMContainer, Graphics, Ticker } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Icon,
  ProgressBar,
  type ProgressBarProps,
  Spinner,
  UIProvider,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

function scene(component: () => unknown) {
  const host = new PRoot(new Container(), { width: 240, height: 180 });
  const dispose = render(component, host);
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
  });
  host.doLayout();
  return { host, dispose };
}

function semantics(node: PNode, role: string) {
  for (const child of node._view.children) {
    if (child instanceof DOMContainer) {
      const element = child.element.querySelector(`[role="${role}"]`);
      if (element instanceof HTMLElement) return element;
    }
  }
  return undefined;
}

function fillShapes(node: ReturnType<typeof ProgressBar>) {
  return node._graphic.context.instructions.flatMap((instruction) => {
    if (instruction.action !== 'fill') return [];
    return instruction.data.path.shapePath.shapePrimitives.map(({ shape }) => {
      if (!('width' in shape) || !('height' in shape))
        throw new Error('Expected a filled rectangular progress region');
      return { x: shape.x, width: shape.width, height: shape.height };
    });
  });
}

function clock() {
  const callbacks = new Set<(ticker: Ticker) => void>();
  vi.spyOn(Ticker.prototype, 'add').mockImplementation(function (
    this: Ticker,
    fn,
    context,
  ) {
    if (!(context instanceof PRoot))
      callbacks.add(fn as (ticker: Ticker) => void);
    return this;
  });
  vi.spyOn(Ticker.prototype, 'remove').mockImplementation(function (
    this: Ticker,
    fn,
  ) {
    callbacks.delete(fn as (ticker: Ticker) => void);
    return this;
  });
  return {
    callbacks,
    advance(deltaMS: number) {
      for (const callback of [...callbacks]) callback({ deltaMS } as Ticker);
    },
  };
}

describe('published Icon', () => {
  it('redraws against the actual layout box and live theme without replacing its node', () => {
    const [large, setLarge] = createState(false);
    const [color, setColor] = createState<string>();
    const draw = vi.fn(
      (graphics: Graphics, width: number, height: number, tint: string) => {
        graphics
          .moveTo(width / 2, 0)
          .lineTo(width, height)
          .lineTo(0, height)
          .closePath()
          .fill(tint);
      },
    );
    let node!: ReturnType<typeof Icon>;
    const { host, dispose } = scene(() =>
      UIProvider({
        get colorMode() {
          return large() ? 'dark' : 'light';
        },
        children: () => {
          node = Icon({
            draw,
            src: undefined,
            label: 'Triangle',
            get size() {
              return large() ? 48 : 24;
            },
            get color() {
              return color();
            },
            get style() {
              return { height: large() ? 32 : 16 };
            },
          });
          return node;
        },
      }),
    );
    expect(draw).toHaveBeenLastCalledWith(
      expect.any(Graphics),
      24,
      16,
      '#0f172a',
    );
    expect(semantics(node, 'img')?.getAttribute('aria-label')).toBe('Triangle');
    expect(semantics(node, 'img')?.tabIndex).toBe(-1);
    const original = node;
    setLarge(true);
    host.doLayout();
    expect(node).toBe(original);
    expect(draw).toHaveBeenLastCalledWith(
      expect.any(Graphics),
      48,
      32,
      '#f8fafc',
    );
    setColor('#ff0000');
    expect(draw).toHaveBeenLastCalledWith(
      expect.any(Graphics),
      48,
      32,
      '#ff0000',
    );
    dispose();
    const count = draw.mock.calls.length;
    setLarge(false);
    setColor('#00ff00');
    expect(draw).toHaveBeenCalledTimes(count);
  });

  it('contains offset non-square caller assets and preserves their ownership across updates and disposal', () => {
    const first = new Graphics().rect(-10, 5, 40, 20).fill('#ff0000');
    const next = new Graphics().rect(10, -20, 20, 40).fill('#00ff00');
    const [source, setSource] = createState(first);
    let node!: ReturnType<typeof Icon>;
    const { host, dispose } = scene(() => {
      node = Icon({
        get src() {
          return source();
        },
        size: 40,
      });
      return node;
    });
    expect(first.scale.x).toBe(1);
    expect(first.scale.y).toBe(1);
    expect(first.x).toBe(10);
    expect(first.y).toBe(5);
    setSource(next);
    host.doLayout();
    expect(first.parent).toBeNull();
    expect(first.destroyed).toBe(false);
    expect(next.scale.x).toBe(1);
    expect(next.scale.y).toBe(1);
    expect(next.x).toBe(0);
    expect(next.y).toBe(20);
    dispose();
    node.destroyRecursive();
    expect(next.destroyed).toBe(false);
    expect(next.parent === null).toBe(true);
    first.destroy();
    next.destroy();
  });
});

describe('published ProgressBar', () => {
  it.each([
    [{ value: -10 }, 0, '0', '0', '100'],
    [{ value: 120 }, 240, '100', '0', '100'],
    [{ min: 10, max: 30, value: 15 }, 60, '15', '10', '30'],
    [{ min: 30, max: 10, value: 15 }, 0, '0', '0', '100'],
    [{ min: 10, max: 10, value: 15 }, 0, '0', '0', '100'],
    [{ min: Number.NaN, max: Infinity, value: 50 }, 120, '50', '0', '100'],
    [{ min: 10, max: 30, value: Number.NaN }, 0, '10', '10', '30'],
    [{ min: -100, max: 100 }, 120, '0', '-100', '100'],
    [
      { min: -Number.MAX_VALUE, max: Number.MAX_VALUE, value: 0 },
      120,
      '0',
      String(-Number.MAX_VALUE),
      String(Number.MAX_VALUE),
    ],
    [
      {
        min: -Number.MAX_VALUE,
        max: Number.MAX_VALUE,
        value: Number.MAX_VALUE,
      },
      240,
      String(Number.MAX_VALUE),
      String(-Number.MAX_VALUE),
      String(Number.MAX_VALUE),
    ],
  ] as const)(
    'renders finite bounded geometry and truthful range semantics for %o',
    (props, width, now, min, max) => {
      let node!: ReturnType<typeof ProgressBar>;
      scene(() => {
        node = ProgressBar({ ...props, label: 'Download' });
        return node;
      });
      const shapes = fillShapes(node);
      expect(shapes[0]).toEqual({ x: 0, width: 240, height: 6 });
      expect(shapes[1]?.width ?? 0).toBe(width);
      const element = semantics(node, 'progressbar');
      expect(element?.getAttribute('aria-valuenow')).toBe(now);
      expect(element?.getAttribute('aria-valuemin')).toBe(min);
      expect(element?.getAttribute('aria-valuemax')).toBe(max);
      expect(element?.tabIndex).toBe(-1);
    },
  );

  it('updates range, thickness, styling and mode through getters, and disposes semantic proxies', () => {
    const [options, setOptions] = createState<ProgressBarProps>({ value: 20 });
    let node!: ReturnType<typeof ProgressBar>;
    const { host, dispose } = scene(() => {
      node = ProgressBar({
        get min() {
          return options().min;
        },
        get max() {
          return options().max;
        },
        get value() {
          return options().value;
        },
        get indeterminate() {
          return options().indeterminate;
        },
        get thickness() {
          return options().thickness;
        },
        get style() {
          return options().style;
        },
        label: 'Download',
      });
      return node;
    });
    const old = semantics(node, 'progressbar')!;
    expect(fillShapes(node)[1].width).toBe(48);
    setOptions({
      min: 20,
      max: 60,
      value: 40,
      thickness: 12,
      style: { width: 120 },
    });
    host.doLayout();
    expect(fillShapes(node)[1]).toEqual({ x: 0, width: 60, height: 12 });
    expect(semantics(node, 'progressbar')).toBe(old);
    expect(old.getAttribute('aria-valuenow')).toBe('40');
    setOptions({ indeterminate: true, style: { width: 120 } });
    host.doLayout();
    expect(semantics(node, 'progressbar')?.hasAttribute('aria-valuenow')).toBe(
      false,
    );
    expect(fillShapes(node)[1].width).toBe(40);
    const last = semantics(node, 'progressbar')!;
    dispose();
    expect(last.parentElement).toBeNull();
    setOptions({ value: 80 });
    expect(semantics(node, 'progressbar')).toBeUndefined();
  });
});

describe('status animation lifecycle', () => {
  it('ignores live prop and theme updates after node-only destruction while preserving caller assets', async () => {
    const time = clock();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const [dark, setDark] = createState(false);
    const [color, setColor] = createState<string>();
    const [value, setValue] = createState(25);
    const [size, setSize] = createState(24);
    const asset = new Graphics().rect(-10, 5, 40, 20).fill('#ff0000');
    cleanups.push(() => asset.destroy());
    const draw = vi.fn(
      (graphics: Graphics, width: number, height: number, tint: string) => {
        graphics.rect(0, 0, width, height).fill(tint);
      },
    );
    let icon!: ReturnType<typeof Icon>;
    let image!: ReturnType<typeof Icon>;
    let spinner!: ReturnType<typeof Spinner>;
    let progress!: ReturnType<typeof ProgressBar>;
    let ownerUpdates = 0;
    const { host } = scene(() =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        reducedMotion: false,
        children: () => {
          createEffect(() => {
            void size();
            ownerUpdates++;
          });
          icon = Icon({
            draw,
            label: 'Drawing',
            get color() {
              return color();
            },
            get size() {
              return size();
            },
          });
          image = Icon({ src: asset });
          spinner = Spinner({
            label: 'Loading',
            get color() {
              return color();
            },
            get size() {
              return size();
            },
          });
          progress = ProgressBar({
            label: 'Download',
            get value() {
              return value();
            },
            get thickness() {
              return size() / 4;
            },
          });
          return View({ children: [icon, image, spinner, progress] });
        },
      }),
    );
    await Promise.resolve();
    expect(time.callbacks.size).toBe(1);
    expect(draw).toHaveBeenCalled();
    for (const node of [icon, image, spinner, progress])
      node.destroyRecursive();
    const drawings = draw.mock.calls.length;
    const previousOwnerUpdates = ownerUpdates;
    expect(time.callbacks.size).toBe(0);
    expect(() => {
      setDark(true);
      setColor('#00ff00');
      setValue(80);
      setSize(48);
      host.doLayout();
      time.advance(320);
    }).not.toThrow();
    expect(ownerUpdates).toBeGreaterThan(previousOwnerUpdates);
    expect(draw).toHaveBeenCalledTimes(drawings);
    expect(errors).not.toHaveBeenCalled();
    expect(time.callbacks.size).toBe(0);
    expect(asset.destroyed).toBe(false);
    expect(asset.parent === null).toBe(true);
    expect(() => asset.clear().circle(0, 0, 8).fill('#00ff00')).not.toThrow();
    expect(asset.bounds.width).toBe(16);
    expect(semantics(icon, 'img')).toBeUndefined();
    expect(semantics(spinner, 'status')).toBeUndefined();
    expect(semantics(progress, 'progressbar')).toBeUndefined();
  });

  it('uses one clock per visible animated node, pauses on mode/reduced-motion/ancestor hiding, and restarts without duplicates', async () => {
    const time = clock();
    const [reduced, setReduced] = createState(false);
    const [hidden, setHidden] = createState(false);
    const [indeterminate, setIndeterminate] = createState(true);
    const [active, setActive] = createState(true);
    let spinner!: ReturnType<typeof Spinner>;
    let progress!: ReturnType<typeof ProgressBar>;
    const { host, dispose } = scene(() =>
      UIProvider({
        get reducedMotion() {
          return reduced();
        },
        children: () => {
          spinner = Spinner({
            get active() {
              return active();
            },
            label: 'Loading',
          });
          progress = ProgressBar({
            get indeterminate() {
              return indeterminate();
            },
            label: 'Download',
          });
          return View({
            get style() {
              return {
                width: 240,
                display: hidden() ? ('none' as const) : ('flex' as const),
              };
            },
            children: [spinner, progress],
          });
        },
      }),
    );
    await Promise.resolve();
    expect(time.callbacks.size).toBe(2);
    expect(semantics(spinner, 'status')?.tabIndex).toBe(-1);
    time.advance(320);
    expect(fillShapes(progress)[1].x).toBeGreaterThan(0);
    setIndeterminate(false);
    expect(time.callbacks.size).toBe(1);
    setIndeterminate(true);
    expect(time.callbacks.size).toBe(2);
    setActive(false);
    expect(time.callbacks.size).toBe(1);
    setActive(true);
    expect(time.callbacks.size).toBe(2);
    setReduced(true);
    expect(time.callbacks.size).toBe(0);
    expect(fillShapes(progress)[1]).toEqual({ x: 0, width: 80, height: 6 });
    setReduced(false);
    expect(time.callbacks.size).toBe(2);
    setHidden(true);
    host.doLayout();
    await Promise.resolve();
    expect(time.callbacks.size).toBe(0);
    setHidden(false);
    host.doLayout();
    await Promise.resolve();
    expect(time.callbacks.size).toBe(2);
    spinner.destroyRecursive();
    expect(time.callbacks.size).toBe(1);
    dispose();
    expect(time.callbacks.size).toBe(0);
    setReduced(true);
    setReduced(false);
    setIndeterminate(false);
    setIndeterminate(true);
    expect(time.callbacks.size).toBe(0);
  });

  it('keeps static indicators timer-free and scales spinner geometry with the live typography and rectangular override', () => {
    const time = clock();
    const [large, setLarge] = createState(false);
    const [thickness, setThickness] = createState(2);
    let spinner!: ReturnType<typeof Spinner>;
    const { host } = scene(() =>
      UIProvider({
        reducedMotion: true,
        get fontScale() {
          return large() ? 2 : 1;
        },
        children: () => {
          spinner = Spinner({
            get thickness() {
              return thickness();
            },
            get style() {
              return large() ? { width: 60 } : undefined;
            },
          });
          return View({ children: [spinner, ProgressBar({ value: 25 })] });
        },
      }),
    );
    expect(time.callbacks.size).toBe(0);
    expect(spinner._layoutNode.getComputedWidth()).toBe(20);
    expect(spinner._layoutNode.getComputedHeight()).toBe(20);
    setLarge(true);
    host.doLayout();
    expect(spinner._layoutNode.getComputedWidth()).toBe(60);
    expect(spinner._layoutNode.getComputedHeight()).toBe(40);
    expect(spinner._graphic.bounds.width).toBeLessThanOrEqual(40.1);
    expect(spinner._graphic.bounds.height).toBeLessThanOrEqual(40.1);
    setThickness(-2);
    expect(spinner._graphic.context.instructions).toHaveLength(0);
    expect(time.callbacks.size).toBe(0);
  });
});
