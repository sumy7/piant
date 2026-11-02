import {
  attachDOMElement,
  createContext,
  createEffect,
  createMemo,
  createState,
  type Getter,
  mergeProps,
  onCleanup,
  type PNode,
  ScrollView,
  type StyleValue,
  Text,
  type TextProps,
  untrack,
  useContext,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { createFocusable } from '../primitives/createFocusable';
import { getFocusScope } from '../primitives/focusScope';
import { createOverlay } from '../primitives/OverlayHost';
import { useUITheme } from '../theme/UIProvider';
import { Button, type ButtonProps } from './Button';
import { componentRoot } from './internal/componentRoot';
import { compositeId } from './internal/compositeParts';

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Create parts inside this root's context. */
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}

export interface DialogContentProps {
  /** CSS pixel dimensions, clamped to the visible viewport. */
  width?: number;
  height?: number;
  /** Accessible name when no visible DialogTitle is provided. */
  name?: string;
  /** Resolved once per opening. An unavailable target falls back to Content. */
  initialFocus?: () => HTMLElement | undefined;
  /** Accessible keyboard scroll entry, exposed only when the body overflows. */
  scrollLabel?: string;
  dismissOnEscape?: boolean;
  dismissOnOutsidePointer?: boolean;
  children: () => unknown;
  /** Wrapping footer outside the scrollable body, keeping actions reachable. */
  actions?: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}
export interface DialogTextProps {
  children: string;
  style?: TextProps['style'];
}
export type DialogTriggerProps = ButtonProps;
export type DialogCloseProps = ButtonProps;
export type AlertDialogProps = DialogProps;
export type AlertDialogContentProps = Omit<
  DialogContentProps,
  'dismissOnOutsidePointer'
>;
export type AlertDialogTextProps = DialogTextProps;
export type AlertDialogTriggerProps = ButtonProps;
export type AlertDialogCancelProps = ButtonProps;
export type AlertDialogConfirmProps = ButtonProps;

type Kind = 'dialog' | 'alertdialog';
interface DialogScope {
  kind: Kind;
  id: string;
  open: Getter<boolean>;
  setOpen: (value: boolean) => void;
  title: Getter<string | undefined>;
  description: Getter<string | undefined>;
  registerText: (
    type: 'title' | 'description',
    id: string,
    text: string,
  ) => () => void;
  content: boolean;
  disposed: boolean;
  titleText: Getter<string | undefined>;
  descriptionText: Getter<string | undefined>;
  setText: (type: 'title' | 'description', value: string) => void;
  surface: Getter<HTMLElement | undefined>;
  setSurface: (element: HTMLElement | undefined) => void;
  cancel?: PNode;
}
const DialogContext = createContext<DialogScope>();
function context(kind: Kind) {
  const scope = useContext(DialogContext);
  if (!scope || scope.kind !== kind)
    throw new Error(`${kind} parts require their matching root.`);
  return scope;
}
function dialogRoot(props: DialogProps, kind: Kind): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    const [open, changeOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (value) => props.onOpenChange?.(value),
    });
    const [title, setTitle] = createState<string>();
    const [description, setDescription] = createState<string>();
    const [titleText, setTitleText] = createState<string>();
    const [descriptionText, setDescriptionText] = createState<string>();
    const [surface, setSurface] = createState<HTMLElement>();
    const scope: DialogScope = {
      kind,
      id: compositeId(kind),
      open,
      setOpen(value) {
        if (!scope.disposed) changeOpen(value);
      },
      title,
      description,
      content: false,
      disposed: false,
      titleText,
      descriptionText,
      setText(type, value) {
        (type === 'title' ? setTitleText : setDescriptionText)(value);
      },
      surface,
      setSurface,
      registerText(type, id, text) {
        const current = type === 'title' ? title : description;
        const set = type === 'title' ? setTitle : setDescription;
        if (current()) throw new Error(`${kind} supports one ${type}.`);
        scope.setText(type, text);
        set(id);
        return () => {
          if (current() === id) set(undefined);
        };
      },
    };
    onCleanup(() => {
      scope.disposed = true;
    });
    return View({
      get style(): StyleValue<ViewStyles> {
        return [{ flexDirection: 'column', minWidth: 0 }, props.style];
      },
      children: DialogContext.Provider({
        value: scope,
        children: () => createMemo(() => untrack(() => props.children())),
      }),
    }) as PNode;
  }, props.ref);
}
export function Dialog(props: DialogProps): ReturnType<typeof View> {
  return dialogRoot(props, 'dialog');
}
export function AlertDialog(props: AlertDialogProps): ReturnType<typeof View> {
  return dialogRoot(props, 'alertdialog');
}

