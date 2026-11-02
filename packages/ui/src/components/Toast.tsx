import {
  acquireInteractive,
  attachDOMElement,
  createContext,
  createEffect,
  createMemo,
  createState,
  For,
  isComposingInput,
  onCleanup,
  onTick,
  type PNode,
  Show,
  type StyleValue,
  Text,
  useContext,
  View,
  type ViewStyles,
} from '@piant/core';
import { type FocusScope, getFocusScope } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { Button } from './Button';
import { componentRoot } from './internal/componentRoot';
import { createScrollableBody } from './internal/scrollBody';
import {
  createToastStore,
  type ToastController,
  type ToastRecord,
  type ToastStore,
} from './internal/toastStore';

export type {
  ToastAction,
  ToastController,
  ToastDismissReason,
  ToastInput,
  ToastRecord,
  ToastUpdate,
} from './internal/toastStore';
export interface ToastProviderProps {
  maxVisible?: number;
  /** Total visible and queued entries. New IDs are rejected at capacity. */
  maxToasts?: number;
  /** Zero (default) persists until dismissed. Configuration is read once. */
  duration?: number;
  children: () => ReturnType<typeof View>;
}
export interface ToastViewportProps {
  label?: string;
  dismissLabel?: string;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
interface ToastScope {
  store: ToastStore;
  focus: FocusScope;
  viewport: boolean;
}
const ToastContext = createContext<ToastScope>();
const providers = new WeakSet<FocusScope>();

/** A queue owned by one UIProvider focus scope, with no global DOM or timers. */
export function ToastProvider(
  props: ToastProviderProps,
): ReturnType<typeof ToastContext.Provider> {
  const focus = getFocusScope();
  if (providers.has(focus))
    throw new Error('A UIProvider focus scope supports one ToastProvider.');
  const store = createToastStore({
    maxVisible: props.maxVisible,
    maxToasts: props.maxToasts,
    duration: props.duration,
  });
  providers.add(focus);
  onCleanup(() => {
    store.dispose();
    providers.delete(focus);
  });
  return ToastContext.Provider({
    value: { store, focus, viewport: false },
    children: props.children,
  });
}
function toastScope() {
  const scope = useContext(ToastContext);
  if (!scope || scope.focus !== getFocusScope())
    throw new Error(
      'Toast requires a ToastProvider in the same UIProvider scope.',
    );
  return scope;
}
export function useToast(): ToastController {
  return toastScope().store;
}
function semanticStyle(element: HTMLElement) {
  element.style.cssText =
    'position:static;pointer-events:none;max-width:0;max-height:0;overflow:visible;opacity:0;';
}
function message(record: ToastRecord) {
  return record.description
    ? `${record.title}. ${record.description}`
    : record.title;
}
function usable(
  node: PNode,
  binding: ReturnType<typeof attachDOMElement>,
  focus: FocusScope,
) {
  if (
    node.isDestroyed ||
    focus.isDisposed ||
    !binding.visible ||
    binding.hostElement.hidden ||
    !binding.element.isConnected ||
    !focus.allows(binding.element)
  )
    return false;
  for (
    let element: HTMLElement | null = binding.element;
    element;
    element = element.parentElement
  ) {
    if (
      element.hidden ||
      element.inert ||
      element.getAttribute('aria-hidden') === 'true'
    )
      return false;
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (
      style?.display === 'none' ||
      style?.visibility === 'hidden' ||
      style?.visibility === 'collapse'
    )
      return false;
  }
  return true;
}

/** Place this in the instance's retained tree; ancestor clipping still applies. */
export function ToastViewport(
  props: ToastViewportProps,
): ReturnType<typeof View> {
  const scope = toastScope();
  const theme = useUITheme();
  return componentRoot(() => {
    if (scope.viewport)
      throw new Error('ToastProvider supports one ToastViewport.');
    scope.viewport = true;
    const store = scope.store;
    let disposed = false;
    const [ready, setReady] = createState(false);
    const rows = new Map<string, () => void>();
    const region = document.createElement('div');
    region.setAttribute('role', 'region');
    const channels = {
      polite: document.createElement('div'),
      assertive: document.createElement('div'),
    };
    for (const [priority, element] of Object.entries(channels)) {
      element.setAttribute('role', priority === 'polite' ? 'status' : 'alert');
      element.setAttribute('aria-live', priority);
      element.setAttribute('aria-atomic', 'true');
      element.style.cssText =
        'position:absolute;width:1px;height:1px;overflow:hidden;';
      region.append(element);
    }
    const seen = new Map<string, string>();
    let announceTimer: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<string>();
    createEffect(() => {
      const records = store.visible();
      const ids = new Set(store.items().map((item) => item.id));
      for (const id of seen.keys()) if (!ids.has(id)) seen.delete(id);
      if (!ready()) return;
      for (const record of records) {
        const signature = `${record.priority}\0${message(record)}`;
        if (record.priority === 'off') seen.set(record.id, signature);
        else if (seen.get(record.id) !== signature) pending.add(record.id);
      }
      // Keep the empty channels mounted before their first text mutation.
      for (const priority of ['polite', 'assertive'] as const)
        if (
          records.some(
            (record) => pending.has(record.id) && record.priority === priority,
          )
        )
          channels[priority].textContent = '';
      if (!pending.size || announceTimer !== undefined) return;
      announceTimer = setTimeout(() => {
        announceTimer = undefined;
        if (disposed || !ready()) {
          pending.clear();
          return;
        }
        const text: Record<'polite' | 'assertive', string[]> = {
          polite: [],
          assertive: [],
        };
        for (const record of store.visible()) {
          if (!pending.has(record.id)) continue;
          seen.set(record.id, `${record.priority}\0${message(record)}`);
          if (record.priority !== 'off')
            text[record.priority].push(message(record));
        }
        pending.clear();
        for (const priority of ['polite', 'assertive'] as const)
          if (text[priority].length)
            channels[priority].textContent = text[priority].join(' ');
      }, 50);
    });
    const body = createScrollableBody({
      get label() {
        return `${props.label ?? 'Notifications'} scroll area`;
      },
      children: View({
        get style(): StyleValue<ViewStyles> {
          return {
            width: '100%',
            flexDirection: 'column' as const,
            gap: theme().spacing.sm,
          };
        },
        children: For({
          get each() {
            return store.visible().map((record) => record.id);
          },
          children: (id: string) => toastCard(id, scope, props, rows),
        }),
      }) as JSX.Element,
    });
    const node = View({
      get style(): StyleValue<ViewStyles> {
        return [
          {
            width: 360,
            height: 320,
            minWidth: 0,
            minHeight: 0,
            flexDirection: 'column',
            gap: theme().spacing.sm,
          },
          props.style,
        ];
      },
      children: body,
    }) as PNode;
    createEffect(() => {
      if (!store.visible().length && !body.isDestroyed) {
        body.scrollTop();
        body.update();
      }
    });
    const binding = attachDOMElement(node, region);
    semanticStyle(region);
    scope.focus.registerRegion(node, binding);
    createEffect(() => {
      const label = props.label?.trim() ?? 'Notifications';
      if (!label) throw new Error('ToastViewport requires a non-empty label.');
      region.setAttribute('aria-label', label);
      region.setAttribute('aria-description', `${store.queuedCount()} queued`);
    });
    const doc = region.ownerDocument;
    const win = doc.defaultView!;
    const blur = () => store.setGlobalPaused('window', true);
    const focus = () => store.setGlobalPaused('window', false);
    const visibility = () => store.setGlobalPaused('document', doc.hidden);
    win.addEventListener('blur', blur);
    win.addEventListener('focus', focus);
    doc.addEventListener('visibilitychange', visibility);
    store.setGlobalPaused('window', !doc.hasFocus());
    visibility();
    onCleanup(
      onTick(() => {
        if (disposed) return;
        const active = usable(node, binding, scope.focus);
        setReady(active);
        store.setMounted(active);
        for (const sync of rows.values()) sync();
      }),
    );
    onCleanup(() => {
      disposed = true;
      scope.viewport = false;
      clearTimeout(announceTimer);
      pending.clear();
      win.removeEventListener('blur', blur);
      win.removeEventListener('focus', focus);
      doc.removeEventListener('visibilitychange', visibility);
      store.setMounted(false);
      store.setGlobalPaused('window', false);
      store.setGlobalPaused('document', false);
    });
    return node;
  }, props.ref);
}

function toastCard(
  id: string,
  scope: ToastScope,
  props: ToastViewportProps,
  rows: Map<string, () => void>,
) {
  return componentRoot(() => {
    const theme = useUITheme();
    const store = scope.store;
    const initial = store.visible().find((record) => record.id === id)!;
    // Keep callback-bearing snapshots outside core's deep observable boxes.
    const record = () =>
      store.visible().find((record) => record.id === id) ?? initial;
    let previousAction = initial.action;
    let actionRevision = 1;
    const action = createMemo(
      () => {
        const next = record().action;
        if (
          next?.label !== previousAction?.label ||
          next?.onAction !== previousAction?.onAction
        ) {
          previousAction = next;
          actionRevision++;
        }
        return next ? actionRevision : 0;
      },
      initial.action ? actionRevision : 0,
    );
    const node = View({
      get style(): StyleValue<ViewStyles> {
        const t = theme();
        return {
          width: '100%',
          minWidth: 0,
          flexShrink: 0,
          flexDirection: 'column' as const,
          gap: t.spacing.sm,
          padding: t.spacing.md,
          borderWidth: 1,
          borderRadius: t.radius.md,
          borderColor:
            record().priority === 'assertive'
              ? t.colors.danger
              : t.colors.border,
          backgroundColor: t.colors.surfaceRaised,
        };
      },
      children: [
        Text({
          get style() {
            const t = theme();
            return {
              fontFamily: t.typography.fontFamily,
              fontSize: t.typography.fontSize,
              lineHeight: t.typography.lineHeight,
              color: t.colors.text,
            };
          },
          get children() {
            return record().title;
          },
        }),
        Text({
          get style() {
            const t = theme();
            return {
              fontFamily: t.typography.fontFamily,
              fontSize: t.typography.smallFontSize,
              lineHeight: t.typography.smallLineHeight,
              color: t.colors.text,
            };
          },
          get children() {
            return record().description ?? '';
          },
        }),
        View({
          style: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
          children: [
            Show({
              get when() {
                return action();
              },
              children: (_action) =>
                Button({
                  variant: 'secondary',
                  get children() {
                    return record().action?.label ?? 'Action';
                  },
                  get name() {
                    return `${record().action?.label ?? 'Action'}: ${record().title}`;
                  },
                  onPress: (event) => store.activate(id, event),
                }),
            }),
            Button({
              variant: 'ghost',
              get children() {
                return props.dismissLabel ?? 'Dismiss';
              },
              get name() {
                return `${props.dismissLabel ?? 'Dismiss'}: ${record().title}`;
              },
              onPress: () => {
                store.close(id, 'close');
              },
            }),
          ],
        }),
      ],
    }) as PNode;
    onCleanup(acquireInteractive(node));
    const element = document.createElement('div');
    element.setAttribute('role', 'group');
    const description = document.createElement('span');
    description.style.cssText =
      'position:absolute;width:1px;height:1px;overflow:hidden;';
    element.append(description);
    const binding = attachDOMElement(node, element);
    semanticStyle(element);
    scope.focus.registerRegion(node, binding);
    createEffect(() => {
      element.setAttribute('aria-label', record().title);
      description.textContent = record().description ?? '';
    });
    let disposed = false;
    const enter = (event: { pointerType: string; isPrimary: boolean }) => {
      if (event.pointerType !== 'touch' && event.isPrimary !== false)
        store.setPaused(id, 'hover', true);
    };
    const leave = () => store.setPaused(id, 'hover', false);
    const focusIn = () => store.setPaused(id, 'focus', true);
    const focusOut = () =>
      queueMicrotask(() => {
        if (!disposed)
          store.setPaused(
            id,
            'focus',
            element.contains(element.ownerDocument.activeElement),
          );
      });
    const key = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        isComposingInput(event) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      store.close(id, 'close');
    };
    node._view.on('pointerenter', enter);
    node._view.on('pointerleave', leave);
    node._view.on('pointercancel', leave);
    element.addEventListener('focusin', focusIn);
    element.addEventListener('focusout', focusOut);
    element.addEventListener('keydown', key);
    rows.set(id, () => {
      store.setPaused(id, 'visibility', !usable(node, binding, scope.focus));
      store.setPaused(
        id,
        'focus',
        element.contains(element.ownerDocument.activeElement),
      );
    });
    onCleanup(() => {
      disposed = true;
      rows.delete(id);
      node._view.off('pointerenter', enter);
      node._view.off('pointerleave', leave);
      node._view.off('pointercancel', leave);
      element.removeEventListener('focusin', focusIn);
      element.removeEventListener('focusout', focusOut);
      element.removeEventListener('keydown', key);
      store.setPaused(id, 'hover', false);
      store.setPaused(id, 'focus', false);
      store.setPaused(id, 'visibility', false);
    });
    return node;
  });
}
