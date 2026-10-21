import { Button, MainPanel, ThemeContextProvider } from '@tanstack/devtools-ui';
import { createComponent, createSignal } from 'solid-js';
import { insert, render } from 'solid-js/web';
import { createInspector } from './inspector';
import { panelStyles } from './panelStyles';
import type { DevtoolsSnapshot } from './types';

type Theme = 'dark' | 'light';
const storageKey = 'piant-devtools-panel:v1';

/** A single Piant dock, composed with TanStack's UI primitives. */
export function createPanel(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  disconnect: () => void,
  onActiveChange: (active: boolean) => void,
  defaultOpen = true,
) {
  const doc = mount.ownerDocument;
  const view = doc.defaultView;
  let height = 400;
  let initialTheme: Theme = 'dark';
  try {
    const stored = JSON.parse(view?.localStorage.getItem(storageKey) ?? 'null');
    if (stored && typeof stored === 'object') {
      if (Number.isFinite(stored.height) && stored.height > 0)
        height = stored.height;
      if (stored.theme === 'light' || stored.theme === 'dark')
        initialTheme = stored.theme;
    }
  } catch {
    // Storage is optional, including in sandboxed or privacy-restricted pages.
  }
  const [theme, setTheme] = createSignal<Theme>(initialTheme);
  const host = doc.createElement('div');
  host.dataset.piantDevtoolsHost = '';
  const style = doc.createElement('style');
  style.textContent = panelStyles;
  const panel = doc.createElement('section');
  panel.dataset.piantDevtoolsPanel = '';
  panel.setAttribute('aria-label', 'Piant DevTools panel');
  const resize = doc.createElement('div');
  resize.className = 'piant-resize';
  resize.tabIndex = 0;
  resize.setAttribute('role', 'separator');
  resize.setAttribute('aria-label', 'Resize Piant DevTools panel');
  resize.setAttribute('aria-orientation', 'horizontal');
  const content = doc.createElement('div');
  content.className = 'piant-inspector-mount';
  let removed = false;
  let open = defaultOpen;
  let started = false;
  let launcher: HTMLButtonElement | undefined;
  let drag: { id: number; y: number; height: number } | undefined;
  const persist = () => {
    try {
      view?.localStorage.setItem(
        storageKey,
        JSON.stringify({ height, theme: theme() }),
      );
    } catch {
      // Inspection and resizing also work without persistent storage.
    }
  };
  const bounds = () => {
    const max = Math.max(1, (view?.innerHeight ?? 768) - 24);
    return { min: Math.min(180, max), max };
  };
  const setHeight = (value: number, save = true) => {
    const { min, max } = bounds();
    height = Math.round(Math.min(max, Math.max(min, value)));
    panel.style.height = `${height}px`;
    resize.setAttribute('aria-valuemin', String(min));
    resize.setAttribute('aria-valuemax', String(max));
    resize.setAttribute('aria-valuenow', String(height));
    if (save) persist();
  };
  const setOpen = (value: boolean) => {
    if (removed || open === value) return;
    open = value;
    panel.hidden = !open;
    if (launcher) launcher.hidden = open;
    if (started) onActiveChange(open);
    if (open) {
      inspector.host.shadowRoot
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus();
    } else launcher?.focus();
  };
  const toggleTheme = () => {
    if (removed) return;
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    inspector.host.dataset.theme = next;
    persist();
  };
  const inspector = createInspector(content, select, refresh, disconnect, {
    collapse: () => setOpen(false),
    toggleTheme,
  });
  inspector.host.dataset.theme = initialTheme;
  panel.hidden = !open;
  host.append(style, panel);
  mount.append(host);
  const dispose = render(
    () =>
      createComponent(ThemeContextProvider, {
        get theme() {
          return theme();
        },
        get children() {
          const surface = createComponent(MainPanel, {
            className: 'piant-panel-content',
            withPadding: false,
            children: content,
          });
          // MainPanel intentionally forwards only styling and children.
          insert(panel, surface);
          panel.append(resize);
          return createComponent(Button, {
            type: 'button',
            className: 'piant-launcher',
            'aria-label': 'Open Piant DevTools',
            get hidden() {
              return open;
            },
            onClick: () => setOpen(true),
            ref(element: HTMLButtonElement) {
              launcher = element;
            },
            children: 'Piant DevTools',
          });
        },
      }),
    host,
  );
  setHeight(height, false);

  const stopDrag = () => {
    const previous = drag;
    drag = undefined;
    if (previous && resize.hasPointerCapture?.(previous.id))
      resize.releasePointerCapture(previous.id);
    view?.removeEventListener('pointermove', pointerMove);
    view?.removeEventListener('pointerup', pointerEnd);
    view?.removeEventListener('pointercancel', pointerEnd);
  };
  const pointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault();
    setHeight(drag.height + drag.y - event.clientY, false);
  };
  const pointerEnd = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    stopDrag();
    persist();
  };
  const pointerStart = (event: PointerEvent) => {
    if (removed || event.button !== 0) return;
    event.preventDefault();
    stopDrag();
    drag = { id: event.pointerId, y: event.clientY, height };
    resize.setPointerCapture?.(event.pointerId);
    view?.addEventListener('pointermove', pointerMove);
    view?.addEventListener('pointerup', pointerEnd);
    view?.addEventListener('pointercancel', pointerEnd);
  };
  const keyResize = (event: KeyboardEvent) => {
    if (removed) return;
    const { min, max } = bounds();
    const next = {
      ArrowUp: height + 24,
      ArrowDown: height - 24,
      Home: min,
      End: max,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setHeight(next);
  };
  const viewportResize = () => setHeight(height);
  resize.addEventListener('pointerdown', pointerStart);
  resize.addEventListener('lostpointercapture', pointerEnd);
  resize.addEventListener('keydown', keyResize);
  view?.addEventListener('resize', viewportResize);
  queueMicrotask(() => {
    if (removed) return;
    started = true;
    onActiveChange(open);
  });
  return {
    render(value: DevtoolsSnapshot) {
      if (!removed) inspector.render(value);
    },
    remove() {
      if (removed) return;
      removed = true;
      stopDrag();
      resize.removeEventListener('pointerdown', pointerStart);
      resize.removeEventListener('lostpointercapture', pointerEnd);
      resize.removeEventListener('keydown', keyResize);
      view?.removeEventListener('resize', viewportResize);
      try {
        onActiveChange(false);
      } finally {
        inspector.remove();
        dispose();
        host.remove();
      }
    },
  };
}