function action(
  props: ButtonProps,
  kind: Kind,
  type: 'trigger' | 'close' | 'cancel' | 'confirm',
) {
  const scope = context(kind);
  const focus = getFocusScope();
  return componentRoot(() => {
    let node: PNode;
    node = Button(
      mergeProps(props, {
        ref: undefined,
        onPress(event, target) {
          props.onPress?.(event, target);
          if (!event.defaultPrevented && !node.isDestroyed && !scope.disposed)
            scope.setOpen(type === 'trigger');
        },
      } satisfies Partial<ButtonProps>) as ButtonProps,
    ) as PNode;
    if (type === 'cancel') {
      if (scope.cancel) throw new Error('AlertDialog supports one Cancel.');
      scope.cancel = node;
      onCleanup(() => {
        if (scope.cancel === node) scope.cancel = undefined;
      });
    }
    if (type === 'trigger') {
      createEffect(() => {
        const entry = focus.entries.find((entry) => entry.node === node);
        const element = entry?.binding.element;
        element?.setAttribute('aria-haspopup', 'dialog');
        element?.setAttribute('aria-expanded', String(scope.open()));
        // Closed content is unmounted; never reference a nonexistent ID.
        if (scope.surface()) element?.setAttribute('aria-controls', scope.id);
        else element?.removeAttribute('aria-controls');
      });
    }
    return node;
  }, props.ref);
}
export function DialogTrigger(
  props: DialogTriggerProps,
): ReturnType<typeof View> {
  return action(props, 'dialog', 'trigger');
}
export function DialogClose(props: DialogCloseProps): ReturnType<typeof View> {
  return action(props, 'dialog', 'close');
}
export function AlertDialogTrigger(
  props: AlertDialogTriggerProps,
): ReturnType<typeof View> {
  return action(props, 'alertdialog', 'trigger');
}
export function AlertDialogCancel(
  props: AlertDialogCancelProps,
): ReturnType<typeof View> {
  return action(props, 'alertdialog', 'cancel');
}
export function AlertDialogConfirm(
  props: AlertDialogConfirmProps,
): ReturnType<typeof View> {
  return action(props, 'alertdialog', 'confirm');
}

/** A separate scroll stop keeps clipped fields reachable without changing Tab order. */
function scrollBody(options: { label: string; children: JSX.Element }) {
  const theme = useUITheme();
  const [overflow, setOverflow] = createState(false);
  const [focused, setFocused] = createState(false);
  const node = ScrollView({
    get style(): StyleValue<ViewStyles> {
      return {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        borderWidth: 2,
        borderColor: focused() ? theme().colors.focusRing : 'transparent',
      };
    },
    children: options.children,
  });
  const element = document.createElement('div');
  element.setAttribute('role', 'region');
  element.style.cssText = 'opacity:0;pointer-events:none;';
  const binding = attachDOMElement(node, element);
  const maximum = () =>
    Math.max(
      0,
      node.scrollContent._layoutNode.getComputedHeight() -
        node.scrollContentHolder._layoutNode.getComputedHeight(),
    );
  onCleanup(node.observeLayout(() => setOverflow(maximum() > 1)));
  const focus = createFocusable(node, {
    domElement: binding,
    get name() {
      return options.label;
    },
    description:
      'Use Page Up, Page Down, arrow keys, Home or End to scroll, then Tab to reach visible controls.',
    // Other controls retain their logical order. This entry is last and is
    // omitted entirely when there is no scrolling to perform.
    order: 1,
    get hidden() {
      return !overflow();
    },
    onKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const height = node.scrollContentHolder._layoutNode.getComputedHeight();
      const line = theme().typography.lineHeight;
      const delta =
        event.key === 'PageDown'
          ? -height * 0.8
          : event.key === 'PageUp'
            ? height * 0.8
            : event.key === 'ArrowDown'
              ? -line
              : event.key === 'ArrowUp'
                ? line
                : undefined;
      if (delta === undefined && event.key !== 'Home' && event.key !== 'End')
        return;
      event.preventDefault();
      node.scrollY =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? -maximum()
            : Math.max(-maximum(), Math.min(0, node.scrollY + (delta ?? 0)));
      node.update();
    },
  });
  createEffect(() => setFocused(focus.focusVisible()));
  return node;
}

