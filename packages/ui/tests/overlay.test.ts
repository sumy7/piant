import {
  createEffect,
  createState,
  getOwner,
  mergeProps,
  onCleanup,
  type PNode,
  PRoot,
  render,
  root,
  View,
} from '@piant/core';
import { Container, DOMContainer, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFocusable,
  createOverlay,
  type FocusableState,
  OverlayHost,
  type OverlayOptions,
  type OverlayState,
  Tabs,
  UIProvider,
  useUITheme,
} from '../dist/index.js';

const mounts = vi.hoisted(() => ({
  pending: false,
  finish: [] as (() => void)[],
  destroyed: [] as ReturnType<typeof vi.fn>[],
  renders: [] as ReturnType<typeof vi.fn>[],
  rendersAfterDestroy: 0,
  target: undefined as HTMLElement | undefined,
  fail: undefined as unknown,
}));
vi.mock('@piant/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@piant/core')>();
  const pixi = await import('pixi.js');
  return {
    ...core,
    mount: vi.fn(async (component, target, options) => {
      if (mounts.pending)
        await new Promise<void>((resolve) => mounts.finish.push(resolve));
      options.signal.throwIfAborted();
      if (mounts.fail) throw mounts.fail;
      const scene = new core.PRoot(new pixi.Container(), {
        width: 300,
        height: 200,
      });
      mounts.target = target;
      let stop: () => void;
      try {
        stop = core.render(component, scene);
      } finally {
        mounts.target = undefined;
      }
      scene.doLayout();
      const destroy = vi.fn(() => {
        try {
          stop();
        } finally {
          scene.destroyRecursive();
        }
      });
      mounts.destroyed.push(destroy);
      const render = vi.fn(() => {
        if (destroy.mock.calls.length) mounts.rendersAfterDestroy++;
      });
      mounts.renders.push(render);
      return {
        root: scene,
        canvas: document.createElement('canvas'),
        app: { render },
        resize: (width: number, height: number) => {
          scene.setStyle({ width, height });
          scene.doLayout();
        },
        destroy,
      };
    }),
  };
});

const cleanup: (() => void)[] = [];
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  mounts.pending = false;
  mounts.finish = [];
  mounts.destroyed = [];
  mounts.renders = [];
  mounts.rendersAfterDestroy = 0;
  mounts.target = undefined;
  mounts.fail = undefined;
  frames = new Map();
  vi.spyOn(Ticker.shared, 'start').mockImplementation(() => {});
  let nextFrame = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value() {},
  });
});
afterEach(async () => {
  for (const stop of cleanup.splice(0).reverse()) stop();
  for (const finish of mounts.finish.splice(0)) finish();
  await settle();
  document.body.replaceChildren();
  delete (HTMLElement.prototype as unknown as { showPopover?: unknown })
    .showPopover;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}
function box(element: HTMLElement, x = 10, y = 10, width = 400, height = 300) {
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => ({
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON() {},
  }));
}
function setup(
  run: (
    add: (options: Partial<OverlayOptions>) => OverlayState,
    control: (name: string, order?: number) => FocusableState & { node: PNode },
  ) => void,
  x = 10,
) {
  const target = document.createElement('div');
  document.body.append(target);
  box(target, x);
  const scene = new PRoot(new Container(), { width: 400, height: 300 });
  const stop = root((dispose) => {
    UIProvider({
      colorMode: 'dark',
      reducedMotion: false,
      children: () =>
        OverlayHost({
          target,
          children: () => {
            const control = (name: string, order?: number) => {
              const node = View({ style: { width: 100, height: 30 } }) as PNode;
              const focus = createFocusable(node, { name, order });
              (mounts.target ?? target).append(focus.element.parentElement!);
              return { ...focus, node };
            };
            run(
              (options) =>
                createOverlay(
                  mergeProps(
                    { width: 180, height: 120, children: () => View({}) },
                    options,
                  ) as OverlayOptions,
                ),
              (name, order) => {
                const focus = control(name, order);
                if (!mounts.target) {
                  scene.appendChild(focus.node);
                  scene.doLayout();
                }
                return focus;
              },
            );
            return View({});
          },
        }),
    });
    return dispose;
  });
  cleanup.push(() => {
    stop();
    scene.destroyRecursive();
    target.remove();
  });
  return { target, stop };
}
function pointer(target: HTMLElement, options: PointerEventInit = {}) {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: 20,
    clientY: 20,
    button: 0,
    isPrimary: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}
