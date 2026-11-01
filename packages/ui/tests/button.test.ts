import 'pixi.js/events';
import {
  createState,
  onError,
  type PNode,
  PRoot,
  render,
  root,
  type Text,
  View,
} from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
  Ticker,
} from 'pixi.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  Button,
  type ButtonProps,
  Icon,
  IconButton,
  UIProvider,
  type UIProviderProps,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      font: '14px Arial',
      setTransform() {},
      clearRect() {},
      fillText() {},
      fillRect() {},
      measureText(text: string) {
        const size = Number.parseFloat(
          this.font.match(/([\d.]+)px/)?.[1] ?? '14',
        );
        const width = [...text].reduce(
          (total, character) =>
            total +
            (character === 'M' ? 0.9 : character === 'i' ? 0.2 : 0.5) * size,
          0,
        );
        return {
          width,
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
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

function pointer(patch: Partial<FederatedPointerEvent> = {}) {
  const event = new FederatedPointerEvent(new EventBoundary());
  Object.assign(
    event,
    {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    },
    patch,
  );
  return event;
}

function key(
  element: HTMLElement,
  type: 'keydown' | 'keyup',
  value: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}

function setup(
  create: () => ReturnType<typeof Button>,
  options: UIProviderProps = {},
) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 200 });
  let node!: PNode;
  const props = Object.create(options) as UIProviderProps;
  props.children = () => {
    node = create() as PNode;
    return View({
      style: { width: 400, alignItems: 'flex-start' },
      children: node,
    });
  };
  const dispose = render(() => UIProvider(props), host);
  for (const child of node._view.children) {
    if (child instanceof DOMContainer) dom.append(child.element);
  }
  host.doLayout();
  const element = dom.querySelector('button');
  if (!element) throw new Error('Button must expose one real semantic button');
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  return {
    node,
    element,
    host,
    dom,
    dispose,
    emit(
      name:
        | 'pointerenter'
        | 'pointerleave'
        | 'pointerdown'
        | 'pointerup'
        | 'pointertap'
        | 'pointercancel'
        | 'pointerupoutside',
      patch: Partial<FederatedPointerEvent> = {},
    ) {
      node._view.emit(name, pointer(patch));
    },
  };
}

function icon(context: Parameters<NonNullable<ButtonProps['icon']>>[0]) {
  return Icon({
    get size() {
      return context.size();
    },
    get color() {
      return context.color();
    },
    draw(graphics, width, height, color) {
      graphics.rect(0, 0, width, height).fill(color);
    },
  });
}

function clock() {
  const callbacks = new Set<(ticker: Ticker) => void>();
  vi.spyOn(Ticker.prototype, 'add').mockImplementation(function (
    this: Ticker,
    callback,
    context,
  ) {
    if (!(context instanceof PRoot))
      callbacks.add(callback as (ticker: Ticker) => void);
    return this;
  });
  vi.spyOn(Ticker.prototype, 'remove').mockImplementation(function (
    this: Ticker,
    callback,
  ) {
    callbacks.delete(callback as (ticker: Ticker) => void);
    return this;
  });
  return callbacks;
}

function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}

type TextNode = ReturnType<ReturnType<typeof Text>>;
function textNodes(node: PNode) {
  return descendants(node).filter(
    (child): child is TextNode => '_textLayoutStyle' in child,
  );
}

