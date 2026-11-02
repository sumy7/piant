import {
  createContext,
  createEffect,
  createState,
  type Getter,
  getOwner,
  isComposingInput,
  type MountedApp,
  mount,
  onCleanup,
  root,
  runWithOwner,
  untrack,
  useContext,
  useMountSurface,
  type View,
} from '@piant/core';
import { createControllableState } from './createControllableState';
import { type FocusScope, getFocusScope } from './focusScope';
import type { OverlayAnchor } from './overlayAnchor';
import {
  computeOverlayPosition,
  type OverlayPosition,
  type OverlayPositionOptions,
  type OverlayRect,
} from './overlayPosition';

export type OverlayDismissReason =
  'escape' | 'outside-pointer' | 'anchor-removed';
export interface OverlayOptions extends OverlayPositionOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Omit to center in the visible part of the instance. */
  anchor?: OverlayAnchor | HTMLElement;
  /** Logical CSS-pixel surface size; clamped to the available space. */
  width: number;
  height: number;
  modal?: boolean;
  dismissOnEscape?: boolean;
  /** Only pointer events belonging to this mount are outside events. */
  outsidePointer?: 'dismiss' | 'block' | 'ignore';
  /** Return false to veto a dismissal request. Controlled open remains authoritative. */
  onDismiss?: (reason: OverlayDismissReason, event?: Event) => boolean | void;
  /** Defaults to true for modal surfaces. */
  autoFocus?: boolean;
  restoreFocus?: boolean;
  /** Called under the creation context once per opening. Use reactive content. */
  children: (overlay: OverlayState) => unknown;
  /** Initialization/render errors are observable; no unhandled async rejection. */
  onError?: (error: unknown) => void;
}

export interface OverlayState {
  readonly open: Getter<boolean>;
  readonly ready: Getter<boolean>;
  readonly error: Getter<unknown>;
  readonly position: Getter<OverlayPosition | undefined>;
  readonly element: Getter<HTMLElement | undefined>;
  setOpen(open: boolean): void;
  updatePosition(): void;
  dispose(): void;
}

export interface OverlayHostProps {
  /** Defaults to the current core mount target. Fixed for this host's lifetime. */
  target?: HTMLElement;
  children?: () => ReturnType<typeof View>;
}

const OverlayContext = createContext<OverlayManager>();
const hosts = new WeakMap<HTMLElement, OverlayManager>();
const scopes = new Map<FocusScope, OverlayManager>();

/** Install once inside the UIProvider of each independently mounted instance. */
export function OverlayHost(props: OverlayHostProps) {
  const target = props.target ?? useMountSurface()?.target;
  if (!target)
    throw new Error('OverlayHost requires a core mount or explicit target.');
  const focus = getFocusScope();
  if (hosts.has(target) || scopes.has(focus))
    throw new Error(
      'Each OverlayHost requires its own mount target and UIProvider focus scope.',
    );
  const manager = new OverlayManager(target, focus);
  hosts.set(target, manager);
  scopes.set(focus, manager);
  onCleanup(() => {
    try {
      manager.dispose();
    } finally {
      hosts.delete(target);
      scopes.delete(focus);
    }
  });
  return OverlayContext.Provider({ value: manager, children: props.children });
}

interface Surface {
  shell: HTMLDivElement;
  content: HTMLDivElement;
  blocker: HTMLDivElement;
  options: OverlayOptions;
  state: OverlayState;
  previousFocus: HTMLElement | null;
  requestDismiss(reason: OverlayDismissReason, event?: Event): void;
  update(): void;
  close(): void;
}

function viewportRect(element: HTMLElement): OverlayRect {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}
function stopEvent(event: Event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}
function visible(element: HTMLElement, semantic = true) {
  if (!element.isConnected || element.matches(':disabled')) return false;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (
      node.hidden ||
      (semantic && node.inert) ||
      (semantic && node.getAttribute('aria-hidden') === 'true') ||
      style.display === 'none' ||
      style.visibility === 'hidden'
    )
      return false;
  }
  return true;
}

class OverlayManager {
  readonly stack: Surface[] = [];
  private frame = 0;
  private stopGesture = () => {};
  private disposed = false;
  private redirecting = false;
  private observed?: ResizeObserver;
  private mutation?: MutationObserver;
  readonly doc: Document;
  readonly win: Window & typeof globalThis;

