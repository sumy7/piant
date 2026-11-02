import {
  attachDOMElement,
  createContext,
  createEffect,
  createMemo,
  createState,
  For,
  type Getter,
  isComposingInput,
  mergeProps,
  onCleanup,
  onTick,
  type PixiEventHandler,
  type PNode,
  type PScrollView,
  ScrollView,
  type StyleValue,
  Text,
  untrack,
  useContext,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../../primitives/createControllableState';
import {
  createFocusable,
  type FocusableState,
} from '../../primitives/createFocusable';
import { createPressable } from '../../primitives/createPressable';
import { getFocusScope } from '../../primitives/focusScope';
import { createOverlay } from '../../primitives/OverlayHost';
import type { OverlayPositionOptions } from '../../primitives/overlayPosition';
import { useUITheme } from '../../theme/UIProvider';
import type { ButtonPressEvent, ButtonProps } from '../Button';
import type { MenuItemProps, MenuProps } from '../Menu';
import type { SelectProps, SelectTriggerProps } from '../Select';
import { createTriggerSlot } from './anchoredTrigger';
import { componentRoot } from './componentRoot';
import { compositeId } from './compositeParts';
import { type ButtonSemantics, createButton } from './createButton';

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}
export type ChoiceSelectEvent = ButtonPressEvent | KeyboardEvent;
export interface ChoiceContentProps extends OverlayPositionOptions {
  width?: number;
  height?: number;
  /** Omit for automatic keyed items. Custom content contains matching Item parts. */
  children?: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}