function key(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

describe('instance-scoped overlays', () => {
  it('retains a surface when computed open dependencies change without changing its boolean value', async () => {
    const [metadata, setMetadata] = createState(0);
    const children = vi.fn(() => View({}));
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({
        get open() {
          return metadata() >= 0;
        },
        children,
      });
    });
    await settle();
    const element = overlay.element();
    setMetadata(1);
    await settle();
    expect(overlay.element()).toBe(element);
    expect(children).toHaveBeenCalledTimes(1);
    expect(mounts.destroyed[0]).not.toHaveBeenCalled();
    setMetadata(-1);
    expect(overlay.element()).toBeUndefined();
    expect(mounts.destroyed[0]).toHaveBeenCalledTimes(1);
  });

  it('observes document Escape for descriptive help without falling through its own modal', async () => {
    let modal!: OverlayState;
    let help!: OverlayState;
    let action!: FocusableState;
    const dismiss = vi.fn();
    setup((add, control) => {
      modal = add({
        modal: true,
        children: () => {
          const item = control('modal action');
          action = item;
          return item.node;
        },
      });
      help = add({
        autoFocus: false,
        restoreFocus: false,
        escapeScope: 'document',
        onDismiss: dismiss,
      });
    });
    modal.setOpen(true);
    await settle();
    help.setOpen(true);
    await settle();
    key(action.element, 'Escape');
    expect(help.open()).toBe(false);
    expect(modal.open()).toBe(true);
    expect(dismiss).toHaveBeenCalledTimes(1);
    key(action.element, 'Escape');
    expect(modal.open()).toBe(false);
  });

  it('observes a foreign instance Escape once without stealing its dismissal event', async () => {
    let left!: OverlayState;
    let help!: OverlayState;
    let action!: FocusableState;
    const dismiss = vi.fn();
    setup((add, control) => {
      left = add({
        modal: true,
        children: () => {
          const item = control('left action');
          action = item;
          return item.node;
        },
      });
    });
    setup((add) => {
      help = add({
        autoFocus: false,
        restoreFocus: false,
        escapeScope: 'document',
        open: true,
        onDismiss: dismiss,
      });
    }, 500);
    left.setOpen(true);
    await settle();
    key(action.element, 'Escape');
    expect(left.open()).toBe(false);
    expect(dismiss).toHaveBeenCalledTimes(1);
    // Controlled help rejects the close request, but does not re-request within one dispatch.
    expect(help.open()).toBe(true);
  });

  it('dismisses descriptive help with body focus without consuming unrelated page events', async () => {
    let help!: OverlayState;
    setup((add) => {
      help = add({
        autoFocus: false,
        restoreFocus: false,
        escapeScope: 'document',
      });
    });
    help.setOpen(true);
    await settle();
    expect(key(document.body, 'Escape').defaultPrevented).toBe(false);
    expect(help.open()).toBe(false);
  });

  it('does not restore nonmodal focus over the newly focused background control', async () => {
    let overlay!: OverlayState;
    let destination!: FocusableState;
    setup((add, control) => {
      control('trigger');
      destination = control('destination');
      overlay = add({
        autoFocus: true,
        dismissOnFocusOutside: true,
        children: () => control('content').node,
      });
    });
    overlay.setOpen(true);
    await settle();
    destination.focus();
    expect(overlay.open()).toBe(false);
    expect(document.activeElement).toBe(destination.element);
  });

  it('links nonmodal Tab exits to the trigger logical order exactly once on controlled refusal', async () => {
    let overlay!: OverlayState;
    let trigger!: FocusableState;
    let next!: FocusableState;
    let content!: FocusableState;
    const changes = vi.fn();
    setup((add, control) => {
      trigger = control('trigger');
      next = control('next');
      overlay = add({
        open: true,
        autoFocus: true,
        dismissOnFocusOutside: true,
        tabAnchor: trigger.element,
        onOpenChange: changes,
        children: () => {
          const item = control('content');
          content = item;
          return item.node;
        },
      });
    });
    await settle();
    key(content.element, 'Tab');
    expect(document.activeElement).toBe(next.element);
    expect(changes).toHaveBeenCalledExactlyOnceWith(false);
    expect(overlay.open()).toBe(true);
    content.focus();
    changes.mockClear();
    key(content.element, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(trigger.element);
    expect(changes).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('resolves initial focus once per opening without accepting a foreign target', async () => {
    let overlay!: OverlayState;
    let first!: FocusableState;
    let preferred!: FocusableState;
    let background!: FocusableState;
    const choose = vi.fn(() => preferred.element);
    setup((add, control) => {
      background = control('background');
      overlay = add({
        modal: true,
        initialFocus: choose,
        children: () => {
          const a = control('first');
          const b = control('preferred');
          first = a;
          preferred = b;
          return [a.node, b.node];
        },
      });
    });
    overlay.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(preferred.element);
    first.focus();
    overlay.updatePosition();
    expect(document.activeElement).toBe(first.element);
    expect(choose).toHaveBeenCalledTimes(1);
    overlay.setOpen(false);
    choose.mockImplementation(() => background.element);
    overlay.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(overlay.element());
    expect(choose).toHaveBeenCalledTimes(2);
  });

  it('keeps an unavailable registered initial target outside focus', async () => {
    let overlay!: OverlayState;
    let preferred!: FocusableState;
    setup((add, control) => {
      overlay = add({
        modal: true,
        initialFocus: () => preferred.element,
        children: () => {
          const item = control('unavailable');
          preferred = item;
          item.element.style.display = 'none';
          return item.node;
        },
      });
    });
    overlay.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(overlay.element());
  });

  it('restores an automatic controlled tab without emitting another selection request', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          font: '14px Arial',
          setTransform() {},
          clearRect() {},
          fillText() {},
          fillRect() {},
          measureText: (text: string) => ({
            width: text.length * 7,
            actualBoundingBoxAscent: 11,
            actualBoundingBoxDescent: 3,
          }),
        }) as never,
    );
    const target = document.createElement('div');
    document.body.append(target);
    box(target);
    const scene = new PRoot(new Container(), { width: 400, height: 300 });
    const changes = vi.fn();
    let overlay!: OverlayState;
    const stop = render(
      () =>
        UIProvider({
          reducedMotion: false,
          children: () =>
            OverlayHost({
              target,
              children: () => {
                overlay = createOverlay({
                  width: 120,
                  height: 80,
                  modal: true,
                  children: () => View({}),
                });
                return Tabs({
                  label: 'Controlled tabs',
                  value: null,
                  onValueChange: changes,
                  items: [
                    { value: 'one', label: 'One', children: () => View({}) },
                  ],
                });
              },
            }),
        }),
      scene,
    );
    cleanup.push(() => {
      stop();
      scene.destroyRecursive();
      target.remove();
    });
    const attach = (node: PNode) => {
      for (const child of node._view.children)
        if (child instanceof DOMContainer) target.append(child.element);
      for (const child of node._children) attach(child);
    };
    attach(scene);
    scene.doLayout();
    await settle();
    const tab = target.querySelector<HTMLElement>('[role=tab]')!;
    tab.focus();
    expect(changes).toHaveBeenCalledExactlyOnceWith('one');
    overlay.setOpen(true);
    await settle();
    expect(overlay.ready()).toBe(true);
    overlay.setOpen(false);
    expect(document.activeElement).toBe(tab);
    expect(changes).toHaveBeenCalledExactlyOnceWith('one');
  });

  it('keeps later sibling surfaces and their focus when an earlier surface closes', async () => {
    let lower!: OverlayState;
    let upper!: OverlayState;
    let upperControl!: FocusableState;
    setup((add, control) => {
      lower = add({});
      upper = add({
        autoFocus: true,
        children: () => {
          const item = control('sibling action');
          upperControl = item;
          return item.node;
        },
      });
    });
    lower.setOpen(true);
    upper.setOpen(true);
    await settle();
    const surface = upper.element();
    lower.setOpen(false);
    expect(upper.open()).toBe(true);
    expect(upper.ready()).toBe(true);
    expect(upper.element()).toBe(surface);
    expect(surface?.isConnected).toBe(true);
    expect(document.activeElement).toBe(upperControl.element);
    expect(
      mounts.destroyed.map((destroy) => destroy.mock.calls.length),
    ).toEqual([1, 0]);
  });

  it.each([false, true])(
    'ignores another instance surface even over its target rectangle (modal=%s)',
    async (modal) => {
      let left!: OverlayState;
      let right!: OverlayState;
      const dismiss = vi.fn();
      setup((add) => {
        left = add({ modal, outsidePointer: 'dismiss', onDismiss: dismiss });
      });
      setup((add) => {
        right = add({});
      }, 500);
      left.setOpen(true);
      right.setOpen(true);
      await settle();
      const event = pointer(right.element()!, { clientX: 30, clientY: 30 });
      expect(event.defaultPrevented).toBe(false);
      expect(left.open()).toBe(true);
      expect(right.open()).toBe(true);
      expect(dismiss).not.toHaveBeenCalled();
    },
  );

  it('leaves external DOM over the mount rectangle interactive', async () => {
    let overlay!: OverlayState;
    const dismiss = vi.fn();
    setup((add) => {
      overlay = add({
        modal: true,
        outsidePointer: 'dismiss',
        onDismiss: dismiss,
      });
    });
    overlay.setOpen(true);
    await settle();
    const input = document.createElement('input');
    document.body.append(input);
    const event = pointer(input, { clientX: 30, clientY: 30 });
    input.focus();
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(overlay.open()).toBe(true);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('releases interrupted gesture suppression on a new gesture with a reused pointer id or window blur', async () => {
    let overlay!: OverlayState;
    const first = setup((add) => {
      overlay = add({ modal: true });
    });
    const second = setup(() => {}, 500);
    overlay.setOpen(true);
    await settle();
    const finishOtherGesture = () => {
      const up = new PointerEvent('pointerup', {
        pointerId: 1,
        clientX: 510,
        bubbles: true,
        cancelable: true,
      });
      second.target.dispatchEvent(up);
      const click = new PointerEvent('click', {
        pointerId: 1,
        clientX: 510,
        bubbles: true,
        cancelable: true,
      });
      second.target.dispatchEvent(click);
      expect(up.defaultPrevented).toBe(false);
      expect(click.defaultPrevented).toBe(false);
    };
    expect(pointer(first.target, { pointerId: 1 }).defaultPrevented).toBe(true);
    expect(
      pointer(second.target, { pointerId: 1, clientX: 510 }).defaultPrevented,
    ).toBe(false);
    finishOtherGesture();
    expect(pointer(first.target, { pointerId: 1 }).defaultPrevented).toBe(true);
    window.dispatchEvent(new Event('blur'));
    finishOtherGesture();
  });

  it('can synchronously close from ready without rendering a destroyed app', async () => {
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ modal: true });
    });
    const stop = root((dispose) => {
      createEffect(() => {
        if (overlay.ready()) overlay.setOpen(false);
      });
      return dispose;
    });
    cleanup.push(stop);
    overlay.setOpen(true);
    await settle();
    expect(overlay.open()).toBe(false);
    expect(overlay.ready()).toBe(false);
    expect(overlay.element()).toBeUndefined();
    expect(mounts.destroyed).toHaveLength(1);
    expect(mounts.destroyed[0]).toHaveBeenCalledTimes(1);
    expect(mounts.rendersAfterDestroy).toBe(0);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('does not move focus from the newer top surface when an older mount finishes late', async () => {
    mounts.pending = true;
    let older!: OverlayState;
    let newer!: OverlayState;
    let topControl!: FocusableState;
    setup((add, control) => {
      older = add({ modal: true, children: () => control('older').node });
      newer = add({
        modal: true,
        children: () => {
          const current = control('newer');
          topControl = current;
          return current.node;
        },
      });
    });
    older.setOpen(true);
    newer.setOpen(true);
    const [finishOlder, finishNewer] = mounts.finish.splice(0);
    finishNewer();
    await settle();
    expect(document.activeElement).toBe(topControl.element);
    finishOlder();
    await settle();
    expect(older.ready()).toBe(true);
    expect(newer.ready()).toBe(true);
    expect(document.activeElement).toBe(topControl.element);
    expect(mounts.rendersAfterDestroy).toBe(0);
  });

  it('suppresses only the original outside pointer gesture across independent targets', async () => {
    let overlay!: OverlayState;
    const first = setup((add) => {
      overlay = add({ modal: true });
    });
    const second = setup(() => {}, 500);
    overlay.setOpen(true);
    await settle();
    expect(pointer(first.target, { pointerId: 1 }).defaultPrevented).toBe(true);
    expect(
      pointer(second.target, { pointerId: 2, clientX: 510 }).defaultPrevented,
    ).toBe(false);
    const release = new PointerEvent('pointerup', {
      pointerId: 2,
      bubbles: true,
      cancelable: true,
      clientX: 510,
    });
    second.target.dispatchEvent(release);
    expect(release.defaultPrevented).toBe(false);
    const click = new PointerEvent('click', {
      pointerId: 2,
      bubbles: true,
      cancelable: true,
      clientX: 510,
    });
    second.target.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    const original = new PointerEvent('pointerup', {
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      clientX: 20,
    });
    first.target.dispatchEvent(original);
    expect(original.defaultPrevented).toBe(true);
  });

  it('never marks a surface ready or renders its app when its anchor hides during mount', async () => {
    mounts.pending = true;
    const anchor = document.createElement('button');
    document.body.append(anchor);
    cleanup.push(() => anchor.remove());
    box(anchor, 100, 100, 40, 30);
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ anchor });
    });
    const ready: boolean[] = [];
    const stop = root((dispose) => {
      createEffect(() => {
        ready.push(overlay.ready());
      });
      return dispose;
    });
    cleanup.push(stop);
    overlay.setOpen(true);
    anchor.hidden = true;
    mounts.finish.splice(0)[0]();
    await settle();
    expect(ready).toEqual([false]);
    expect(overlay.element()).toBeUndefined();
    expect(mounts.renders).toHaveLength(1);
    expect(mounts.destroyed).toHaveLength(1);
    expect(
      mounts.renders.every((render) => render.mock.calls.length === 0),
    ).toBe(true);
    expect(
      mounts.destroyed.every((destroy) => destroy.mock.calls.length === 1),
    ).toBe(true);
  });

  it('drains all teardown resources and reports errors when content cleanup throws', async () => {
    const failure = new Error('content cleanup failed');
    const onError = vi.fn();
    let overlay!: OverlayState;
    let background!: FocusableState;
    setup((add, control) => {
      background = control('background');
      overlay = add({
        modal: true,
        onError,
        children: () => {
          onCleanup(() => {
            throw failure;
          });
          return View({});
        },
      });
    });
    await settle();
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const disconnected = vi.spyOn(ResizeObserver.prototype, 'disconnect');
    overlay.setOpen(true);
    await settle();
    expect(background.focus()).toBe(false);
    overlay.setOpen(false);
    await settle();
    expect(overlay.error()).toBe(failure);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(overlay.ready()).toBe(false);
    expect(overlay.element()).toBeUndefined();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
    expect(background.focus()).toBe(true);
    expect(disconnected).toHaveBeenCalledTimes(1);
    const registrations = added.mock.calls.filter(([type]) =>
      ['pointerdown', 'click', 'keydown', 'focusin'].includes(type),
    );
    expect(registrations).toHaveLength(4);
    for (const [type, callback, capture] of registrations)
      expect(removed).toHaveBeenCalledWith(type, callback, capture);
  });

  it('cycles modal Tab in explicit focus order', async () => {
    let overlay!: OverlayState;
    let first!: FocusableState;
    let second!: FocusableState;
    let third!: FocusableState;
    setup((add, control) => {
      overlay = add({
        modal: true,
        children: () => {
          const a = control('third', 30);
          const b = control('first', 10);
          const c = control('second', 20);
          first = b;
          second = c;
          third = a;
          return [a.node, b.node, c.node];
        },
      });
    });
    overlay.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(first.element);
    first.focus();
    key(first.element, 'Tab');
    expect(document.activeElement).toBe(second.element);
    key(second.element, 'Tab');
    expect(document.activeElement).toBe(third.element);
    key(third.element, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(second.element);
  });

  it('cycles modal Tab using current retained scene order after a reorder', async () => {
    let overlay!: OverlayState;
    let first!: FocusableState & { node: PNode };
    let second!: FocusableState & { node: PNode };
    let third!: FocusableState & { node: PNode };
    let parent!: PNode;
    setup((add, control) => {
      overlay = add({
        modal: true,
        children: () => {
          first = control('first');
          second = control('second');
          third = control('third');
          parent = View({}) as PNode;
          parent.appendChild(first.node);
          parent.appendChild(second.node);
          parent.appendChild(third.node);
          return parent;
        },
      });
    });
    overlay.setOpen(true);
    await settle();
    parent.insertBefore(third.node, second.node);
    await settle();
    first.focus();
    key(first.element, 'Tab');
    expect(document.activeElement).toBe(third.element);
    key(third.element, 'Tab');
    expect(document.activeElement).toBe(second.element);
  });

  it('preserves focus moved into another instance when an older surface closes', async () => {
    let overlay!: OverlayState;
    let original!: FocusableState;
    let external!: FocusableState;
    setup((add, control) => {
      original = control('original');
      overlay = add({ modal: true });
    });
    setup((_add, control) => {
      external = control('other instance');
    }, 500);
    await settle();
    original.focus();
    overlay.setOpen(true);
    await settle();
    external.focus();
    expect(document.activeElement).toBe(external.element);
    overlay.setOpen(false);
    expect(document.activeElement).toBe(external.element);
  });

  it('requires a host and allocates no shells or sampling while closed', () => {
    expect(() =>
      createOverlay({ width: 100, height: 100, children: () => undefined }),
    ).toThrow('OverlayHost');
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({});
    });
    expect(overlay.open()).toBe(false);
    expect(overlay.ready()).toBe(false);
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('preserves creation context, reactive content and cleanup across reopenings', async () => {
    const [value, change] = createState(1);
    const seen: number[] = [];
    const disposed = vi.fn();
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({
        children: () => {
          expect(useUITheme()().colorMode).toBe('dark');
          expect(getOwner()).not.toBeNull();
          createEffect(() => {
            seen.push(value());
          });
          onCleanup(disposed);
          return View({});
        },
      });
    });
    overlay.setOpen(true);
    await settle();
    expect(overlay.ready()).toBe(true);
    change(2);
    expect(seen).toEqual([1, 2]);
    overlay.setOpen(false);
    change(3);
    expect(seen).toEqual([1, 2]);
    expect(disposed).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    overlay.setOpen(true);
    await settle();
    expect(seen).toEqual([1, 2, 3]);
    overlay.dispose();
    overlay.dispose();
    expect(disposed).toHaveBeenCalledTimes(2);
    expect(
      mounts.destroyed.every((destroy) => destroy.mock.calls.length === 1),
    ).toBe(true);
  });

  it('uses controlled getters and current dismiss callbacks without remounting', async () => {
    const [open, changeOpen] = createState(true);
    const [width, changeWidth] = createState(120);
    const [veto, changeVeto] = createState(true);
    const changes = vi.fn();
    const rendered = vi.fn(() => View({}));
    let overlay!: OverlayState;
    const { target } = setup((add) => {
      overlay = add({
        get open() {
          return open();
        },
        get width() {
          return width();
        },
        get onDismiss() {
          return () => !veto();
        },
        onOpenChange: changes,
        children: rendered,
      });
    });
    await settle();
    const element = overlay.element();
    expect(element?.style.width).toBe('120px');
    changeWidth(160);
    expect(overlay.element()).toBe(element);
    expect(element?.style.width).toBe('160px');
    pointer(target);
    expect(changes).not.toHaveBeenCalled();
    changeVeto(false);
    pointer(target);
    expect(changes).toHaveBeenCalledExactlyOnceWith(false);
    expect(overlay.open()).toBe(true);
    changeOpen(false);
    expect(overlay.element()).toBeUndefined();
    expect(rendered).toHaveBeenCalledTimes(1);
  });

  it('handles outside dismiss, block and ignore policies and does not close on the opening event', async () => {
    let overlay!: OverlayState;
    const { target } = setup((add) => {
      overlay = add({});
    });
    target.addEventListener('pointerdown', () => overlay.setOpen(true), {
      once: true,
    });
    pointer(target);
    await settle();
    expect(overlay.open()).toBe(true);
    pointer(overlay.element()!);
    expect(overlay.open()).toBe(true);
    pointer(target);
    expect(overlay.open()).toBe(false);
    let blocked!: OverlayState;
    let ignored!: OverlayState;
    const second = setup((add) => {
      blocked = add({ outsidePointer: 'block' });
      ignored = add({ outsidePointer: 'ignore' });
    }, 500);
    blocked.setOpen(true);
    await settle();
    expect(pointer(second.target, { clientX: 510 }).defaultPrevented).toBe(
      true,
    );
    expect(blocked.open()).toBe(true);
    blocked.setOpen(false);
    ignored.setOpen(true);
    await settle();
    expect(pointer(second.target, { clientX: 510 }).defaultPrevented).toBe(
      false,
    );
    expect(ignored.open()).toBe(true);
  });

  it('dismisses only the top surface with Escape and ignores IME composition', async () => {
    let lower!: OverlayState;
    let upper!: OverlayState;
    setup((add) => {
      lower = add({});
      upper = add({});
    });
    lower.setOpen(true);
    upper.setOpen(true);
    await settle();
    expect(
      key(upper.element()!, 'Escape', { isComposing: true }).defaultPrevented,
    ).toBe(false);
    expect(
      key(upper.element()!, 'Escape', { keyCode: 229 }).defaultPrevented,
    ).toBe(false);
    expect(upper.open()).toBe(true);
    key(upper.element()!, 'Escape');
    expect(upper.open()).toBe(false);
    expect(lower.open()).toBe(true);
    key(lower.element()!, 'Escape');
    expect(lower.open()).toBe(false);
  });

  it('does not tunnel Escape through a top surface that disables dismissal', async () => {
    let lower!: OverlayState;
    let upper!: OverlayState;
    setup((add) => {
      lower = add({});
      upper = add({ dismissOnEscape: false });
    });
    lower.setOpen(true);
    upper.setOpen(true);
    await settle();
    key(upper.element()!, 'Escape');
    expect(upper.open()).toBe(true);
    expect(lower.open()).toBe(true);
  });

  it('constrains modal focus, cycles Tab in both directions and restores the trigger', async () => {
    let overlay!: OverlayState;
    let trigger!: FocusableState;
    let first!: FocusableState;
    let last!: FocusableState;
    const { target } = setup((add, control) => {
      trigger = control('trigger');
      overlay = add({
        modal: true,
        children: () => {
          const a = control('first');
          const b = control('last');
          first = a;
          last = b;
          return [a.node, b.node];
        },
      });
    });
    await settle();
    expect(trigger.focus()).toBe(true);
    overlay.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(first.element);
    expect(trigger.focus()).toBe(false);
    expect(pointer(target).defaultPrevented).toBe(true);
    expect(overlay.open()).toBe(true);
    key(first.element, 'Tab');
    expect(document.activeElement).toBe(last.element);
    key(last.element, 'Tab');
    expect(document.activeElement).toBe(first.element);
    key(first.element, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last.element);
    key(last.element, 'Escape');
    expect(document.activeElement).toBe(trigger.element);
  });

  it('restores nested focus and closes descendants when their ancestor closes', async () => {
    let parent!: OverlayState;
    let child!: OverlayState;
    let parentControl!: FocusableState;
    let childControl!: FocusableState;
    setup((add, control) => {
      parent = add({
        modal: true,
        children: () => {
          const a = control('parent');
          parentControl = a;
          child = createOverlay({
            width: 100,
            height: 60,
            modal: true,
            children: () => {
              const b = control('child');
              childControl = b;
              return b.node;
            },
          });
          return a.node;
        },
      });
    });
    parent.setOpen(true);
    await settle();
    child.setOpen(true);
    await settle();
    expect(document.activeElement).toBe(childControl.element);
    child.setOpen(false);
    expect(document.activeElement).toBe(parentControl.element);
    child.setOpen(true);
    await settle();
    parent.setOpen(false);
    expect(child.element()).toBeUndefined();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('updates modal constraints from getter changes without recreating content', async () => {
    const [modal, setModal] = createState(false);
    let overlay!: OverlayState;
    let background!: FocusableState;
    const content = vi.fn(() => View({}));
    setup((add, control) => {
      background = control('background');
      overlay = add({
        get modal() {
          return modal();
        },
        children: content,
      });
    });
    overlay.setOpen(true);
    await settle();
    expect(background.focus()).toBe(true);
    setModal(true);
    expect(background.focus()).toBe(false);
    setModal(false);
    expect(background.focus()).toBe(true);
    expect(content).toHaveBeenCalledTimes(1);
  });

  it('closes an HTMLElement anchor that becomes hidden while open', async () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    box(anchor, 100, 100, 50, 30);
    cleanup.push(() => anchor.remove());
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ anchor });
    });
    overlay.setOpen(true);
    await settle();
    anchor.hidden = true;
    overlay.updatePosition();
    expect(overlay.element()).toBeUndefined();
    expect(overlay.open()).toBe(false);
  });

  it('isolates outside events and Escape between two host instances', async () => {
    let left!: OverlayState;
    let right!: OverlayState;
    const first = setup((add) => {
      left = add({});
    });
    const second = setup((add) => {
      right = add({});
    }, 500);
    left.setOpen(true);
    right.setOpen(true);
    await settle();
    key(left.element()!, 'Escape');
    expect(left.open()).toBe(false);
    expect(right.open()).toBe(true);
    left.setOpen(true);
    await settle();
    pointer(first.target);
    expect(left.open()).toBe(false);
    expect(right.open()).toBe(true);
    pointer(second.target, { clientX: 510 });
    expect(right.open()).toBe(false);
  });

  it('cancels pending initialization on quick close and ignores stale completion', async () => {
    mounts.pending = true;
    const rendered = vi.fn(() => View({}));
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ children: rendered });
    });
    overlay.setOpen(true);
    overlay.setOpen(false);
    for (const finish of mounts.finish.splice(0)) finish();
    await settle();
    expect(rendered).not.toHaveBeenCalled();
    expect(overlay.ready()).toBe(false);
    expect(overlay.error()).toBeUndefined();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it('keeps a reopened surface when an earlier initialization finishes late', async () => {
    mounts.pending = true;
    const rendered = vi.fn(() => View({}));
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ children: rendered });
    });
    overlay.setOpen(true);
    overlay.setOpen(false);
    overlay.setOpen(true);
    const current = overlay.element();
    const [old, recent] = mounts.finish.splice(0);
    recent();
    await settle();
    expect(overlay.ready()).toBe(true);
    old();
    await settle();
    expect(overlay.element()).toBe(current);
    expect(overlay.ready()).toBe(true);
    expect(rendered).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(1);
  });

  it('installs one listener set per open host and removes it after the final close', async () => {
    let first!: OverlayState;
    let second!: OverlayState;
    setup((add) => {
      first = add({});
      second = add({});
    });
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const resizeDisconnected = vi.spyOn(ResizeObserver.prototype, 'disconnect');
    first.setOpen(true);
    second.setOpen(true);
    await settle();
    const registrations = added.mock.calls.filter(([type]) =>
      ['pointerdown', 'click', 'keydown', 'focusin'].includes(type),
    );
    expect(registrations).toHaveLength(4);
    expect(frames.size).toBe(1);
    second.setOpen(false);
    expect(frames.size).toBe(1);
    first.setOpen(false);
    expect(frames.size).toBe(0);
    expect(resizeDisconnected).toHaveBeenCalledTimes(1);
    for (const [type, callback, capture] of registrations)
      expect(removed).toHaveBeenCalledWith(type, callback, capture);
  });

  it('uses a safe focus fallback when the original trigger has been destroyed', async () => {
    let overlay!: OverlayState;
    let trigger!: FocusableState;
    let fallback!: FocusableState;
    setup((add, control) => {
      trigger = control('trigger');
      fallback = control('fallback');
      overlay = add({ modal: true });
    });
    await settle();
    trigger.focus();
    overlay.setOpen(true);
    await settle();
    trigger.dispose();
    overlay.setOpen(false);
    expect(document.activeElement).toBe(fallback.element);
  });

  it('reports mount failures and releases the shell and listeners', async () => {
    const cause = new Error('renderer failure');
    mounts.fail = cause;
    const failed = vi.fn();
    let overlay!: OverlayState;
    setup((add) => {
      overlay = add({ onError: failed });
    });
    overlay.setOpen(true);
    await settle();
    expect(overlay.error()).toBe(cause);
    expect(failed).toHaveBeenCalledExactlyOnceWith(cause);
    expect(overlay.element()).toBeUndefined();
    expect(frames.size).toBe(0);
  });

  it('closes stale anchored surfaces and cleans all open surfaces on host removal', async () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    box(anchor, 300, window.innerHeight - 40, 40, 30);
    let overlay!: OverlayState;
    const dismissed = vi.fn();
    const { target } = setup((add) => {
      overlay = add({ anchor, onDismiss: dismissed });
    });
    overlay.setOpen(true);
    await settle();
    expect(overlay.position()?.placement).toBe('top-start');
    anchor.remove();
    overlay.updatePosition();
    expect(dismissed).toHaveBeenCalledWith('anchor-removed', undefined);
    expect(overlay.element()).toBeUndefined();
    overlay.setOpen(true);
    await settle();
    target.remove();
    await settle();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(frames.size).toBe(0);
  });
  it.each([false, true])(
    'consumes the complete original dismiss-and-block gesture when controlled=%s',
    async (controlled) => {
      const changes = vi.fn();
      const dismiss = vi.fn();
      let overlay!: OverlayState;
      const { target } = setup((add) => {
        overlay = add({
          open: controlled ? true : undefined,
          defaultOpen: true,
          outsidePointer: 'dismiss-and-block',
          onOpenChange: changes,
          onDismiss: dismiss,
        });
      });
      await settle();
      const surface = overlay.element();
      const background = vi.fn();
      target.addEventListener('click', background);
      const down = pointer(target, {
        pointerId: 71,
        clientX: 250,
        clientY: 200,
      });
      expect(down.defaultPrevented).toBe(true);
      expect(changes).toHaveBeenCalledExactlyOnceWith(false);
      expect(dismiss).toHaveBeenCalledExactlyOnceWith('outside-pointer', down);
      expect(overlay.open()).toBe(controlled);
      if (controlled) expect(overlay.element()).toBe(surface);
      else expect(overlay.element()).toBeUndefined();
      for (const type of ['pointerup', 'click']) {
        const event = new PointerEvent(type, {
          pointerId: 71,
          bubbles: true,
          cancelable: true,
          clientX: 250,
          clientY: 200,
        });
        target.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
      expect(background).not.toHaveBeenCalled();
      const unrelatedClick = new PointerEvent('click', {
        pointerId: 72,
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 250,
      });
      target.dispatchEvent(unrelatedClick);
      expect(unrelatedClick.defaultPrevented).toBe(false);
      expect(background).toHaveBeenCalledTimes(1);
      expect(changes).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['native-trigger', 'canvas-target'] as const)(
    'treats its own anchor coordinates as inside for %s without dismissing or blocking',
    async (origin) => {
      const anchor = document.createElement('button');
      box(anchor, 50, 40, 80, 30);
      const changes = vi.fn();
      const dismiss = vi.fn();
      let overlay!: OverlayState;
      const { target } = setup((add) => {
        overlay = add({
          anchor,
          anchorIsInside: true,
          outsidePointer: 'dismiss-and-block',
          onOpenChange: changes,
          onDismiss: dismiss,
        });
      });
      target.append(anchor);
      overlay.setOpen(true);
      await settle();
      changes.mockClear();
      const event = pointer(origin === 'native-trigger' ? anchor : target, {
        pointerId: 81,
        clientX: 60,
        clientY: 50,
      });
      expect(event.defaultPrevented).toBe(false);
      expect(overlay.open()).toBe(true);
      expect(changes).not.toHaveBeenCalled();
      expect(dismiss).not.toHaveBeenCalled();
      const external = pointer(target, {
        pointerId: 82,
        clientX: 250,
        clientY: 200,
      });
      expect(external.defaultPrevented).toBe(true);
      expect(overlay.open()).toBe(false);
      expect(dismiss).toHaveBeenCalledExactlyOnceWith(
        'outside-pointer',
        external,
      );
      expect(changes).toHaveBeenCalledExactlyOnceWith(false);
    },
  );
  it.each([false, true])(
    'owns one anchored Tab exit from the anchor itself when Shift=%s and controlled close is rejected',
    async (shiftKey) => {
      const changes = vi.fn();
      const dismiss = vi.fn();
      let overlay!: OverlayState;
      let previous!: FocusableState;
      let anchor!: FocusableState;
      let next!: FocusableState;
      setup((add, control) => {
        previous = control('Before anchor');
        anchor = control('Tab anchor');
        next = control('After anchor');
        overlay = add({
          open: true,
          autoFocus: false,
          tabAnchor: anchor.element,
          dismissOnFocusOutside: true,
          onOpenChange: changes,
          onDismiss: dismiss,
          children: () => control('Inside anchored surface').node,
        });
      });
      await settle();
      anchor.focus();
      changes.mockClear();
      dismiss.mockClear();
      const element = overlay.element();
      const event = key(anchor.element, 'Tab', { shiftKey });
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe((shiftKey ? previous : next).element);
      expect(dismiss).toHaveBeenCalledExactlyOnceWith('focus-outside', event);
      expect(changes).toHaveBeenCalledExactlyOnceWith(false);
      expect(overlay.open()).toBe(true);
      expect(overlay.element()).toBe(element);
    },
  );
});
