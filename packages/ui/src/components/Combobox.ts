import {
  attachDOMElement,
  createEffect,
  createMemo,
  createState,
  For,
  isComposingInput,
  onCleanup,
  onTick,
  type PInput,
  type PNode,
  ScrollView,
  type StyleValue,
  Text,
  type TextStyles,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { createPressable } from '../primitives/createPressable';
import { getFocusScope } from '../primitives/focusScope';
import { createOverlay } from '../primitives/OverlayHost';
import { createOverlayAnchor } from '../primitives/overlayAnchor';
import { useUITheme } from '../theme/UIProvider';
import { Button } from './Button';
import { componentRoot } from './internal/componentRoot';
import { compositeId } from './internal/compositeParts';
import { TextField, type TextFieldProps } from './TextField';

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}
export interface ComboboxProps {
  label: string;
  options: readonly ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default: case-insensitive NFKC substring matching against labels. */
  filter?: (option: ComboboxOption, input: string) => boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  placeholder?: string;
  emptyText?: string;
  size?: TextFieldProps['size'];
  popupWidth?: number;
  popupHeight?: number;
  inputStyle?: TextFieldProps['style'];
  style?: StyleValue<ViewStyles>;
  inputRef?: (node: PInput) => void;
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}

/** Editable, single-select local candidates. Text and committed value are independent. */
export function Combobox(props: ComboboxProps): ReturnType<typeof View> {
  const focus = getFocusScope();
  return componentRoot(() => {
    const theme = useUITheme();
    const id = compositeId('combobox-list');
    const rows = new Map<string, { node: PNode; element: HTMLDivElement }>();
    const options = createMemo(
      () => {
        if (!props.label?.trim()) throw new Error('Combobox requires a label.');
        const keys = new Set<string>();
        for (const option of props.options) {
          if (
            !option.value?.trim() ||
            keys.has(option.value) ||
            !option.label?.trim()
          )
            throw new Error(
              'Combobox options require unique non-empty values and labels.',
            );
          keys.add(option.value);
        }
        return props.options;
      },
      [] as readonly ComboboxOption[],
    );
    const [value, setValue] = createControllableState<string | null>({
      get value() {
        return props.value;
      },
      defaultValue: props.defaultValue ?? null,
      onChange: (next) => props.onValueChange?.(next),
    });
    const [input, setInput] = createControllableState({
      get value() {
        return props.inputValue;
      },
      defaultValue:
        props.defaultInputValue ??
        props.options.find((option) => option.value === value())?.label ??
        '',
      onChange: (next) => props.onInputValueChange?.(next),
    });
    const [open, setOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (next) => props.onOpenChange?.(next),
    });
    const [active, setActive] = createState<string | null>(null);
    const [inputNode, setInputNode] = createState<PInput>();
    const [activeId, setActiveId] = createState<string>();
    const [ready, setReady] = createState(false);
    const normalize = (text: string) =>
      text.normalize('NFKC').toLocaleLowerCase();
    const filtered = createMemo(
      () =>
        options().filter((option) =>
          props.filter
            ? props.filter(option, input())
            : normalize(option.label).includes(normalize(input())),
        ),
      [] as readonly ComboboxOption[],
    );
    const enabled = () => filtered().filter((option) => !option.disabled);
    const blocked = () => Boolean(props.disabled || props.readOnly);
    let disposed = false;
    let syncList = () => {};
    const select = (key: string) => {
      const node = inputNode();
      const option = filtered().find((item) => item.value === key);
      if (
        disposed ||
        blocked() ||
        !overlay.ready() ||
        !option ||
        option.disabled ||
        !node ||
        !focus.allows(node.element)
      )
        return;
      setValue(key);
      if (disposed) return;
      setInput(option.label);
      if (disposed) return;
      setOpen(false);
      if (disposed) return;
      node.focus({ preventScroll: true });
    };
    const cancel = () => {
      setOpen(false);
      setInput(
        options().find((option) => option.value === value())?.label ?? '',
      );
    };
    const inputView = TextField({
      get 'aria-label'() {
        return props.label;
      },
      get value() {
        return input();
      },
      get disabled() {
        return props.disabled;
      },
      get readOnly() {
        return props.readOnly;
      },
      get placeholder() {
        return props.placeholder;
      },
      get size() {
        return props.size;
      },
      get style() {
        return [{ flex: 1 }, props.inputStyle];
      },
      autoComplete: 'off',
      get semantics() {
        return {
          role: 'combobox' as const,
          hasPopup: 'listbox' as const,
          expanded: ready(),
          controls: ready() ? id : undefined,
          activeDescendant: ready() ? activeId() : undefined,
        };
      },
      onValueChange(next) {
        if (blocked() || disposed) return;
        refreshAvailable();
        setInput(next);
        if (disposed) return;
        setActive(null);
        setOpen(true);
      },
      onKeyDown(event) {
        if (
          blocked() ||
          isComposingInput(event) ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        refreshAvailable();
        const list = enabled();
        if (
          (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
          !event.altKey
        ) {
          event.preventDefault();
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const index = list.findIndex((option) => option.value === active());
          const next =
            !open() || index < 0
              ? direction > 0
                ? 0
                : list.length - 1
              : Math.max(0, Math.min(list.length - 1, index + direction));
          setOpen(true);
          if (disposed) return;
          setActive(list[next]?.value ?? null);
        } else if (
          open() &&
          (event.key === 'Home' || event.key === 'End') &&
          event.altKey
        ) {
          event.preventDefault();
          setActive(
            (event.key === 'Home' ? list[0] : list.at(-1))?.value ?? null,
          );
        } else if (open() && event.key === 'Enter' && !event.altKey) {
          event.preventDefault();
          if (active() !== null) select(active()!);
        } else if (open() && event.key === 'Escape' && !event.altKey) {
          event.preventDefault();
          cancel();
        }
      },
      ref(node) {
        setInputNode(node);
        props.inputRef?.(node);
      },
    });
    const rootNode = View({
      get style(): StyleValue<ViewStyles> {
        return [
          { flexDirection: 'row', minWidth: 0, alignItems: 'stretch' },
          props.style,
        ];
      },
      children: [
        inputView,
        Button({
          get name() {
            return `Clear ${props.label}`;
          },
          children: '×',
          variant: 'ghost',
          get size() {
            return props.size;
          },
          get disabled() {
            return blocked() || (!input() && value() === null);
          },
          get style(): StyleValue<ViewStyles> {
            return { display: props.clearable === false ? 'none' : 'flex' };
          },
          onPress() {
            if (blocked() || disposed) return;
            setValue(null);
            if (disposed) return;
            setInput('');
            if (disposed) return;
            setActive(null);
            setOpen(false);
            if (disposed) return;
            props.onClear?.();
            if (disposed) return;
            inputNode()?.focus({ preventScroll: true });
          },
        }),
      ],
    }) as PNode;
    const anchor = createOverlayAnchor(rootNode);
    const [available, setAvailable] = createState(false);
    const refreshAvailable = () => {
      if (!disposed)
        setAvailable(anchor.available && !inputNode()?.isDestroyed);
    };
    onCleanup(rootNode.observeLayout(() => untrack(refreshAvailable)));
    onCleanup(onTick(() => untrack(refreshAvailable)));
    createEffect(() => {
      void focus.focused();
      untrack(refreshAvailable);
    });
    const overlay = createOverlay({
      get open() {
        return open() && !blocked() && Boolean(inputNode()) && available();
      },
      onOpenChange: setOpen,
      anchor,
      anchorIsInside: true,
      get width() {
        return props.popupWidth ?? 280;
      },
      get height() {
        return props.popupHeight ?? 240;
      },
      placement: 'bottom-start',
      modal: false,
      autoFocus: false,
      dismissOnEscape: false,
      dismissOnFocusOutside: true,
      outsidePointer: 'dismiss-and-block',
      get tabAnchor() {
        return inputNode()?.element;
      },
      onDismiss(reason, event) {
        if (
          reason === 'focus-outside' &&
          event?.target === inputNode()?.element
        )
          return false;
      },
      onError: (error) => props.onError?.(error),
      children: () => {
        const semantic = document.createElement('div');
        semantic.id = id;
        semantic.setAttribute('role', 'listbox');
        semantic.style.cssText =
          'opacity:0;pointer-events:none;overflow:hidden;';
        const scroller = ScrollView({
          style: { width: '100%', flex: 1, minHeight: 0 },
          children: View({
            style: { flexDirection: 'column', width: '100%' },
            children: [
              For({
                get each() {
                  return filtered().map((option) => option.value);
                },
                children: (key: string) =>
                  componentRoot(() => {
                    const current = () =>
                      options().find((option) => option.value === key);
                    const element = document.createElement('div');
                    element.id = compositeId('combobox-option');
                    element.setAttribute('role', 'option');
                    element.style.cssText =
                      'position:absolute;pointer-events:none;overflow:hidden;';
                    const node = View({
                      get style(): StyleValue<ViewStyles> {
                        const t = theme();
                        return {
                          width: '100%',
                          minHeight: t.controlSize.md,
                          paddingInline: t.spacing.md,
                          paddingBlock: t.spacing.xs,
                          flexShrink: 0,
                          borderWidth: 2,
                          borderColor:
                            active() === key
                              ? t.colors.focusRing
                              : 'transparent',
                          borderRadius: t.radius.sm,
                          backgroundColor:
                            active() === key ? t.colors.primary : undefined,
                          opacity: current()?.disabled ? 0.5 : 1,
                        };
                      },
                      children: Text({
                        get style() {
                          const t = theme();
                          return {
                            fontFamily: t.typography.fontFamily,
                            fontSize: t.typography.fontSize,
                            lineHeight: t.typography.lineHeight,
                            color:
                              active() === key
                                ? t.colors.onPrimary
                                : t.colors.text,
                          };
                        },
                        get children() {
                          return current()?.label ?? '';
                        },
                      }),
                    }) as PNode;
                    rows.set(key, { node, element });
                    const click = () => select(key);
                    element.addEventListener('click', click);
                    const hover = () => {
                      if (!current()?.disabled) setActive(key);
                    };
                    const down = (event: { preventDefault(): void }) => {
                      event.preventDefault();
                      inputNode()?.focus({ preventScroll: true });
                    };
                    node._view.on('pointerenter', hover);
                    node._view.on('pointerdown', down);
                    createPressable(node, {
                      get disabled() {
                        return blocked() || current()?.disabled;
                      },
                      onPress: click,
                    });
                    onCleanup(() => {
                      rows.delete(key);
                      element.removeEventListener('click', click);
                      element.remove();
                      node._view.off('pointerenter', hover);
                      node._view.off('pointerdown', down);
                    });
                    return node;
                  }),
              }),
              Text({
                get style(): StyleValue<TextStyles> {
                  const t = theme();
                  return {
                    display: filtered().length ? 'none' : 'flex',
                    padding: t.spacing.md,
                    color: t.colors.textMuted,
                    fontFamily: t.typography.fontFamily,
                    fontSize: t.typography.fontSize,
                  };
                },
                get children() {
                  return props.emptyText ?? 'No results';
                },
              }),
            ],
          }),
        });
        const binding = attachDOMElement(scroller, semantic);
        let lastActive: string | null = null;
        const sync = () => {
          if (scroller.isDestroyed) return;
          semantic.setAttribute('aria-label', props.label);
          const list = filtered();
          const selected = active();
          if (selected !== lastActive) {
            const row = selected === null ? undefined : rows.get(selected);
            if (row) scroller.scrollIntoView(row.node, { block: 'nearest' });
            lastActive = selected;
          }
          list.forEach((option, index) => {
            const row = rows.get(option.value);
            if (!row || row.node.isDestroyed) return;
            const layout = row.node._layoutNode;
            row.element.textContent = option.label;
            row.element.setAttribute(
              'aria-selected',
              String(value() === option.value),
            );
            row.element.setAttribute(
              'aria-disabled',
              String(Boolean(option.disabled)),
            );
            row.element.setAttribute('aria-posinset', String(index + 1));
            row.element.setAttribute('aria-setsize', String(list.length));
            row.element.style.left = `${layout.getComputedLeft()}px`;
            row.element.style.top = `${layout.getComputedTop() + scroller.scrollY}px`;
            row.element.style.width = `${layout.getComputedWidth()}px`;
            row.element.style.height = `${layout.getComputedHeight()}px`;
            if (semantic.children[index] !== row.element)
              semantic.insertBefore(
                row.element,
                semantic.children[index] ?? null,
              );
          });
          const row = selected === null ? undefined : rows.get(selected);
          setActiveId(row?.element.isConnected ? row.element.id : undefined);
        };
        syncList = sync;
        onCleanup(onTick(sync));
        onCleanup(scroller.observeLayout(sync));
        onCleanup(() => {
          syncList = () => {};
          setActiveId(undefined);
          binding.dispose();
        });
        return View({
          get style(): StyleValue<ViewStyles> {
            const t = theme();
            return {
              width: '100%',
              height: '100%',
              minHeight: 0,
              padding: t.spacing.xs,
              flexDirection: 'column',
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.surfaceRaised,
              borderRadius: t.radius.md,
            };
          },
          children: scroller,
        });
      },
    });
    createEffect(() => setReady(overlay.ready()));
    createEffect(() => {
      const list = enabled();
      const key = active();
      if (key !== null && !list.some((option) => option.value === key))
        setActive(null);
      if (!open() || blocked()) setActive(null);
      untrack(syncList);
    });
    createEffect(() => {
      const node = inputNode();
      if (!node) return;
      const element = node.element;
      element.setAttribute('aria-autocomplete', 'list');
    });
    onCleanup(() => {
      disposed = true;
      overlay.dispose();
      rows.clear();
    });
    return rootNode;
  }, props.ref);
}