function content(
  props: DialogContentProps,
  kind: Kind,
): ReturnType<typeof View> {
  const scope = context(kind);
  const focus = getFocusScope();
  const theme = useUITheme();
  return componentRoot(() => {
    if (scope.content) throw new Error(`${kind} supports one Content.`);
    scope.content = true;
    onCleanup(() => {
      scope.content = false;
    });
    const overlay = createOverlay({
      get open() {
        return scope.open();
      },
      onOpenChange: scope.setOpen,
      get width() {
        return props.width ?? 440;
      },
      get height() {
        return props.height ?? 320;
      },
      modal: true,
      get dismissOnEscape() {
        return props.dismissOnEscape;
      },
      get outsidePointer() {
        return kind === 'alertdialog' || props.dismissOnOutsidePointer === false
          ? 'block'
          : 'dismiss';
      },
      get initialFocus() {
        return (
          props.initialFocus ??
          (kind === 'alertdialog'
            ? () =>
                focus.entries.find((entry) => entry.node === scope.cancel)
                  ?.binding.element
            : undefined)
        );
      },
      onError: (error) => props.onError?.(error),
      children: () =>
        View({
          ref: props.ref,
          get style(): StyleValue<ViewStyles> {
            const t = theme();
            return [
              {
                width: '100%',
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                flexDirection: 'column',
                padding: t.spacing.md,
                gap: t.spacing.md,
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
              },
              props.style,
            ];
          },
          children: [
            scrollBody({
              get label() {
                return props.scrollLabel ?? 'Scrollable dialog content';
              },
              children: View({
                get style(): StyleValue<ViewStyles> {
                  return {
                    flexDirection: 'column',
                    gap: theme().spacing.sm,
                    minWidth: 0,
                    width: '100%',
                  };
                },
                children: createMemo(() =>
                  untrack(() => props.children()),
                ) as JSX.Element,
              }),
            }),
            View({
              get style(): StyleValue<ViewStyles> {
                return {
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                  gap: theme().spacing.sm,
                  minWidth: 0,
                };
              },
              children: createMemo(() =>
                untrack(() => props.actions?.()),
              ) as JSX.Element,
            }),
          ],
        }),
    });
    let failed = false;
    createEffect(() => {
      const element = overlay.element();
      scope.setSurface(element);
      if (!element) return;
      const title = scope.title();
      const description = scope.description();
      const name = props.name?.trim();
      element.id = scope.id;
      element.setAttribute('role', kind);
      // The host blocks this mount only. Other page applications stay usable;
      // aria-modal=true would incorrectly hide them from assistive technology.
      element.setAttribute('aria-modal', 'false');
      if (title) element.setAttribute('aria-labelledby', title);
      else element.removeAttribute('aria-labelledby');
      if (name && !title) element.setAttribute('aria-label', name);
      else element.removeAttribute('aria-label');
      if (description) element.setAttribute('aria-describedby', description);
      else element.removeAttribute('aria-describedby');
      const invalid =
        (!title && !name) ||
        (title && !scope.titleText()?.trim()) ||
        (description && !scope.descriptionText()?.trim());
      if (overlay.ready() && invalid && !failed) {
        failed = true;
        // Configuration errors are fatal for this Content. Release the modal
        // before notifying the caller; a reactive throw would leave a focus lock.
        untrack(() => {
          overlay.dispose();
          const error = new Error(
            `${kind} requires a non-empty Title or Content name and non-empty descriptions.`,
          );
          if (props.onError) props.onError(error);
          else console.error('[piant/ui] Invalid dialog content.', error);
        });
      }
    });
    // Retained placeholder owns the overlay, but adds no visual or layout area.
    return View({ style: { display: 'none' } }) as PNode;
  });
}
export function DialogContent(
  props: DialogContentProps,
): ReturnType<typeof View> {
  return content(props, 'dialog');
}
export function AlertDialogContent(
  props: AlertDialogContentProps,
): ReturnType<typeof View> {
  return content(props, 'alertdialog');
}

function text(
  props: DialogTextProps,
  kind: Kind,
  type: 'title' | 'description',
): ReturnType<typeof View> {
  const scope = context(kind);
  const theme = useUITheme();
  return componentRoot(() => {
    const id = `${scope.id}-${type}`;
    onCleanup(scope.registerText(type, id, props.children));
    const node = View({
      style: { minWidth: 0 },
      children: Text({
        get style(): TextProps['style'] {
          const t = theme();
          return [
            {
              fontFamily: t.typography.fontFamily,
              fontSize:
                type === 'title'
                  ? t.typography.fontSize * 1.25
                  : t.typography.fontSize,
              lineHeight:
                t.typography.lineHeight * (type === 'title' ? 1.25 : 1),
              color: type === 'title' ? t.colors.text : t.colors.textMuted,
              minWidth: 0,
            },
            props.style,
          ];
        },
        get children() {
          return props.children;
        },
      }),
    }) as PNode;
    const mirror = document.createElement(type === 'title' ? 'h2' : 'span');
    mirror.id = id;
    mirror.style.cssText = 'opacity:0;pointer-events:none;margin:0;';
    attachDOMElement(node, mirror);
    createEffect(() => {
      mirror.textContent = props.children;
      scope.setText(type, props.children);
    });
    return node;
  });
}
export function DialogTitle(props: DialogTextProps): ReturnType<typeof View> {
  return text(props, 'dialog', 'title');
}
export function DialogDescription(
  props: DialogTextProps,
): ReturnType<typeof View> {
  return text(props, 'dialog', 'description');
}
export function AlertDialogTitle(
  props: AlertDialogTextProps,
): ReturnType<typeof View> {
  return text(props, 'alertdialog', 'title');
}
export function AlertDialogDescription(
  props: AlertDialogTextProps,
): ReturnType<typeof View> {
  return text(props, 'alertdialog', 'description');
}