  constructor(
    readonly target: HTMLElement,
    readonly focus: FocusScope,
  ) {
    this.doc = target.ownerDocument;
    this.win = this.doc.defaultView!;
  }
  private modalIndex() {
    for (let i = this.stack.length - 1; i >= 0; i--)
      if (this.stack[i].options.modal) return i;
    return -1;
  }
  private permitted(element: HTMLElement) {
    const index = this.modalIndex();
    return (
      index < 0 ||
      this.stack.slice(index).some((entry) => entry.content.contains(element))
    );
  }
  private owns(element: EventTarget | null) {
    return (
      element instanceof this.win.HTMLElement &&
      (this.target.contains(element) ||
        this.stack.some((entry) => entry.shell.contains(element)) ||
        this.focus.entries.some((entry) => entry.binding.element === element))
    );
  }
  private belongs(event: MouseEvent) {
    // Shifted foreign surfaces and external DOM can cover this instance's
    // rectangle. Only actual DOM ownership establishes event ownership.
    for (const element of event.composedPath()) {
      for (const manager of scopes.values()) {
        if (manager.doc !== this.doc) continue;
        if (
          element === manager.target ||
          manager.stack.some((surface) => surface.shell === element)
        )
          return manager === this;
      }
    }
    // Canvas targets have DOMPipe siblings rather than ancestor mount targets.
    const owner = [...scopes.values()].find(
      (manager) =>
        manager.doc === this.doc &&
        manager.focus.entries.some(
          (entry) => entry.binding.element === event.target,
        ),
    );
    if (owner) return owner === this;
    return this.owns(event.target);
  }
  private suppressGesture(origin: PointerEvent) {
    this.stopGesture();
    const stop = (event: Event) => {
      const pointer = event as PointerEvent;
      if (typeof pointer.pointerId === 'number' && pointer.pointerId > 0) {
        if (pointer.pointerId !== origin.pointerId) return;
      } else {
        const mouse = event as MouseEvent;
        if (
          !this.belongs(mouse) ||
          Math.abs(mouse.clientX - origin.clientX) > 8 ||
          Math.abs(mouse.clientY - origin.clientY) > 8
        )
          return;
      }
      stopEvent(event);
      if (event.type === 'click' || event.type === 'pointercancel') cleanup();
    };
    const restart = (event: PointerEvent) => {
      if (event !== origin && event.pointerId === origin.pointerId) cleanup();
    };
    const cleanup = () => {
      this.doc.removeEventListener('pointerdown', restart, true);
      this.win.removeEventListener('blur', cleanup);
      for (const name of ['pointerup', 'click', 'pointercancel'])
        this.doc.removeEventListener(name, stop, true);
      this.win.clearTimeout(timer);
      this.stopGesture = () => {};
    };
    const timer = this.win.setTimeout(cleanup, 1000);
    this.doc.addEventListener('pointerdown', restart, true);
    this.win.addEventListener('blur', cleanup);
    for (const name of ['pointerup', 'click', 'pointercancel'])
      this.doc.addEventListener(name, stop, true);
    this.stopGesture = cleanup;
  }
  private onPointer = (event: PointerEvent) => {
    const top = this.stack.at(-1);
    if (
      !top ||
      !this.belongs(event) ||
      top.content.contains(event.target as Node)
    )
      return;
    const policy =
      top.options.outsidePointer ?? (top.options.modal ? 'block' : 'dismiss');
    const blocked = this.modalIndex() >= 0 || policy === 'block';
    if (blocked) {
      this.suppressGesture(event);
      stopEvent(event);
    }
    if (policy === 'dismiss' && event.button === 0 && event.isPrimary !== false)
      top.requestDismiss('outside-pointer', event);
  };
  private onClick = (event: MouseEvent) => {
    if (
      this.modalIndex() >= 0 &&
      this.belongs(event) &&
      !this.permitted(event.target as HTMLElement)
    )
      stopEvent(event);
  };
  private onKey = (event: KeyboardEvent) => {
    if (!this.owns(event.target) || isComposingInput(event)) return;
    const top = this.stack.at(-1);
    if (event.key === 'Escape' && top?.options.dismissOnEscape !== false) {
      stopEvent(event);
      top?.requestDismiss('escape', event);
    } else if (event.key === 'Tab' && this.modalIndex() >= 0) {
      const candidates = this.focus
        .tabEntries()
        .filter((entry) => this.permitted(entry.binding.element));
      const current = candidates.findIndex(
        (entry) => entry.binding.element === this.doc.activeElement,
      );
      const next =
        current < 0
          ? event.shiftKey
            ? candidates.length - 1
            : 0
          : (current + (event.shiftKey ? -1 : 1) + candidates.length) %
            candidates.length;
      stopEvent(event);
      if (candidates.length) this.focus.focus(candidates[next]);
      else this.focusSurface();
    }
  };
  private onFocus = (event: FocusEvent) => {
    if (
      this.redirecting ||
      this.modalIndex() < 0 ||
      !this.owns(event.target) ||
      this.permitted(event.target as HTMLElement)
    )
      return;
    this.focusSurface();
  };
  focusSurface() {
    if (this.redirecting) return;
    this.redirecting = true;
    try {
      const index = this.modalIndex();
      const active = this.stack.slice(Math.max(0, index));
      const top = active.at(-1);
      const first = this.focus
        .tabEntries()
        .find((entry) => top?.content.contains(entry.binding.element));
      if (first) this.focus.focus(first);
      else top?.content.focus({ preventScroll: true });
    } finally {
      this.redirecting = false;
    }
  }
  private refresh = () => {
    for (const surface of [...this.stack]) surface.update();
  };
  private sample = () => {
    this.refresh();
    if (this.stack.length)
      this.frame = this.win.requestAnimationFrame(this.sample);
  };
  add(surface: Surface) {
    if (this.disposed)
      throw new Error('Cannot open an overlay in a disposed host.');
    this.stack.push(surface);
    if (this.stack.length === 1) {
      this.doc.addEventListener('pointerdown', this.onPointer, true);
      this.doc.addEventListener('click', this.onClick, true);
      this.doc.addEventListener('keydown', this.onKey, true);
      this.doc.addEventListener('focusin', this.onFocus, true);
      this.win.addEventListener('resize', this.refresh);
      this.win.addEventListener('scroll', this.refresh, true);
      this.win.visualViewport?.addEventListener('resize', this.refresh);
      this.win.visualViewport?.addEventListener('scroll', this.refresh);
      this.observed = new ResizeObserver(this.refresh);
      this.observed.observe(this.target);
      this.mutation = new MutationObserver(() => {
        if (!this.target.isConnected) this.dispose();
      });
      this.mutation.observe(this.doc, { childList: true, subtree: true });
      // Layout/scroll events do not cover Pixi transforms or CSS animation. One
      // sampler per OPEN host compares geometry; unchanged geometry does no work.
      this.frame = this.win.requestAnimationFrame(this.sample);
    }
    this.syncConstraint();
  }
  syncConstraint() {
    this.focus.setConstraint(
      this.modalIndex() < 0 ? undefined : (element) => this.permitted(element),
    );
  }
  remove(surface: Surface, hadFocus: boolean) {
    const index = this.stack.indexOf(surface);
    if (index < 0) return;
    const shouldRestore = index === this.stack.length - 1 || hadFocus;
    // Nested surfaces are disposed by their captured content owner. Opening
    // later in this stack does not make an independent surface a descendant.
    this.stack.splice(index, 1);
    this.syncConstraint();
    if (!this.stack.length) this.disconnect();
    const active = this.doc.activeElement;
    const canRestore = !active || active === this.doc.body || this.owns(active);
    if (
      shouldRestore &&
      canRestore &&
      surface.options.restoreFocus !== false &&
      !this.disposed
    ) {
      this.focus.recoverFocus(() => {
        const previous = surface.previousFocus;
        const entry = this.focus.entries.find(
          (entry) => entry.binding.element === previous,
        );
        if (entry?.available()) this.focus.focus(entry);
        else if (previous && visible(previous) && this.permitted(previous))
          previous.focus({ preventScroll: true });
        else if (this.stack.length) this.focusSurface();
        else this.focus.focusFirst();
      });
    }
  }
  private disconnect() {
    this.win.cancelAnimationFrame(this.frame);
    this.observed?.disconnect();
    this.mutation?.disconnect();
    this.doc.removeEventListener('pointerdown', this.onPointer, true);
    this.doc.removeEventListener('click', this.onClick, true);
    this.doc.removeEventListener('keydown', this.onKey, true);
    this.doc.removeEventListener('focusin', this.onFocus, true);
    this.win.removeEventListener('resize', this.refresh);
    this.win.removeEventListener('scroll', this.refresh, true);
    this.win.visualViewport?.removeEventListener('resize', this.refresh);
    this.win.visualViewport?.removeEventListener('scroll', this.refresh);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const surface of [...this.stack].reverse()) surface.close();
    this.disconnect();
    this.stopGesture();
    this.focus.setConstraint();
  }
}