type Kind = 'menu' | 'select';
type Pointer = Parameters<PixiEventHandler<PNode, 'pointermove'>>[0];
interface Row {
  key: string;
  id: string;
  node: PNode;
  element: HTMLDivElement;
  props: MenuItemProps;
  signature: string;
}
interface ListMount {
  scroll: PScrollView;
  element: HTMLDivElement;
  focus?: FocusableState;
  reveal: boolean;
  sync(): void;
}
interface ChoiceScope {
  kind: Kind;
  id: string;
  label: Getter<string>;
  options: Getter<readonly ChoiceOption[]>;
  option(key: string): ChoiceOption | undefined;
  disabled: Getter<boolean>;
  open: Getter<boolean>;
  setOpen(value: boolean): void;
  value: Getter<string | null>;
  display: Getter<string>;
  active: Getter<string | null>;
  activeId: Getter<string | undefined>;
  setActiveId(value: string | undefined): void;
  error: Getter<unknown>;
  fail(error: unknown): void;
  trigger: ReturnType<typeof createTriggerSlot>;
  rows: Map<string, Row>;
  revision: Getter<number>;
  bump(): void;
  order(): Row[];
  setActive(key: string | null): void;
  openWith(edge?: 'first' | 'last' | 'selected'): void;
  initialize(): void;
  navigate(event: KeyboardEvent): void;
  search(key: string): void;
  activate(key: string, event: ChoiceSelectEvent): void;
  pointer(row: Row, event: Pointer): void;
  clear(): void;
  mounted?: ListMount;
  ready: Getter<boolean>;
  setReady(value: boolean): void;
  disposed: boolean;
  content: boolean;
}
const ChoiceContext = createContext<ChoiceScope>();
function context(kind: Kind) {
  const scope = useContext(ChoiceContext);
  if (!scope || scope.kind !== kind)
    throw new Error(`${kind} parts require their matching root.`);
  return scope;
}
function normalized(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase();
}
function printable(event: KeyboardEvent) {
  return (
    Array.from(event.key).length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !isComposingInput(event)
  );
}
function validate(options: readonly ChoiceOption[], label: string) {
  if (!label) throw new Error('Menu and Select require a non-empty label.');
  const values = new Set<string>();
  for (const option of options) {
    if (
      typeof option.value !== 'string' ||
      !option.value.trim() ||
      values.has(option.value)
    )
      throw new Error('Choice values must be non-empty and unique.');
    if (typeof option.label !== 'string' || !option.label.trim())
      throw new Error('Choice labels must be non-empty strings.');
    values.add(option.value);
  }
}
export function choiceRoot(
  kind: Kind,
  props: MenuProps | SelectProps,
): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    const focus = getFocusScope();
    const [failure, setFailure] = createState<unknown>();
    const [dataError, setDataError] = createState<unknown>();
    const label = () => props.label?.trim() ?? '';
    const options = createMemo<readonly ChoiceOption[]>(() => {
      try {
        const list =
          kind === 'menu'
            ? (props as MenuProps).items
            : (props as SelectProps).options;
        validate(list, label());
        setDataError(undefined);
        return list;
      } catch (error) {
        setDataError(error);
        return [];
      }
    }, []);
    const [open, changeOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (value) => props.onOpenChange?.(value),
    });
    const [value, changeValue] = createControllableState<string | null>({
      get value() {
        return kind === 'select' ? (props as SelectProps).value : null;
      },
      defaultValue:
        kind === 'select'
          ? ((props as SelectProps).defaultValue ?? null)
          : null,
      onChange: (next) => {
        if (kind === 'select') (props as SelectProps).onValueChange?.(next);
      },
    });
    const [active, setActive] = createState<string | null>(null);
    const [activeId, setActiveId] = createState<string>();
    const [ready, setReady] = createState(false);
    const [revision, setRevision] = createState(0);
    let edge: 'first' | 'last' | 'selected' = 'selected';
    let buffer = '';
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    let pointerPosition: string | undefined;
    let previousOrder: string[] = [];
    const clearSearch = () => {
      clearTimeout(searchTimer);
      searchTimer = undefined;
      buffer = '';
    };
    const scope: ChoiceScope = {
      kind,
      id: compositeId(kind),
      label,
      options,
      option: (key) => options().find((option) => option.value === key),
      disabled: () =>
        Boolean(
          props.disabled || failure() || dataError() || options().length === 0,
        ),
      open,
      setOpen(next) {
        if (!scope.disposed) changeOpen(next);
      },
      value,
      display: () =>
        options().find((option) => option.value === value())?.label ??
        (kind === 'select'
          ? ((props as SelectProps).placeholder ?? 'Select an option')
          : label()),
      active,
      activeId,
      setActiveId,
      error: () => failure() ?? dataError(),
      fail(error) {
        if (!scope.disposed) {
          setFailure(error);
          scope.setOpen(false);
        }
      },
      trigger: createTriggerSlot(() => scope.setOpen(false)),
      rows: new Map(),
      revision,
      bump() {
        untrack(() => setRevision((next) => next + 1));
      },
      order() {
        revision();
        return options()
          .map((option) => scope.rows.get(option.value))
          .filter((row): row is Row =>
            Boolean(row && !row.node.isDestroyed && row.node.isVisible),
          );
      },
      setActive(key) {
        if (scope.disposed) return;
        if (active() !== key) setActive(key);
        if (scope.mounted) {
          scope.mounted.reveal = true;
          scope.mounted.sync();
        }
      },
      openWith(next = 'selected') {
        if (scope.disabled()) return;
        edge = next;
        scope.setOpen(true);
        if (scope.ready()) {
          scope.initialize();
          if (kind === 'menu') scope.mounted?.focus?.focus();
        }
      },
      initialize() {
        const list = scope.order();
        const selected =
          kind === 'select'
            ? list.find((row) => row.key === value())
            : undefined;
        const target = selected ?? (edge === 'last' ? list.at(-1) : list[0]);
        scope.setActive(target?.key ?? null);
        if (buffer) scope.search('');
      },
      navigate(event) {
        if (
          isComposingInput(event) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          !scope.ready()
        )
          return;
        const list = scope.order();
        let index = list.findIndex((row) => row.key === active());
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          index =
            index < 0
              ? direction > 0
                ? 0
                : list.length - 1
              : index + direction;
          index =
            kind === 'menu'
              ? (index + list.length) % list.length
              : Math.max(0, Math.min(list.length - 1, index));
        } else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = list.length - 1;
        else if (event.key === 'Enter' || event.key === ' ') {
          if (!event.repeat && active() !== null)
            scope.activate(active()!, event);
          event.preventDefault();
          return;
        } else if (printable(event)) {
          event.preventDefault();
          scope.search(event.key);
          return;
        } else return;
        event.preventDefault();
        clearSearch();
        scope.setActive(list[index]?.key ?? null);
      },
      search(key) {
        if (scope.disposed) return;
        clearTimeout(searchTimer);
        buffer += normalized(key);
        searchTimer = setTimeout(() => {
          buffer = '';
          searchTimer = undefined;
        }, 700);
        const chars = Array.from(buffer);
        const repeated =
          chars.length > 1 && chars.every((char) => char === chars[0]);
        const query = repeated ? chars[0] : buffer;
        if (!query) return;
        const list = scope.order();
        const current = list.findIndex((row) => row.key === active());
        // A growing multi-character prefix includes the currently matched item.
        const offset = query.length > 1 ? 0 : 1;
        for (let count = 0; count < list.length; count++) {
          const row =
            list[
              (Math.max(-1, current) + offset + count + list.length) %
                list.length
            ];
          if (
            normalized(scope.option(row.key)?.label ?? '').startsWith(query)
          ) {
            scope.setActive(row.key);
            break;
          }
        }
      },
      activate(key, event) {
        const row = scope.rows.get(key);
        if (
          !scope.ready() ||
          scope.disabled() ||
          !row ||
          row.node.isDestroyed ||
          !scope.option(key) ||
          scope.option(key)?.disabled
        )
          return;
        const ownerElement =
          kind === 'select'
            ? scope.trigger.current()?.element
            : scope.mounted?.element;
        if (!ownerElement || !focus.allows(ownerElement)) return;
        row.props.onSelect?.(event);
        if (
          event.defaultPrevented ||
          scope.disposed ||
          row.node.isDestroyed ||
          !scope.option(key) ||
          scope.option(key)?.disabled
        )
          return;
        if (kind === 'menu') (props as MenuProps).onAction?.(key, event);
        else changeValue(key);
        if (!event.defaultPrevented && !scope.disposed && !row.node.isDestroyed)
          scope.setOpen(false);
      },
      pointer(row, event) {
        if (!scope.ready() || scope.disabled() || event.isPrimary === false)
          return;
        const point = `${event.global.x},${event.global.y}`;
        if (point === pointerPosition) return;
        pointerPosition = point;
        clearSearch();
        scope.setActive(row.key);
      },
      clear() {
        clearSearch();
        pointerPosition = undefined;
        setActive(null);
        setActiveId(undefined);
        previousOrder = [];
      },
      ready,
      setReady,
      disposed: false,
      content: false,
    };
    onCleanup(() => {
      scope.disposed = true;
      clearSearch();
    });
    createEffect(() => {
      if (!open())
        untrack(() => {
          edge = 'selected';
          scope.clear();
        });
    });
    createEffect(() => {
      const list = options();
      void dataError();
      void revision();
      const keys = list.map((option) => option.value);
      const current = active();
      if (scope.ready() && current !== null && !keys.includes(current)) {
        const index = previousOrder.indexOf(current);
        untrack(() =>
          scope.setActive(
            keys[Math.min(Math.max(index, 0), keys.length - 1)] ?? null,
          ),
        );
      }
      previousOrder = keys;
    });
    return View({
      get style(): StyleValue<ViewStyles> {
        return [{ flexDirection: 'column', minWidth: 0 }, props.style];
      },
      children: ChoiceContext.Provider({
        value: scope,
        children: () => createMemo(() => untrack(() => props.children())),
      }),
    }) as PNode;
  }, props.ref);
}
export function choiceTrigger(
  kind: Kind,
  props: ButtonProps | SelectTriggerProps,
): ReturnType<typeof View> {
  const scope = context(kind);
  return componentRoot(() => {
    const semantics: ButtonSemantics = {
      role: kind === 'select' ? 'combobox' : 'button',
      hasPopup: kind === 'select' ? 'listbox' : 'menu',
      get expanded() {
        return scope.open() && Boolean(scope.trigger.current()?.available());
      },
      get controls() {
        return scope.ready() ? scope.id : undefined;
      },
      get activeDescendant() {
        return kind === 'select' && scope.ready()
          ? scope.activeId()
          : undefined;
      },
      onKeyDown(event) {
        if (
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          isComposingInput(event)
        )
          return;
        if (kind === 'select' && scope.open() && scope.ready()) {
          scope.navigate(event);
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          scope.openWith(event.key === 'ArrowUp' ? 'last' : 'first');
        } else if (kind === 'select' && printable(event) && event.key !== ' ') {
          event.preventDefault();
          scope.search(event.key);
          scope.openWith();
        }
      },
    };
    const node = createButton(
      mergeProps(
        props,
        kind === 'select'
          ? {
              get name() {
                return scope.label();
              },
              get children() {
                return `${scope.label()}: ${scope.display()} ▾`;
              },
            }
          : {},
        {
          ref: undefined,
          get disabled() {
            return scope.disabled() || props.disabled;
          },
          onPress(event: ButtonPressEvent, target: PNode) {
            props.onPress?.(event, target);
            if (
              !event.defaultPrevented &&
              !scope.disposed &&
              !node.isDestroyed
            ) {
              if (scope.open()) scope.setOpen(false);
              else scope.openWith();
            }
          },
        },
      ) as ButtonProps,
      false,
      semantics,
    ) as PNode;
    scope.trigger.bind(node, () =>
      Boolean(scope.disabled() || props.disabled || props.loading),
    );
    if (kind === 'select')
      createEffect(() => {
        const element = scope.trigger.current()?.element;
        if (element) element.textContent = scope.display();
      });
    return node;
  }, props.ref);
}

