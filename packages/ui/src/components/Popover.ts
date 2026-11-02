import {
  createContext,
  createEffect,
  createMemo,
  createState,
  type Getter,
  mergeProps,
  onCleanup,
  type PNode,
  type StyleValue,
  untrack,
  useContext,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { getFocusScope } from '../primitives/focusScope';
import { createOverlay } from '../primitives/OverlayHost';
import type { OverlayPositionOptions } from '../primitives/overlayPosition';
import { useUITheme } from '../theme/UIProvider';
import { Button, type ButtonProps } from './Button';
import { createTriggerSlot } from './internal/anchoredTrigger';
import { componentRoot } from './internal/componentRoot';
import { compositeId } from './internal/compositeParts';
import { createScrollableBody } from './internal/scrollBody';

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
export type PopoverTriggerProps = ButtonProps;
export type PopoverCloseProps = ButtonProps;
export interface PopoverContentProps extends OverlayPositionOptions {
  name: string;
  width?: number;
  height?: number;
  initialFocus?: () => HTMLElement | undefined;
  dismissOnEscape?: boolean;
  dismissOnOutsidePointer?: boolean;
  dismissOnFocusOutside?: boolean;
  scrollLabel?: string;
  children: () => unknown;
  actions?: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}
interface PopoverScope {
  id: string;
  open: Getter<boolean>;
  setOpen(open: boolean): void;
  trigger: ReturnType<typeof createTriggerSlot>;
  surface: Getter<HTMLElement | undefined>;
  setSurface(element: HTMLElement | undefined): void;
  disposed: boolean;
  content: boolean;
}
const PopoverContext = createContext<PopoverScope>();
function context() {
  const scope = useContext(PopoverContext);
  if (!scope) throw new Error('Popover parts require a Popover root.');
  return scope;
}
export function Popover(props: PopoverProps): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    const [open, changeOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (value) => props.onOpenChange?.(value),
    });
    const [surface, setSurface] = createState<HTMLElement>();
    const scope: PopoverScope = {
      id: compositeId('popover'),
      open,
      setOpen(value) {
        if (!scope.disposed) changeOpen(value);
      },
      trigger: createTriggerSlot(() => scope.setOpen(false)),
      surface,
      setSurface,
      disposed: false,
      content: false,
    };
    onCleanup(() => {
      scope.disposed = true;
    });
    return View({
      get style(): StyleValue<ViewStyles> {
        return [{ flexDirection: 'column', minWidth: 0 }, props.style];
      },
      children: PopoverContext.Provider({
        value: scope,
        children: () => createMemo(() => untrack(() => props.children())),
      }),
    }) as PNode;
  }, props.ref);
}
export function PopoverTrigger(
  props: PopoverTriggerProps,
): ReturnType<typeof View> {
  const scope = context();
  return componentRoot(() => {
    const node = Button(
      mergeProps(props, {
        ref: undefined,
        onPress(event, target) {
          props.onPress?.(event, target);
          if (!event.defaultPrevented && !node.isDestroyed && !scope.disposed)
            scope.setOpen(!scope.open());
        },
      } satisfies Partial<ButtonProps>) as ButtonProps,
    ) as PNode;
    const trigger = scope.trigger.bind(node, () =>
      Boolean(props.disabled || props.loading),
    );
    createEffect(() => {
      trigger.element.setAttribute('aria-haspopup', 'dialog');
      trigger.element.setAttribute(
        'aria-expanded',
        String(scope.open() && trigger.available()),
      );
      if (scope.surface())
        trigger.element.setAttribute('aria-controls', scope.id);
      else trigger.element.removeAttribute('aria-controls');
    });
    return node;
  }, props.ref);
}
export function PopoverClose(
  props: PopoverCloseProps,
): ReturnType<typeof View> {
  const scope = context();
  return componentRoot(() => {
    const node = Button(
      mergeProps(props, {
        ref: undefined,
        onPress(event, target) {
          props.onPress?.(event, target);
          if (!event.defaultPrevented && !node.isDestroyed && !scope.disposed)
            scope.setOpen(false);
        },
      } satisfies Partial<ButtonProps>) as ButtonProps,
    ) as PNode;
    return node;
  }, props.ref);
}
export function PopoverContent(
  props: PopoverContentProps,
): ReturnType<typeof View> {
  const scope = context();
  const theme = useUITheme();
  return componentRoot(() => {
    if (scope.content) throw new Error('Popover supports one Content.');
    scope.content = true;
    onCleanup(() => {
      scope.content = false;
    });
    const overlay = createOverlay({
      get open() {
        return scope.open() && Boolean(scope.trigger.current()?.available());
      },
      onOpenChange: scope.setOpen,
      get anchor() {
        return scope.trigger.current()?.anchor;
      },
      get width() {
        return props.width ?? 320;
      },
      get height() {
        return props.height ?? 240;
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
      autoFocus: true,
      get initialFocus() {
        return props.initialFocus;
      },
      get dismissOnEscape() {
        return props.dismissOnEscape;
      },
      get dismissOnFocusOutside() {
        return props.dismissOnFocusOutside !== false;
      },
      get tabAnchor() {
        return scope.trigger.current()?.element;
      },
      get outsidePointer() {
        return props.dismissOnOutsidePointer === false ? 'ignore' : 'dismiss';
      },
      onDismiss(reason, event) {
        const trigger = scope.trigger.current();
        if (reason === 'anchor-removed') {
          trigger?.invalidate();
          return false;
        }
        if (
          (reason === 'outside-pointer' || reason === 'focus-outside') &&
          trigger?.containsEvent(event)
        )
          return false;
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
                gap: t.spacing.sm,
                backgroundColor: t.colors.surfaceRaised,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
              },
              props.style,
            ];
          },
          children: [
            createScrollableBody({
              get label() {
                return props.scrollLabel ?? 'Scrollable popover content';
              },
              children: View({
                get style(): StyleValue<ViewStyles> {
                  return {
                    width: '100%',
                    minWidth: 0,
                    flexDirection: 'column',
                    gap: theme().spacing.sm,
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
                  minWidth: 0,
                  gap: theme().spacing.sm,
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
      element.id = scope.id;
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-modal', 'false');
      const name = props.name?.trim();
      if (name) element.setAttribute('aria-label', name);
      else element.removeAttribute('aria-label');
      if (overlay.ready() && !name && !failed) {
        failed = true;
        untrack(() => {
          overlay.dispose();
          const error = new Error('PopoverContent requires a non-empty name.');
          if (props.onError) props.onError(error);
          else console.error('[piant/ui] Invalid popover content.', error);
        });
      }
    });
    return View({ style: { display: 'none' } }) as PNode;
  });
}