/** Retained logical state; visual nodes and listeners exist only while open. */
export function createOverlay(options: OverlayOptions): OverlayState {
  const manager = useContext(OverlayContext);
  if (!manager) throw new Error('createOverlay requires an OverlayHost.');
  const owner = getOwner();
  const [open, changeOpen] = createControllableState({
    get value() {
      return options.open;
    },
    defaultValue: options.defaultOpen ?? false,
    onChange: (value) => options.onOpenChange?.(value),
  });
  const [ready, setReady] = createState(false);
  const [error, setError] = createState<unknown>();
  const [position, setPosition] = createState<OverlayPosition>();
  const [element, setElement] = createState<HTMLElement>();
  let disposed = false;
  let closeSurface = () => {};
  let update = () => {};
  let stop = () => {};
  const state: OverlayState = {
    open,
    ready,
    error,
    position,
    element,
    setOpen(value) {
      if (!disposed) changeOpen(value);
    },
    updatePosition() {
      update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        stop();
      } finally {
        closeSurface();
      }
    },
  };
  function start() {
    if (typeof manager.doc.documentElement.showPopover !== 'function')
      throw new Error('OverlayHost requires the browser Popover API.');
    const controller = new AbortController();
    const shell = manager.doc.createElement('div');
    shell.popover = 'manual';
    shell.dataset.piantOverlay = '';
    shell.style.cssText =
      'position:fixed;inset:0;margin:0;padding:0;border:0;width:100%;height:100%;background:transparent;overflow:visible;pointer-events:none;';
    const style = manager.doc.createElement('style');
    style.textContent =
      '[data-piant-overlay]::backdrop{background:transparent;pointer-events:none}';
    const blocker = manager.doc.createElement('div');
    blocker.style.cssText =
      'position:fixed;pointer-events:auto;background:rgb(0 0 0 / 30%);';
    const content = manager.doc.createElement('div');
    content.dataset.piantOverlaySurface = '';
    content.tabIndex = -1;
    content.style.cssText =
      'position:fixed;pointer-events:auto;overflow:hidden;outline:none;';
    shell.append(style, blocker, content);
    manager.doc.body.append(shell);
    let instance: MountedApp | undefined;
    let closed = false;
    let last = '';
    let lastSize = '';
    let stopContent = () => {};
    let contentOwner = owner;
    runWithOwner(owner, () =>
      root((dispose) => {
        stopContent = dispose;
        contentOwner = getOwner();
      }),
    );
    const previousFocus = manager.doc.activeElement as HTMLElement | null;
    function requestDismiss(reason: OverlayDismissReason, event?: Event) {
      if (!closed && options.onDismiss?.(reason, event) !== false)
        state.setOpen(false);
    }
    function close() {
      if (closed) return;
      const hadFocus = content.contains(manager.doc.activeElement);
      closed = true;
      controller.abort();
      // Remove DOM before restoring focus; detached entries are unavailable.
      let failure: unknown;
      let failed = false;
      for (const task of [
        () => shell.remove(),
        () => instance?.destroy(),
        stopContent,
        () => manager.remove(surface, hadFocus),
        () => setReady(false),
        () => setElement(undefined),
        () => setPosition(undefined),
      ]) {
        try {
          task();
        } catch (cause) {
          if (!failed) failure = cause;
          failed = true;
        }
      }
      update = () => {};
      if (failed) {
        setError(failure);
        options.onError?.(failure);
      }
    }
    function layout() {
      if (closed) return;
      const anchor = options.anchor;
      const anchorElement =
        anchor instanceof HTMLElement ? anchor : anchor?.element;
      if (
        anchorElement &&
        (!visible(anchorElement, false) ||
          (anchor && !(anchor instanceof HTMLElement) && !anchor.available))
      ) {
        // Hidden/removed triggers cannot keep stale visual/context resources alive,
        // even when a controlled caller rejects the close request.
        requestDismiss('anchor-removed');
        close();
        return;
      }
      const vv = manager.win.visualViewport;
      const bounds = {
        x: vv?.offsetLeft ?? 0,
        y: vv?.offsetTop ?? 0,
        width: vv?.width ?? manager.win.innerWidth,
        height: vv?.height ?? manager.win.innerHeight,
      };
      const target = viewportRect(manager.target);
      const rect = anchorElement ? viewportRect(anchorElement) : undefined;
      const width = options.width;
      const height = options.height;
      if (
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(height) ||
        height <= 0
      )
        throw new RangeError(
          'Overlay width and height must be positive finite numbers.',
        );
      const signature = JSON.stringify([
        rect,
        target,
        bounds,
        width,
        height,
        options.placement,
        options.gap,
        options.padding,
        options.flip,
        options.shift,
        options.modal,
      ]);
      if (signature === last) return;
      last = signature;
      let next: OverlayPosition;
      let w: number;
      let h: number;
      if (rect) {
        const measured = computeOverlayPosition(
          rect,
          { width, height },
          bounds,
          options,
        );
        w = Math.max(1, Math.min(width, measured.availableWidth));
        h = Math.max(1, Math.min(height, measured.availableHeight));
        next = computeOverlayPosition(rect, { width: w, height: h }, bounds, {
          placement: measured.placement,
          flip: false,
          shift: options.shift,
          gap: options.gap,
          padding: options.padding,
        });
      } else {
        const padding = options.padding ?? 8;
        w = Math.max(1, Math.min(width, bounds.width - padding * 2));
        h = Math.max(1, Math.min(height, bounds.height - padding * 2));
        const x = Math.max(
          bounds.x + padding,
          Math.min(
            target.x + (target.width - w) / 2,
            bounds.x + bounds.width - w - padding,
          ),
        );
        const y = Math.max(
          bounds.y + padding,
          Math.min(
            target.y + (target.height - h) / 2,
            bounds.y + bounds.height - h - padding,
          ),
        );
        next = {
          x,
          y,
          placement: 'bottom',
          availableWidth: bounds.width - padding * 2,
          availableHeight: bounds.height - padding * 2,
        };
      }
      content.style.left = `${next.x}px`;
      content.style.top = `${next.y}px`;
      content.style.width = `${w}px`;
      content.style.height = `${h}px`;
      blocker.hidden = !options.modal;
      blocker.style.left = `${target.x}px`;
      blocker.style.top = `${target.y}px`;
      blocker.style.width = `${target.width}px`;
      blocker.style.height = `${target.height}px`;
      const size = `${w},${h}`;
      if (lastSize !== size) {
        lastSize = size;
        instance?.resize(w, h);
      }
      manager.syncConstraint();
      setPosition(next);
    }
    const safeLayout = () => {
      try {
        layout();
      } catch (cause) {
        close();
        setError(cause);
        options.onError?.(cause);
      }
    };
    const surface: Surface = {
      shell,
      blocker,
      content,
      state,
      options,
      previousFocus,
      requestDismiss,
      update: safeLayout,
      close,
    };
    closeSurface = close;
    update = () => {
      last = '';
      safeLayout();
    };
    try {
      shell.showPopover();
      manager.add(surface);
      layout();
      if (closed) return;
      setElement(content);
      void mount(
        () => runWithOwner(contentOwner, () => options.children(state)),
        content,
        { signal: controller.signal },
      )
        .then((mounted) => {
          if (closed) {
            mounted.destroy();
            return;
          }
          instance = mounted;
          update();
          if (closed) return;
          // DOMPipe attaches native semantics on the first render. Publish ready
          // last: consumers may synchronously close the surface when it changes.
          instance.app.render();
          if (closed) return;
          manager.focus.refresh();
          if (closed) return;
          if (
            manager.stack.at(-1) === surface &&
            (options.autoFocus ?? options.modal)
          )
            manager.focusSurface();
          if (!closed) setReady(true);
        })
        .catch((cause: unknown) => {
          if (closed) return;
          close();
          setError(cause);
          options.onError?.(cause);
        });
    } catch (cause) {
      close();
      throw cause;
    }
  }
  stop = root((dispose) => {
    createEffect(() => {
      if (!open() || disposed) return;
      untrack(() => {
        setError(undefined);
        try {
          start();
        } catch (cause) {
          setError(cause);
          options.onError?.(cause);
        }
      });
      onCleanup(() => closeSurface());
    });
    // Options update positioning and the modal constraint without remounting content.
    createEffect(() => {
      void options.width;
      void options.height;
      void options.anchor;
      void options.placement;
      void options.gap;
      void options.padding;
      void options.flip;
      void options.shift;
      void options.modal;
      untrack(() => state.updatePosition());
    });
    return dispose;
  });
  onCleanup(() => state.dispose());
  return state;
}