export function choiceItem(
  kind: Kind,
  props: MenuItemProps,
): ReturnType<typeof View> {
  const scope = context(kind);
  const focus = getFocusScope();
  const theme = useUITheme();
  return componentRoot(() => {
    const key = props.value;
    if (!scope.option(key) || scope.rows.has(key)) {
      scope.fail(new Error('Item values must match unique root options.'));
      return View({ style: { display: 'none' } }) as PNode;
    }
    const node = View({
      get style(): StyleValue<ViewStyles> {
        const t = theme();
        const option = scope.option(key);
        const active = scope.active() === key;
        return [
          {
            width: '100%',
            minWidth: 0,
            flexShrink: 0,
            minHeight: t.controlSize.md,
            paddingInline: t.spacing.md,
            paddingBlock: t.spacing.xs,
            alignItems: 'center',
            flexDirection: 'row',
            borderWidth: 2,
            borderColor: active ? t.colors.focusRing : 'transparent',
            backgroundColor: active ? t.colors.primary : undefined,
            borderRadius: t.radius.sm,
            opacity: option?.disabled ? 0.5 : 1,
          },
          props.style,
          { display: option ? 'flex' : 'none' },
        ];
      },
      children: Text({
        get style() {
          const t = theme();
          return [
            {
              fontFamily: t.typography.fontFamily,
              fontSize: t.typography.fontSize,
              lineHeight: t.typography.lineHeight,
              color:
                scope.active() === key ? t.colors.onPrimary : t.colors.text,
              minWidth: 0,
              flexShrink: 1,
            },
            props.textStyle,
          ];
        },
        get children() {
          const label = scope.option(key)?.label ?? '';
          return kind === 'select' && scope.value() === key
            ? `✓ ${label}`
            : label;
        },
      }),
    }) as PNode;
    const element = document.createElement('div');
    element.style.cssText =
      'position:absolute;pointer-events:none;overflow:hidden;';
    const row: Row = {
      key,
      id: compositeId(`${kind}-item`),
      node,
      element,
      props,
      signature: '',
    };
    element.id = row.id;
    element.setAttribute('role', kind === 'select' ? 'option' : 'menuitem');
    const click = (event: MouseEvent) => scope.activate(key, event);
    element.addEventListener('click', click);
    scope.rows.set(key, row);
    scope.bump();
    const move = (event: Pointer) => scope.pointer(row, event);
    const down = (event: Pointer) => {
      if (event.button !== 0 || event.isPrimary === false || !scope.ready())
        return;
      const owner =
        kind === 'select'
          ? scope.trigger.current()?.element
          : scope.mounted?.element;
      if (!owner || !focus.allows(owner)) return;
      owner.focus({ preventScroll: true });
      // Retain the semantic owner through the canvas mousedown default,
      // including when a controlled caller keeps this popup open.
      event.preventDefault();
    };
    node._view.on('pointermove', move);
    node._view.on('pointerenter', move);
    node._view.on('pointerdown', down);
    createPressable(node, {
      get disabled() {
        return (
          scope.disabled() || !scope.option(key) || scope.option(key)?.disabled
        );
      },
      onPress: (event) => scope.activate(key, event),
    });
    onCleanup(() => {
      element.removeEventListener('click', click);
      element.remove();
      node._view.off('pointermove', move);
      node._view.off('pointerenter', move);
      node._view.off('pointerdown', down);
      if (scope.rows.get(key) === row) {
        scope.rows.delete(key);
        scope.bump();
      }
    });
    return node;
  }, props.ref);
}