describe('published Button activation', () => {
  it('rejects missing providers and empty semantic names before registering a control', () => {
    expect(() => Button({ children: 'Save' })).toThrow('UIProvider');
    const stop = root((dispose) => {
      UIProvider({
        children: () => {
          expect(() => Button({ children: 'Save', name: ' ' })).toThrow(
            'non-empty',
          );
          expect(() => IconButton({ name: '', icon })).toThrow('non-empty');
          expect(() => Button({ children: '' })).toThrow('non-empty');
          return undefined;
        },
      });
      return dispose;
    });
    cleanups.push(stop);
  });

  it.each(['mouse', 'touch'] as const)(
    'activates exactly once for a %s gesture without tap/click duplication',
    (pointerType) => {
      const onPress = vi.fn();
      const { node, element, emit } = setup(() =>
        Button({ children: 'Save', onPress }),
      );
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('aria-label')).toBe('Save');
      emit('pointerdown', { pointerType });
      emit('pointerup', { pointerType });
      emit('pointertap', { pointerType });
      emit('pointerup', { pointerType });
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress.mock.calls[0][0]).toBeInstanceOf(FederatedPointerEvent);
      expect(onPress.mock.calls[0][1]).toBe(node);
      // Pointer tap never goes through a separate component click binding.
      expect(node._view.listenerCount('click')).toBe(0);
      expect(node._view.listenerCount('pointertap')).toBe(0);
    },
  );

  it('composes Enter, Space and AT click activation once and ignores repeated/composing keys', () => {
    const onPress = vi.fn();
    const { element, node } = setup(() =>
      Button({ children: 'Save', onPress }),
    );
    element.focus();
    expect(key(element, 'keydown', 'Enter').defaultPrevented).toBe(true);
    key(element, 'keydown', 'Enter', { repeat: true });
    key(element, 'keyup', 'Enter');
    expect(onPress).toHaveBeenCalledTimes(1);
    key(element, 'keydown', ' ');
    expect(onPress).toHaveBeenCalledTimes(1);
    key(element, 'keyup', ' ');
    key(element, 'keyup', ' ');
    expect(onPress).toHaveBeenCalledTimes(2);
    key(element, 'keydown', 'Enter', { isComposing: true });
    key(element, 'keyup', 'Enter', { isComposing: true });
    expect(onPress).toHaveBeenCalledTimes(2);
    element.click();
    expect(onPress).toHaveBeenCalledTimes(3);
    expect(
      onPress.mock.calls.every(
        ([event, target]) => event instanceof MouseEvent && target === node,
      ),
    ).toBe(true);
  });

  it.each(['pointercancel', 'pointerupoutside', 'pointerleave'] as const)(
    'cancels %s rather than activating on a later release',
    (cancel) => {
      const onPress = vi.fn();
      const { emit } = setup(() => Button({ children: 'Save', onPress }));
      emit('pointerdown');
      emit(cancel);
      emit('pointerup');
      emit('pointertap');
      expect(onPress).not.toHaveBeenCalled();
      emit('pointerenter');
      emit('pointerdown');
      emit('pointerup');
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it('cancels pending pointer and keyboard activation on live disabled/loading changes and calls the latest callback', () => {
    const [disabled, setDisabled] = createState(false);
    const [loading, setLoading] = createState(false);
    const [latest, setLatest] = createState(false);
    const first = vi.fn();
    const second = vi.fn();
    const { node, element, dom, emit } = setup(() =>
      Button({
        children: 'Save',
        get disabled() {
          return disabled();
        },
        get loading() {
          return loading();
        },
        get onPress() {
          return latest() ? second : first;
        },
      }),
    );
    const pointerListener = node._view.listeners('pointerup')[0];
    emit('pointerdown');
    setDisabled(true);
    expect(element.disabled).toBe(true);
    emit('pointerup');
    element.click();
    expect(first).not.toHaveBeenCalled();
    setDisabled(false);
    element.focus();
    key(element, 'keydown', ' ');
    setLoading(true);
    key(element, 'keyup', ' ');
    emit('pointerdown');
    emit('pointerup');
    expect(element.getAttribute('aria-busy')).toBe('true');
    expect(element.disabled).toBe(true);
    expect(first).not.toHaveBeenCalled();
    setLoading(false);
    setLatest(true);
    emit('pointerdown');
    emit('pointerup');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(node._view.listeners('pointerup')[0]).toBe(pointerListener);
    expect(dom.querySelector('button')).toBe(element);
    expect(dom.querySelectorAll('button')).toHaveLength(1);
    expect(element.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('published IconButton', () => {
  it('requires an explicit name, composes the icon and exposes a single semantic button', () => {
    const onPress = vi.fn();
    const { element, node, emit } = setup(() =>
      IconButton({ name: 'Close', icon, onPress }),
    );
    expect(element.getAttribute('aria-label')).toBe('Close');
    expect(element.tabIndex).toBe(0);
    expect(node._layoutNode.getComputedWidth()).toBe(
      node._layoutNode.getComputedHeight(),
    );
    emit('pointerdown');
    emit('pointerup');
    expect(onPress).toHaveBeenCalledTimes(1);
    element.focus();
    key(element, 'keydown', 'Enter');
    key(element, 'keyup', 'Enter');
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});

describe('button appearance and layout', () => {
  it('anchors its decoration and loading overlay to the button rather than its wider parent', () => {
    const { node } = setup(
      () =>
        Button({
          children: 'Save',
          loading: true,
          style: { width: 100, height: 60, marginLeft: 20, marginTop: 20 },
        }),
      { reducedMotion: true },
    );
    const [ring, overlay, , loading] = node._children;
    const geometry = (child: PNode) => ({
      x: child._layoutNode.getComputedLeft(),
      y: child._layoutNode.getComputedTop(),
      width: child._layoutNode.getComputedWidth(),
      height: child._layoutNode.getComputedHeight(),
    });
    expect(geometry(node)).toEqual({ x: 20, y: 20, width: 100, height: 60 });
    expect(geometry(ring)).toEqual({ x: -3, y: -3, width: 106, height: 66 });
    expect(geometry(overlay)).toEqual({ x: 1, y: 1, width: 98, height: 58 });
    expect(geometry(loading)).toEqual({ x: 1, y: 1, width: 98, height: 58 });
    const spinner = loading._children[0];
    const center = spinner._view.toGlobal({
      x: spinner._layoutNode.getComputedWidth() / 2,
      y: spinner._layoutNode.getComputedHeight() / 2,
    });
    const buttonCenter = node._view.toGlobal({ x: 50, y: 30 });
    expect(center.x).toBe(buttonCenter.x);
    expect(center.y).toBe(buttonCenter.y);
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'keeps the %s hit region inside the button with its focus ring hidden or visible',
    (variant) => {
      const { node, element, host } = setup(() =>
        Button({
          children: 'Save',
          variant,
          style: { width: 120, height: 48, marginLeft: 20, marginTop: 20 },
        }),
      );
      host._view.eventMode = 'passive';
      const boundary = new EventBoundary(host._view);
      const origin = node._view.toGlobal({ x: 0, y: 0 });
      const width = node._layoutNode.getComputedWidth();
      const height = node._layoutNode.getComputedHeight();
      const assertHitRegion = () => {
        // The renderer normally publishes these matrices before event dispatch.
        // This headless fixture uses the same actual scene transforms directly.
        const syncTransforms = (container: Container) => {
          container.getGlobalTransform(container.worldTransform);
          for (const child of container.children) syncTransforms(child);
        };
        syncTransforms(host._view);
        expect(
          boundary.hitTest(origin.x + width / 2, origin.y + height / 2),
        ).toBe(node._view);
        for (const distance of [2, 3]) {
          for (const [x, y] of [
            [origin.x - distance, origin.y + height / 2],
            [origin.x + width + distance, origin.y + height / 2],
            [origin.x + width / 2, origin.y - distance],
            [origin.x + width / 2, origin.y + height + distance],
          ])
            expect(
              boundary.hitTest(x, y) === null,
              `outside (${x}, ${y})`,
            ).toBe(true);
        }
      };
      expect(node._children[0]._layoutStyle.opacity).toBe(0);
      assertHitRegion();
      const matches = element.matches.bind(element);
      vi.spyOn(element, 'matches').mockImplementation((selector) =>
        selector === ':focus-visible' ? true : matches(selector),
      );
      element.focus();
      host.doLayout();
      expect(node._children[0]._layoutStyle.opacity).toBe(1);
      assertHitRegion();
    },
  );

  it('renders independent hover, pressed, disabled and focus-visible feedback', () => {
    const [disabled, setDisabled] = createState(false);
    const { node, element, emit } = setup(() =>
      Button({
        children: 'Save',
        get disabled() {
          return disabled();
        },
      }),
    );
    const [ring, overlay] = node._children;
    expect(overlay._layoutStyle.opacity).toBe(0);
    emit('pointerenter');
    expect(overlay._layoutStyle.opacity).toBe(0.08);
    emit('pointerdown');
    expect(overlay._layoutStyle.opacity).toBe(0.16);
    emit('pointerleave');
    expect(overlay._layoutStyle.opacity).toBe(0);
    emit('pointercancel');
    // Happy DOM cannot resolve the browser's modality-based pseudo-class.
    // Supply its answer while exercising the actual focus and visual wiring.
    const matches = element.matches.bind(element);
    let keyboard = true;
    vi.spyOn(element, 'matches').mockImplementation((selector) =>
      selector === ':focus-visible' ? keyboard : matches(selector),
    );
    element.blur();
    element.focus();
    expect(ring._layoutStyle.opacity).toBe(1);
    key(element, 'keydown', ' ');
    expect(overlay._layoutStyle.opacity).toBe(0.16);
    key(element, 'keyup', ' ');
    expect(overlay._layoutStyle.opacity).toBe(0);
    element.blur();
    keyboard = false;
    element.focus();
    expect(ring._layoutStyle.opacity).toBe(0);
    setDisabled(true);
    expect(node._layoutStyle.opacity).toBe(0.5);
    expect(overlay._layoutStyle.opacity).toBe(0);
    expect(ring._layoutStyle.opacity).toBe(0);
  });

  it('measures actual text widths, updates the semantic label and preserves loading geometry', () => {
    const [label, setLabel] = createState('iiii');
    const [loading, setLoading] = createState(false);
    const { node, element, host } = setup(
      () =>
        Button({
          get children() {
            return label();
          },
          get loading() {
            return loading();
          },
        }),
      { reducedMotion: true },
    );
    const narrow = node._layoutNode.getComputedWidth();
    setLabel('MMMM');
    host.doLayout();
    const wide = node._layoutNode.getComputedWidth();
    expect(wide).toBeGreaterThan(narrow);
    expect(element.getAttribute('aria-label')).toBe('MMMM');
    const height = node._layoutNode.getComputedHeight();
    const content = node._children[2];
    setLoading(true);
    host.doLayout();
    expect(node._layoutNode.getComputedWidth()).toBe(wide);
    expect(node._layoutNode.getComputedHeight()).toBe(height);
    expect(content._layoutStyle.opacity).toBe(0);
    expect(element.getAttribute('aria-label')).toBe('MMMM');
    setLoading(false);
    host.doLayout();
    expect(content._layoutStyle.opacity).toBe(1);
    expect(node._layoutNode.getComputedWidth()).toBe(wide);
  });

  it('keeps theme, density, size, icon context and text overrides reactive on the retained button', () => {
    const [dark, setDark] = createState(false);
    const [compact, setCompact] = createState(false);
    const [scale, setScale] = createState(1);
    const [size, setSize] = createState<ButtonProps['size']>('md');
    const [override, setOverride] = createState(false);
    const draw = vi.fn();
    let iconCreations = 0;
    const { node, element, host, dom } = setup(
      () =>
        Button({
          children: 'Save',
          get size() {
            return size();
          },
          get style() {
            return override()
              ? { width: 180, backgroundColor: '#ff00ff' }
              : undefined;
          },
          get textStyle() {
            return override()
              ? { color: '#00ff00', fontSize: 30, lineHeight: 44 }
              : undefined;
          },
          icon(context) {
            iconCreations++;
            return Icon({
              get size() {
                return context.size();
              },
              get color() {
                return context.color();
              },
              draw,
            });
          },
        }),
      {
        reducedMotion: true,
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        get density() {
          return compact() ? 'compact' : 'comfortable';
        },
        get fontScale() {
          return scale();
        },
      },
    );
    expect(node._layoutStyle.backgroundColor).toBe('#1d4ed8');
    expect(node._layoutNode.getComputedHeight()).toBe(40);
    expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(14);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), 20, 20, '#ffffff');
    setDark(true);
    setCompact(true);
    host.doLayout();
    expect(node._layoutStyle.backgroundColor).toBe('#93c5fd');
    expect(node._layoutNode.getComputedHeight()).toBe(36);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), 20, 20, '#0f172a');
    setScale(2);
    setSize('sm');
    host.doLayout();
    expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(24);
    expect(textNodes(node)[0]._textLayoutStyle.lineHeight).toBe(32);
    expect(node._layoutNode.getComputedHeight()).toBeGreaterThanOrEqual(38);
    expect(draw).toHaveBeenLastCalledWith(expect.anything(), 32, 32, '#0f172a');
    setOverride(true);
    host.doLayout();
    expect(node._layoutNode.getComputedWidth()).toBe(180);
    expect(node._layoutStyle.backgroundColor).toBe('#ff00ff');
    expect(textNodes(node)[0]._textLayoutStyle.color).toBe('#00ff00');
    expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(30);
    expect(node._layoutNode.getComputedHeight()).toBeGreaterThanOrEqual(50);
    expect(iconCreations).toBe(1);
    expect(dom.querySelector('button')).toBe(element);
  });

  it('preserves caller custom content and uses its required explicit name', () => {
    let custom!: PNode;
    const { node, element } = setup(() => {
      custom = View({
        style: { width: 90, height: 50, backgroundColor: '#00ff00' },
      }) as PNode;
      return Button({
        name: 'Open color picker',
        children: custom,
        textStyle: { color: '#ff0000' },
      });
    });
    expect(element.getAttribute('aria-label')).toBe('Open color picker');
    expect(descendants(node)).toContain(custom);
    expect(custom._layoutStyle.backgroundColor).toBe('#00ff00');
    expect(custom._layoutNode.getComputedWidth()).toBe(90);
    expect(custom._layoutNode.getComputedHeight()).toBe(50);
    expect(node._layoutNode.getComputedHeight()).toBeGreaterThanOrEqual(60);
    expect(textNodes(node)).toHaveLength(0);
  });

  it('accepts reactive text/custom content transitions without reusing destroyed text nodes', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const [customMode, setCustomMode] = createState(false);
    let custom!: PNode;
    const { node, element, host } = setup(() => {
      custom = View({ style: { width: 40, height: 30 } }) as PNode;
      return Button({
        name: 'Save changes',
        get children() {
          return customMode() ? custom : 'Save';
        },
      });
    });
    const firstText = textNodes(node)[0];
    expect(firstText).toBeDefined();
    setCustomMode(true);
    host.doLayout();
    expect(descendants(node)).toContain(custom);
    expect(firstText.isDestroyed).toBe(true);
    setCustomMode(false);
    host.doLayout();
    expect(textNodes(node)).toHaveLength(1);
    expect(textNodes(node)[0].isDestroyed).toBe(false);
    expect(textNodes(node)[0]).not.toBe(firstText);
    expect(element.getAttribute('aria-label')).toBe('Save changes');
    expect(errors).not.toHaveBeenCalled();
  });

  it('keeps measured text and its icon inside an explicitly narrow button', () => {
    const { node } = setup(() =>
      Button({
        children: 'Save all pending changes',
        icon,
        style: { width: 110 },
      }),
    );
    const content = node._children[2];
    const availableWidth = 110 - 12 * 2 - 2;
    expect(node._layoutNode.getComputedWidth()).toBe(110);
    expect(content._layoutNode.getComputedWidth()).toBeLessThanOrEqual(
      availableWidth,
    );
    const text = textNodes(node)[0];
    expect(text._layoutNode.getComputedWidth()).toBeLessThanOrEqual(
      availableWidth - 20 - 8,
    );
    expect(text._layoutNode.getComputedHeight()).toBeLessThanOrEqual(
      node._layoutNode.getComputedHeight() - 10,
    );
  });
});

describe('button resource lifecycle', () => {
  it('reports invalid names once to the owning error handler without a secondary setup failure', () => {
    const errors = vi.fn();
    const dispose = root((dispose) => {
      onError(errors);
      UIProvider({ children: () => Button({ children: '' }) });
      return dispose;
    });
    cleanups.push(dispose);
    expect(errors).toHaveBeenCalledOnce();
    expect(errors.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        message: 'Button requires a non-empty accessible name.',
      }),
    );
  });
  it('starts and stops exactly one loading clock across repeated toggles without changing semantic identity', async () => {
    const clocks = clock();
    const [loading, setLoading] = createState(false);
    const { node, element, dom, host } = setup(
      () =>
        Button({
          children: 'Save',
          icon,
          get loading() {
            return loading();
          },
        }),
      { reducedMotion: false },
    );
    const content = node._children[2];
    const listener = node._view.listeners('pointerup')[0];
    for (let cycle = 0; cycle < 4; cycle++) {
      setLoading(true);
      host.doLayout();
      await Promise.resolve();
      expect(clocks.size).toBe(1);
      setLoading(false);
      host.doLayout();
      await Promise.resolve();
      expect(clocks.size).toBe(0);
      expect(node._children[2]).toBe(content);
      expect(dom.querySelector('button')).toBe(element);
      expect(node._view.listeners('pointerup')[0]).toBe(listener);
    }
  });

  it.each(['owner', 'node'] as const)(
    'releases semantic DOM, gestures and spinner clocks on %s disposal',
    async (method) => {
      const clocks = clock();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const remove = vi.spyOn(window, 'removeEventListener');
      const add = vi.spyOn(window, 'addEventListener');
      const [loading, setLoading] = createState(false);
      const [label, setLabel] = createState('Save');
      const [large, setLarge] = createState(false);
      const onPress = vi.fn();
      const { node, element, emit, dispose, host } = setup(
        () =>
          Button({
            get children() {
              return label();
            },
            get loading() {
              return loading();
            },
            get size() {
              return large() ? 'lg' : 'md';
            },
            onPress,
            icon,
          }),
        {
          reducedMotion: false,
          get colorMode() {
            return large() ? 'dark' : 'light';
          },
        },
      );
      const guardStart = add.mock.calls.length;
      emit('pointerdown');
      const guards = add.mock.calls
        .slice(guardStart)
        .filter(([name]) =>
          ['pointercancel', 'pointerup', 'pointermove', 'blur'].includes(name),
        );
      expect(guards).toHaveLength(4);
      setLoading(true);
      host.doLayout();
      await Promise.resolve();
      expect(clocks.size).toBe(1);
      const children = descendants(node).slice(1);
      if (method === 'owner') dispose();
      else node.destroyRecursive();
      expect(clocks.size).toBe(0);
      expect(element.isConnected).toBe(false);
      expect(node._view.listenerCount('pointerdown')).toBe(0);
      expect(node._view.listenerCount('pointerup')).toBe(0);
      for (const guard of guards) expect(remove).toHaveBeenCalledWith(...guard);
      expect(() => {
        setLarge(true);
        setLabel('Export');
        setLoading(false);
        setLoading(true);
        host.doLayout();
      }).not.toThrow();
      expect(clocks.size).toBe(0);
      expect(errors).not.toHaveBeenCalled();
      expect(onPress).not.toHaveBeenCalled();
      if (method === 'node')
        expect(children.every((child) => child.isDestroyed)).toBe(true);
    },
  );
});
