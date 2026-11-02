import {
  createState,
  type PInput,
  type PNode,
  PRoot,
  render,
  Show,
  View,
} from '@piant/core';
import { Container, DOMContainer, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  OverlayHost,
  TextField,
  UIProvider,
} from '../dist/index.js';

const runtime = vi.hoisted(() => ({
  pending: false,
  finish: [] as (() => void)[],
  destroyed: [] as ReturnType<typeof vi.fn>[],
  sync: [] as (() => void)[],
}));
function attach(scene: PNode, target: HTMLElement) {
  for (const child of scene._view.children)
    if (child instanceof DOMContainer && !target.contains(child.element))
      target.append(child.element);
  for (const child of scene._children) attach(child, target);
}
vi.mock('@piant/core', async (original) => {
  const core = await original<typeof import('@piant/core')>();
  const pixi = await import('pixi.js');
  return {
    ...core,
    mount: vi.fn(async (component, target, options) => {
      if (runtime.pending)
        await new Promise<void>((resolve) => runtime.finish.push(resolve));
      options.signal.throwIfAborted();
      const scene = new core.PRoot(new pixi.Container(), {
        width: 440,
        height: 320,
      });
      const stop = core.render(component, scene);
      const sync = () => {
        attach(scene, target);
        scene.doLayout();
      };
      sync();
      runtime.sync.push(sync);
      let disposed = false;
      const destroy = vi.fn(() => {
        stop();
        scene.destroyRecursive();
      });
      const dispose = () => {
        if (disposed) return;
        disposed = true;
        options.signal.removeEventListener('abort', dispose);
        runtime.sync.splice(runtime.sync.indexOf(sync), 1);
        destroy();
      };
      options.signal.addEventListener('abort', dispose, { once: true });
      runtime.destroyed.push(destroy);
      return {
        root: scene,
        canvas: document.createElement('canvas'),
        app: { render: sync },
        resize: (width: number, height: number) => {
          scene.setStyle({ width, height });
          sync();
        },
        destroy: dispose,
      };
    }),
  };
});
const cleanups: (() => void)[] = [];
beforeEach(() => {
  runtime.pending = false;
  runtime.finish = [];
  runtime.destroyed = [];
  runtime.sync = [];
  vi.spyOn(Ticker.shared, 'start').mockImplementation(() => {});
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.stubGlobal('OffscreenCanvas', undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        font: '14px Arial',
        setTransform() {},
        clearRect() {},
        fillText() {},
        fillRect() {},
        measureText: (value: string) => ({
          width: value.length * 7,
          actualBoundingBoxAscent: 11,
          actualBoundingBoxDescent: 3,
        }),
      }) as never,
  );
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value() {},
  });
});
afterEach(async () => {
  for (const stop of cleanups.splice(0).reverse()) stop();
  for (const finish of runtime.finish.splice(0)) finish();
  await settle();
  document.body.replaceChildren();
  delete (HTMLElement.prototype as unknown as { showPopover?: unknown })
    .showPopover;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function settle() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
    for (const sync of [...runtime.sync]) sync();
  }
}
function fixture(children: () => unknown, dark = () => false) {
  const target = document.createElement('div');
  document.body.append(target);
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 500,
    bottom: 400,
    width: 500,
    height: 400,
    toJSON() {},
  });
  const scene = new PRoot(new Container(), { width: 500, height: 400 });
  const stop = render(
    () =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        reducedMotion: false,
        children: () =>
          OverlayHost({
            target,
            children: () => View({ children: children() as JSX.Element }),
          }),
      }),
    scene,
  );
  const sync = () => {
    attach(scene, target);
    scene.doLayout();
  };
  sync();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    scene.destroyRecursive();
    target.remove();
  };
  cleanups.push(dispose);
  return { target, scene, sync, dispose };
}
function named(name: string) {
  const result = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-label]'),
  ).find((element) => element.getAttribute('aria-label') === name);
  if (!result) throw new Error(`Missing ${name}`);
  return result;
}
function key(
  element: HTMLElement,
  key: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}