function offset(row: PNode, scroll: PScrollView) {
  let x = 0;
  let y = 0;
  for (
    let current: PNode | null = row;
    current && current !== scroll.scrollContent;
    current = current.parentNode
  ) {
    if (current.isDestroyed) return undefined;
    x += current._layoutNode.getComputedLeft();
    y += current._layoutNode.getComputedTop();
    if (current.parentNode === scroll.scrollContent) return { x, y };
  }
}
export function choiceContent(
  kind: Kind,
  props: ChoiceContentProps,
): ReturnType<typeof View> {
  const scope = context(kind);
  const theme = useUITheme();
  return componentRoot(() => {
    if (scope.content) throw new Error(`${kind} supports one Content.`);
    scope.content = true;
    onCleanup(() => {
      scope.content = false;
    });
    const overlay = createOverlay({
      get open() {
        return (
          scope.open() &&
          !scope.disabled() &&
          Boolean(scope.trigger.current()?.available())
        );
      },
      onOpenChange: scope.setOpen,
      get anchor() {
        return scope.trigger.current()?.anchor;
      },
      anchorIsInside: true,
      get width() {
        return props.width ?? (kind === 'menu' ? 240 : 280);
      },
      get height() {
        return props.height ?? 280;
      },
      get placement() {
        return props.placement;
      },
      get gap() {
        return props.gap;
      },
      get padding() {
        return props.padding;
      },
      get flip() {
        return props.flip;
      },
      get shift() {
        return props.shift;
      },
      modal: false,
      autoFocus: kind === 'menu',
      initialFocus: () => scope.mounted?.element,
      outsidePointer: 'dismiss-and-block',
      dismissOnFocusOutside: true,
      get tabAnchor() {
        return scope.trigger.current()?.element;
      },
      onDismiss(reason, event) {
        if (reason === 'anchor-removed') {
          scope.trigger.current()?.invalidate();
          return false;
        }
        if (
          reason === 'focus-outside' &&
          event?.type === 'focusin' &&
          event?.target === scope.trigger.current()?.element
        )
          return false;
      },
      onError: (error) => props.onError?.(error),
      children: () => {
        let disposed = false;
        onCleanup(() => {
          disposed = true;
          scope.setReady(false);
          scope.mounted = undefined;
          scope.clear();
        });
        const scroller = ScrollView({
          style: { flex: 1, minHeight: 0, width: '100%' },
          children: View({
            style: { flexDirection: 'column', width: '100%', minWidth: 0 },
            children: createMemo(() =>
              untrack(
                () =>
                  props.children?.() ??
                  For({
                    get each() {
                      return scope.options().map((option) => option.value);
                    },
                    children: (key: string) => choiceItem(kind, { value: key }),
                  }),
              ),
            ) as JSX.Element,
          }),
        });
        const element = document.createElement('div');
        element.id = scope.id;
        element.style.cssText =
          'opacity:0;pointer-events:none;overflow:hidden;';
        element.setAttribute('role', kind === 'menu' ? 'menu' : 'listbox');
        const binding = attachDOMElement(scroller, element);
        const mounted: ListMount = {
          scroll: scroller,
          element,
          reveal: true,
          sync() {
            if (disposed || scroller.isDestroyed) return;
            const list = scope.order();
            const active = list.find((row) => row.key === scope.active());
            const height =
              scroller.scrollContentHolder._layoutNode.getComputedHeight();
            if (
              mounted.reveal &&
              active &&
              height > 0 &&
              active.node._layoutNode.getComputedHeight() > 0
            ) {
              scroller.scrollIntoView(active.node, { block: 'nearest' });
              scroller.update();
              mounted.reveal = false;
            }
            for (const row of scope.rows.values()) {
              if (row.node.isDestroyed) continue;
              const index = list.indexOf(row);
              const point = offset(row.node, scroller);
              row.element.hidden = index < 0 || !point;
              if (index < 0 || !point) continue;
              const option = scope.option(row.key)!;
              const width = row.node._layoutNode.getComputedWidth();
              const rowHeight = row.node._layoutNode.getComputedHeight();
              const y = point.y + scroller.scrollY;
              const signature = JSON.stringify([
                index,
                list.length,
                option.label,
                option.disabled,
                scope.value() === row.key,
                point.x,
                y,
                width,
                rowHeight,
              ]);
              if (signature !== row.signature) {
                row.signature = signature;
                row.element.textContent = option.label;
                row.element.setAttribute('aria-posinset', String(index + 1));
                row.element.setAttribute('aria-setsize', String(list.length));
                row.element.setAttribute(
                  'aria-disabled',
                  String(Boolean(option.disabled)),
                );
                if (kind === 'select')
                  row.element.setAttribute(
                    'aria-selected',
                    String(scope.value() === row.key),
                  );
                row.element.style.left = `${point.x}px`;
                row.element.style.top = `${y}px`;
                row.element.style.width = `${width}px`;
                row.element.style.height = `${rowHeight}px`;
              }
              // Appending in list order also repairs semantic order after keyed moves.
              if (element.children[index] !== row.element)
                element.insertBefore(
                  row.element,
                  element.children[index] ?? null,
                );
            }
            const point = active && offset(active.node, scroller);
            const activeY = point ? point.y + scroller.scrollY : 0;
            scope.setActiveId(
              active &&
                point &&
                active.element.isConnected &&
                activeY < height &&
                activeY + active.node._layoutNode.getComputedHeight() > 0
                ? active.id
                : undefined,
            );
          },
        };
        scope.mounted = mounted;
        if (kind === 'menu')
          mounted.focus = createFocusable(scroller, {
            domElement: binding,
            role: 'menu',
            get name() {
              return scope.label();
            },
            get activeDescendant() {
              return scope.activeId();
            },
            onKeyDown: (event) => scope.navigate(event),
          });
        createEffect(() => {
          element.setAttribute('aria-label', scope.label());
        });
        onCleanup(
          scroller.observeLayout(() => {
            mounted.reveal = true;
            mounted.sync();
          }),
        );
        onCleanup(onTick(mounted.sync));
        return View({
          ref: props.ref,
          get style(): StyleValue<ViewStyles> {
            const t = theme();
            return [
              {
                width: '100%',
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                padding: t.spacing.xs,
                flexDirection: 'column',
                borderWidth: 1,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.surfaceRaised,
                borderColor: t.colors.border,
              },
              props.style,
            ];
          },
          children: scroller,
        });
      },
    });
    createEffect(() => {
      const ready = overlay.ready();
      scope.setReady(ready);
      if (ready)
        untrack(() => {
          scope.initialize();
          scope.mounted?.sync();
        });
    });
    let lastError: unknown;
    createEffect(() => {
      const error = scope.error();
      if (error && error !== lastError && !scope.disposed)
        untrack(() => {
          scope.setOpen(false);
          if (props.onError) props.onError(error);
          else console.error('[piant/ui] Invalid choice list.', error);
        });
      lastError = error;
    });
    return View({ style: { display: 'none' } }) as PNode;
  });
}