function press(name: string) {
  const element = named(name);
  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
      isPrimary: true,
    }),
  );
  element.focus();
  element.click();
}
function outside(target: HTMLElement) {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    isPrimary: true,
    pointerId: 1,
  });
  target.dispatchEvent(event);
  return event;
}
function simpleDialog(
  options: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onError?: (error: unknown) => void;
  } = {},
) {
  return Dialog({
    get open() {
      return options.open;
    },
    defaultOpen: options.defaultOpen,
    onOpenChange: options.onOpenChange,
    children: () => [
      DialogTrigger({ children: 'Open dialog' }),
      DialogContent({
        onError: options.onError,
        children: () => [
          DialogTitle({ children: 'Profile' }),
          DialogDescription({ children: 'Edit the profile.' }),
          TextField({ 'aria-label': 'Profile name', defaultValue: '初始' }),
        ],
        actions: () => DialogClose({ children: 'Close dialog' }),
      }),
    ],
  });
}

describe('Dialog and AlertDialog', () => {
  it('opens named semantic content, cycles focus and restores its trigger after closing', async () => {
    const changes = vi.fn();
    fixture(() => simpleDialog({ onOpenChange: changes }));
    expect(named('Open dialog').getAttribute('aria-expanded')).toBe('false');
    press('Open dialog');
    await settle();
    const surface = document.querySelector<HTMLElement>('[role=dialog]')!;
    expect(surface).not.toBeNull();
    expect(surface.getAttribute('aria-modal')).toBe('false');
    expect(
      document.getElementById(surface.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Profile');
    expect(
      document.getElementById(surface.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Edit the profile.');
    expect(named('Open dialog').getAttribute('aria-controls')).toBe(surface.id);
    expect(document.activeElement).toBe(named('Profile name'));
    key(named('Profile name'), 'Tab');
    expect(document.activeElement).toBe(named('Close dialog'));
    key(named('Close dialog'), 'Tab');
    expect(document.activeElement).toBe(named('Profile name'));
    key(named('Profile name'), 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(named('Close dialog'));
    key(named('Close dialog'), 'Escape');
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(document.activeElement).toBe(named('Open dialog'));
    expect(named('Open dialog').hasAttribute('aria-controls')).toBe(false);
    expect(changes.mock.calls).toEqual([[true], [false]]);
  });

  it('does not commit rejected controlled requests or remount retained open content', async () => {
    const [open, setOpen] = createState(false);
    const changes = vi.fn();
    fixture(() =>
      simpleDialog({
        get open() {
          return open();
        },
        onOpenChange: changes,
      }),
    );
    press('Open dialog');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(changes).toHaveBeenLastCalledWith(true);
    setOpen(true);
    await settle();
    const input = named('Profile name') as HTMLInputElement;
    input.value = '保留编辑';
    press('Close dialog');
    await settle();
    expect(named('Profile name')).toBe(input);
    expect(input.value).toBe('保留编辑');
    expect(changes).toHaveBeenLastCalledWith(false);
    setOpen(false);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    setOpen(true);
    await settle();
    expect(named('Profile name')).not.toBe(input);
    expect((named('Profile name') as HTMLInputElement).value).toBe('初始');
  });

  it('dismisses Dialog outside gestures while blocking background input and clicks', async () => {
    const { target } = fixture(() => [
      TextField({ 'aria-label': 'Background field' }),
      simpleDialog(),
    ]);
    press('Open dialog');
    await settle();
    named('Background field').focus();
    expect(document.activeElement).toBe(named('Profile name'));
    expect(outside(target).defaultPrevented).toBe(true);
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('focuses AlertDialog Cancel, blocks outside dismissal, and never confirms on Escape or input Enter', async () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const changes = vi.fn();
    const { target } = fixture(() =>
      AlertDialog({
        onOpenChange: changes,
        children: () => [
          AlertDialogTrigger({ children: 'Delete item' }),
          AlertDialogContent({
            children: () => [
              AlertDialogTitle({ children: 'Delete?' }),
              AlertDialogDescription({ children: 'This cannot be undone.' }),
              TextField({ 'aria-label': 'Delete phrase' }),
            ],
            actions: () => [
              AlertDialogConfirm({
                children: 'Confirm delete',
                onPress: confirm,
              }),
              AlertDialogCancel({ children: 'Cancel delete', onPress: cancel }),
            ],
          }),
        ],
      }),
    );
    press('Delete item');
    await settle();
    expect(document.activeElement).toBe(named('Cancel delete'));
    expect(outside(target).defaultPrevented).toBe(true);
    expect(document.querySelector('[role=alertdialog]')).not.toBeNull();
    named('Delete phrase').focus();
    key(named('Delete phrase'), 'Enter');
    expect(confirm).not.toHaveBeenCalled();
    key(named('Delete phrase'), 'Escape', { isComposing: true });
    expect(document.querySelector('[role=alertdialog]')).not.toBeNull();
    named('Delete phrase').dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }),
    );
    key(named('Delete phrase'), 'Escape');
    expect(document.querySelector('[role=alertdialog]')).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    press('Delete item');
    await settle();
    press('Cancel delete');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    press('Delete item');
    await settle();
    press('Confirm delete');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls).toEqual([
      [true],
      [false],
      [true],
      [false],
      [true],
      [false],
    ]);
  });

  it('allows action prevention and uses a safe surface fallback without a Cancel', async () => {
    const action = vi.fn((event: MouseEvent) => event.preventDefault());
    fixture(() =>
      AlertDialog({
        defaultOpen: true,
        children: () =>
          AlertDialogContent({
            name: 'Unlabelled alert',
            children: () => View({}),
            actions: () =>
              AlertDialogConfirm({ children: 'Veto confirm', onPress: action }),
          }),
      }),
    );
    await settle();
    const surface = document.querySelector<HTMLElement>('[role=alertdialog]')!;
    expect(surface.getAttribute('aria-label')).toBe('Unlabelled alert');
    expect(document.activeElement).toBe(surface);
    press('Veto confirm');
    expect(action).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role=alertdialog]')).toBe(surface);
  });

  it('restores nested focus inside the parent and disposes descendants with their owner', async () => {
    const fixtureState = fixture(() =>
      Dialog({
        children: () => [
          DialogTrigger({ children: 'Parent trigger' }),
          DialogContent({
            name: 'Parent',
            children: () =>
              Dialog({
                children: () => [
                  DialogTrigger({ children: 'Child trigger' }),
                  DialogContent({
                    name: 'Child',
                    children: () => TextField({ 'aria-label': 'Child field' }),
                    actions: () => DialogClose({ children: 'Child close' }),
                  }),
                ],
              }),
            actions: () => DialogClose({ children: 'Parent close' }),
          }),
        ],
      }),
    );
    press('Parent trigger');
    await settle();
    press('Child trigger');
    await settle();
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(2);
    key(named('Child field'), 'Escape');
    expect(document.activeElement).toBe(named('Child trigger'));
    expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
    press('Child trigger');
    await settle();
    fixtureState.dispose();
    expect(document.querySelectorAll('[data-piant-overlay]')).toHaveLength(0);
    expect(
      runtime.destroyed.every((destroy) => destroy.mock.calls.length === 1),
    ).toBe(true);
  });

  it('keeps a centered dialog open after trigger removal and restores an available fallback', async () => {
    const [visible, setVisible] = createState(true);
    const state = fixture(() => [
      Button({ children: 'Safe fallback' }),
      Dialog({
        children: () => [
          Show({
            get when() {
              return visible();
            },
            children: (_visible) =>
              DialogTrigger({ children: 'Removable trigger' }),
          }),
          DialogContent({
            name: 'Centered dialog',
            children: () => View({}),
            actions: () => DialogClose({ children: 'Centered close' }),
          }),
        ],
      }),
    ]);
    press('Removable trigger');
    await settle();
    setVisible(false);
    state.sync();
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    press('Centered close');
    expect(document.activeElement).toBe(named('Safe fallback'));
  });

  it('does not remount or move a selected native input on theme changes', async () => {
    const [dark, setDark] = createState(false);
    let inputNode!: PInput;
    const initialFocus = vi.fn(() => inputNode.element);
    fixture(
      () =>
        Dialog({
          defaultOpen: true,
          children: () =>
            DialogContent({
              name: 'Themed editor',
              initialFocus,
              children: () =>
                TextField({
                  'aria-label': 'Themed field',
                  defaultValue: 'selection',
                  ref: (node) => {
                    inputNode = node;
                  },
                }),
              actions: () => DialogClose({ children: 'Themed close' }),
            }),
        }),
      dark,
    );
    await settle();
    const input = named('Themed field') as HTMLInputElement;
    input.setSelectionRange(2, 5);
    setDark(true);
    await settle();
    expect(named('Themed field')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
    expect(initialFocus).toHaveBeenCalledTimes(1);
  });

  it('cancels rapid pending openings and leaves no stale surface after owner disposal', async () => {
    runtime.pending = true;
    const [open, setOpen] = createState(false);
    const state = fixture(() =>
      simpleDialog({
        get open() {
          return open();
        },
      }),
    );
    setOpen(true);
    setOpen(false);
    setOpen(true);
    expect(runtime.finish).toHaveLength(2);
    state.dispose();
    for (const finish of runtime.finish.splice(0)) finish();
    await settle();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed).toHaveLength(0);
  });
  it('keeps independent instances interactive and cleans a removed host before remount', async () => {
    const left = fixture(() =>
      Dialog({
        defaultOpen: true,
        children: () =>
          DialogContent({
            name: 'Left editor',
            children: () => TextField({ 'aria-label': 'Left input' }),
          }),
      }),
    );
    await settle();
    fixture(() =>
      Dialog({
        defaultOpen: true,
        children: () =>
          DialogContent({
            name: 'Right editor',
            children: () => TextField({ 'aria-label': 'Right input' }),
          }),
      }),
    );
    await settle();
    named('Left input').focus();
    expect(document.activeElement).toBe(named('Left input'));
    named('Right input').focus();
    expect(document.activeElement).toBe(named('Right input'));
    key(named('Right input'), 'Escape');
    expect(document.querySelector('[aria-label="Left editor"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Right editor"]')).toBeNull();
    left.target.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    fixture(() => simpleDialog({ defaultOpen: true }));
    await settle();
    expect(document.activeElement).toBe(named('Profile name'));
  });

  it('ignores unflagged IME boundary Escape and guarded confirm Enter', async () => {
    const confirm = vi.fn();
    fixture(() =>
      AlertDialog({
        defaultOpen: true,
        children: () =>
          AlertDialogContent({
            name: 'IME alert',
            children: () => TextField({ 'aria-label': 'IME field' }),
            actions: () => [
              AlertDialogCancel({ children: 'IME cancel' }),
              AlertDialogConfirm({ children: 'IME confirm', onPress: confirm }),
            ],
          }),
      }),
    );
    await settle();
    const input = named('IME field');
    input.focus();
    input.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, data: '中' }),
    );
    key(input, 'Escape');
    input.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: '中文' }),
    );
    key(input, 'Escape');
    expect(document.querySelector('[role=alertdialog]')).not.toBeNull();
    const button = named('IME confirm');
    button.focus();
    key(button, 'Enter', { isComposing: true });
    key(button, 'Enter', { keyCode: 229 });
    expect(confirm).not.toHaveBeenCalled();
    expect(document.querySelector('[role=alertdialog]')).not.toBeNull();
  });
  it('does not report semantic errors during close, reopen, owner and host teardown', async () => {
    const errors = vi.fn();
    const first = fixture(() => simpleDialog({ onError: errors }));
    press('Open dialog');
    await settle();
    press('Close dialog');
    press('Open dialog');
    await settle();
    first.dispose();
    expect(errors).not.toHaveBeenCalled();
    const second = fixture(() =>
      simpleDialog({ defaultOpen: true, onError: errors }),
    );
    await settle();
    second.target.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });
  it.each(['dialog', 'alertdialog'] as const)(
    'reports an unnamed %s once and releases its surface and focus lock',
    async (kind) => {
      const errors = vi.fn();
      const Root = kind === 'dialog' ? Dialog : AlertDialog;
      const Content = kind === 'dialog' ? DialogContent : AlertDialogContent;
      fixture(() => [
        Button({ children: 'Error fallback' }),
        Root({
          defaultOpen: true,
          children: () =>
            Content({ onError: errors, children: () => View({}) }),
        }),
      ]);
      await settle();
      expect(errors).toHaveBeenCalledTimes(1);
      expect(errors.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(document.querySelector('[data-piant-overlay]')).toBeNull();
      named('Error fallback').focus();
      expect(document.activeElement).toBe(named('Error fallback'));
      await settle();
      expect(errors).toHaveBeenCalledTimes(1);
      expect(runtime.destroyed).toHaveLength(1);
      expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['empty title', 'removed title', 'empty description'])(
    'fatally disposes Content after %s and recovers only through Content remount',
    async (invalid) => {
      const errors = vi.fn();
      const changes = vi.fn();
      const [mounted, setMounted] = createState(true);
      const [showTitle, setShowTitle] = createState(true);
      const [title, setTitle] = createState('Valid title');
      const [description, setDescription] = createState('Valid description');
      const [open, setOpen] = createState(true);
      const state = fixture(() => [
        Button({ children: 'Dynamic fallback' }),
        Dialog({
          get open() {
            return open();
          },
          onOpenChange: changes,
          children: () =>
            Show({
              get when() {
                return mounted();
              },
              children: (_mounted) =>
                DialogContent({
                  onError: errors,
                  children: () => [
                    Show({
                      get when() {
                        return showTitle();
                      },
                      children: (_title) =>
                        DialogTitle({
                          get children() {
                            return title();
                          },
                        }),
                    }),
                    DialogDescription({
                      get children() {
                        return description();
                      },
                    }),
                    TextField({ 'aria-label': 'Dynamic dialog input' }),
                  ],
                }),
            }),
        }),
      ]);
      await settle();
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      if (invalid === 'empty title') setTitle('  ');
      else if (invalid === 'removed title') setShowTitle(false);
      else setDescription('');
      await settle();
      expect(errors).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[data-piant-overlay]')).toBeNull();
      named('Dynamic fallback').focus();
      expect(document.activeElement).toBe(named('Dynamic fallback'));
      expect(changes).not.toHaveBeenCalled();
      setTitle('Repaired title');
      setDescription('Repaired description');
      setShowTitle(true);
      setOpen(false);
      setOpen(true);
      state.sync();
      await settle();
      expect(document.querySelector('[data-piant-overlay]')).toBeNull();
      expect(errors).toHaveBeenCalledTimes(1);
      setMounted(false);
      state.sync();
      setMounted(true);
      state.sync();
      await settle();
      expect(document.querySelector('[role=dialog]')).not.toBeNull();
      expect(document.activeElement).toBe(named('Dynamic dialog input'));
      expect(errors).toHaveBeenCalledTimes(1);
    },
  );

  it('does not emit a stale close request when Confirm synchronously unmounts its root', async () => {
    const [mounted, setMounted] = createState(true);
    const changes = vi.fn();
    const confirm = vi.fn(() => setMounted(false));
    const state = fixture(() => [
      Button({ children: 'Confirm fallback' }),
      Show({
        get when() {
          return mounted();
        },
        children: (_mounted) =>
          AlertDialog({
            defaultOpen: true,
            onOpenChange: changes,
            children: () =>
              AlertDialogContent({
                name: 'Unmounting confirmation',
                children: () => View({}),
                actions: () => [
                  AlertDialogCancel({ children: 'Unmount cancel' }),
                  AlertDialogConfirm({
                    children: 'Unmount confirm',
                    onPress: confirm,
                  }),
                ],
              }),
          }),
      }),
    ]);
    await settle();
    press('Unmount confirm');
    state.sync();
    await settle();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(changes).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-overlay]')).toBeNull();
    expect(runtime.destroyed).toHaveLength(1);
    expect(runtime.destroyed[0]).toHaveBeenCalledTimes(1);
    named('Confirm fallback').focus();
    expect(document.activeElement).toBe(named('Confirm fallback'));
  });
  it('adds, removes and readds valid title and description without replacing ready content', async () => {
    const errors = vi.fn();
    const [hasTitle, setHasTitle] = createState(false);
    const [hasDescription, setHasDescription] = createState(false);
    const [title, setTitle] = createState('Dynamic title');
    const [description, setDescription] = createState('Dynamic description');
    fixture(() =>
      Dialog({
        defaultOpen: true,
        children: () =>
          DialogContent({
            name: 'Fallback editor',
            onError: errors,
            children: () => [
              Show({
                get when() {
                  return hasTitle();
                },
                children: (_shown) =>
                  DialogTitle({
                    get children() {
                      return title();
                    },
                  }),
              }),
              Show({
                get when() {
                  return hasDescription();
                },
                children: (_shown) =>
                  DialogDescription({
                    get children() {
                      return description();
                    },
                  }),
              }),
              TextField({
                'aria-label': 'Dynamic semantic field',
                defaultValue: 'keep selection',
              }),
            ],
          }),
      }),
    );
    await settle();
    const surface = document.querySelector<HTMLElement>('[role=dialog]')!;
    const input = named('Dynamic semantic field') as HTMLInputElement;
    input.setSelectionRange(1, 4);
    expect(surface.getAttribute('aria-label')).toBe('Fallback editor');
    expect(surface.hasAttribute('aria-labelledby')).toBe(false);
    setHasTitle(true);
    setHasDescription(true);
    await settle();
    const titleId = surface.getAttribute('aria-labelledby')!;
    const descriptionId = surface.getAttribute('aria-describedby')!;
    expect(document.getElementById(titleId)?.textContent).toBe('Dynamic title');
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Dynamic description',
    );
    expect(surface.hasAttribute('aria-label')).toBe(false);
    setTitle('Updated title');
    setDescription('Updated description');
    await settle();
    expect(document.getElementById(titleId)?.textContent).toBe('Updated title');
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Updated description',
    );
    setHasTitle(false);
    setHasDescription(false);
    await settle();
    expect(surface.getAttribute('aria-label')).toBe('Fallback editor');
    expect(surface.hasAttribute('aria-labelledby')).toBe(false);
    expect(surface.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById(titleId)).toBeNull();
    expect(document.getElementById(descriptionId)).toBeNull();
    setHasDescription(true);
    setHasTitle(true);
    await settle();
    expect(
      document.getElementById(surface.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('Updated title');
    expect(
      document.getElementById(surface.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('Updated description');
    expect(document.querySelector('[role=dialog]')).toBe(surface);
    expect(named('Dynamic semantic field')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4]);
    expect(errors).not.toHaveBeenCalled();
    expect(runtime.destroyed).toHaveLength(1);
    expect(runtime.destroyed[0]).not.toHaveBeenCalled();
  });
});
