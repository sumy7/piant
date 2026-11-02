import {
  attachDOMElement,
  createContext,
  createEffect,
  createMemo,
  createState,
  type Getter,
  mergeProps,
  onCleanup,
  type PixiEventHandler,
  type PNode,
  type StyleValue,
  Text,
  type TextProps,
  untrack,
  useContext,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { linkFocusableDescription } from '../primitives/createFocusable';
import { getFocusScope } from '../primitives/focusScope';
import { createOverlay } from '../primitives/OverlayHost';
import type { OverlayPositionOptions } from '../primitives/overlayPosition';
import { useUITheme } from '../theme/UIProvider';
import { Button, type ButtonProps } from './Button';
import { createTriggerSlot } from './internal/anchoredTrigger';
import { componentRoot } from './internal/componentRoot';
import { compositeId } from './internal/compositeParts';

export interface TooltipProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
export type TooltipTriggerProps = ButtonProps;
export interface TooltipContentProps extends OverlayPositionOptions {
  /** Short, noninteractive description. Use Popover for interactive content. */
  children: string;
  width?: number;
  style?: StyleValue<ViewStyles>;
  textStyle?: TextProps['style'];
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}
type Pointer = Parameters<PixiEventHandler<PNode, 'pointerenter'>>[0];
interface TooltipScope {
  id: string;
  open: Getter<boolean>;
  setOpen(value: boolean): void;
  trigger: ReturnType<typeof createTriggerSlot>;
  surface: Getter<HTMLElement | undefined>;
  setSurface(element: HTMLElement | undefined): void;
  hover(source: 'trigger' | 'content', inside: boolean): void;
  focus(inside: boolean): void;
  touch(): void;
  dismiss(): void;
  reset(): void;
  reconcile(): void;
  disposed: boolean;
  content: boolean;
}
const TooltipContext = createContext<TooltipScope>();
function context() {
  const scope = useContext(TooltipContext);
  if (!scope) throw new Error('Tooltip parts require a Tooltip root.');
  return scope;
}
function milliseconds(value: number | undefined, fallback: number) {
  const delay = value ?? fallback;
  if (!Number.isFinite(delay) || delay < 0)
    throw new RangeError(
      'Tooltip delays must be finite nonnegative milliseconds.',
    );
  return delay;
}
export function Tooltip(props: TooltipProps): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    milliseconds(props.openDelay, 500);
    milliseconds(props.closeDelay, 200);
    const [open, changeOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (value) => props.onOpenChange?.(value),
    });
    const [surface, setSurface] = createState<HTMLElement>();
    let triggerHover = false;
    let contentHover = false;
    let focused = false;
    let suppressed = false;
    let touch = false;
    let opening: ReturnType<typeof setTimeout> | undefined;
    let closing: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => {
      clearTimeout(opening);
      clearTimeout(closing);
      opening = undefined;
      closing = undefined;
    };
    const scope: TooltipScope = {
      id: compositeId('tooltip'),
      open,
      setOpen(value) {
        if (!scope.disposed) changeOpen(value);
      },
      trigger: createTriggerSlot(() => scope.reset()),
      surface,
      setSurface,
      disposed: false,
      content: false,
      hover(source, inside) {
        if (scope.disposed) return;
        const previous = source === 'trigger' ? triggerHover : contentHover;
        if (source === 'trigger') triggerHover = inside;
        else contentHover = inside;
        if (inside && !previous) {
          suppressed = false;
          touch = false;
        }
        scope.reconcile();
      },
      focus(inside) {
        if (scope.disposed) return;
        if (inside && !focused && !touch) suppressed = false;
        focused = inside;
        if (!inside) touch = false;
        scope.reconcile();
      },
      touch() {
        touch = true;
        triggerHover = false;
        contentHover = false;
        scope.dismiss();
      },
      dismiss() {
        clearTimers();
        contentHover = false;
        suppressed = true;
        scope.setOpen(false);
      },
      reset() {
        clearTimers();
        triggerHover = false;
        contentHover = false;
        focused = false;
        suppressed = true;
        touch = false;
        scope.setOpen(false);
      },
      reconcile() {
        clearTimers();
        if (scope.disposed || suppressed || touch) return;
        const trigger = scope.trigger.current();
        trigger?.refresh();
        if (!trigger?.available()) return;
        if (focused || triggerHover || contentHover) {
          if (open()) return;
          if (focused) scope.setOpen(true);
          else
            opening = setTimeout(
              () => {
                opening = undefined;
                trigger.refresh();
                if (
                  !scope.disposed &&
                  !suppressed &&
                  !touch &&
                  trigger.available() &&
                  (triggerHover || contentHover || focused)
                )
                  scope.setOpen(true);
              },
              milliseconds(props.openDelay, 500),
            );
        } else if (open()) {
          closing = setTimeout(
            () => {
              closing = undefined;
              if (!scope.disposed && !triggerHover && !contentHover && !focused)
                scope.setOpen(false);
            },
            milliseconds(props.closeDelay, 200),
          );
        }
      },
    };
    onCleanup(() => {
      scope.disposed = true;
      clearTimers();
    });
    let wasOpen = open();
    createEffect(() => {
      const value = open();
      if (wasOpen && !value) {
        clearTimers();
        contentHover = false;
        suppressed = true;
      }
      wasOpen = value;
    });
    createEffect(() => {
      void props.openDelay;
      void props.closeDelay;
      if (opening !== undefined || closing !== undefined)
        untrack(scope.reconcile);
    });
    return View({
      get style(): StyleValue<ViewStyles> {
        return [{ flexDirection: 'column', minWidth: 0 }, props.style];
      },
      children: TooltipContext.Provider({
        value: scope,
        children: () => createMemo(() => untrack(() => props.children())),
      }),
    }) as PNode;
  }, props.ref);
}
export function TooltipTrigger(
  props: TooltipTriggerProps,
): ReturnType<typeof View> {
  const scope = context();
  return componentRoot(() => {
    const node = Button(
      mergeProps(props, {
        ref: undefined,
        onPress(event, target) {
          props.onPress?.(event, target);
          if (!node.isDestroyed && !scope.disposed) scope.dismiss();
        },
      } satisfies Partial<ButtonProps>) as ButtonProps,
    ) as PNode;
    const trigger = scope.trigger.bind(node, () =>
      Boolean(props.disabled || props.loading),
    );
    const enter = (event: Pointer) => {
      if (event.pointerType === 'touch') scope.touch();
      else if (event.isPrimary !== false) scope.hover('trigger', true);
    };
    const leave = (event: Pointer) => {
      if (event.pointerType !== 'touch') scope.hover('trigger', false);
    };
    const down = (event: Pointer) => {
      if (event.pointerType === 'touch') scope.touch();
      else scope.dismiss();
    };
    const cancel = () => scope.reset();
    const focus = () => scope.focus(true);
    const blur = () => scope.focus(false);
    node._view.on('pointerenter', enter);
    node._view.on('pointerleave', leave);
    node._view.on('pointerdown', down);
    node._view.on('pointercancel', cancel);
    trigger.element.addEventListener('focus', focus);
    trigger.element.addEventListener('blur', blur);
    const win = trigger.element.ownerDocument.defaultView!;
    win.addEventListener('blur', cancel);
    createEffect(() => {
      if (scope.surface()) onCleanup(linkFocusableDescription(node, scope.id));
    });
    onCleanup(() => {
      node._view.off('pointerenter', enter);
      node._view.off('pointerleave', leave);
      node._view.off('pointerdown', down);
      node._view.off('pointercancel', cancel);
      trigger.element.removeEventListener('focus', focus);
      trigger.element.removeEventListener('blur', blur);
      win.removeEventListener('blur', cancel);
    });
    return node;
  }, props.ref);
}
export function TooltipContent(
  props: TooltipContentProps,
): ReturnType<typeof View> {
  const scope = context();
  const theme = useUITheme();
  return componentRoot(() => {
    if (scope.content) throw new Error('Tooltip supports one Content.');
    scope.content = true;
    onCleanup(() => {
      scope.content = false;
    });
    const [measuredHeight, setMeasuredHeight] = createState(
      theme().typography.lineHeight + theme().spacing.sm * 2 + 2,
    );
    const overlay = createOverlay({
      get open() {
        return scope.open() && Boolean(scope.trigger.current()?.available());
      },
      onOpenChange: scope.setOpen,
      get anchor() {
        return scope.trigger.current()?.anchor;
      },
      get width() {
        return props.width ?? 260;
      },
      get height() {
        return measuredHeight();
      },
      get placement() {
        return props.placement ?? 'top';
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
      noninteractive: true,
      autoFocus: false,
      restoreFocus: false,
      outsidePointer: 'ignore',
      escapeScope: 'document',
      onDismiss(reason) {
        if (reason === 'anchor-removed') scope.trigger.current()?.invalidate();
        else scope.dismiss();
        return false;
      },
      onError: (error) => props.onError?.(error),
      children: () => {
        const node = View({
          ref: props.ref,
          get style(): StyleValue<ViewStyles> {
            const t = theme();
            return [
              {
                width: '100%',
                minWidth: 0,
                flexShrink: 0,
                flexDirection: 'column',
                padding: t.spacing.sm,
                backgroundColor: t.colors.surfaceRaised,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.sm,
              },
              props.style,
            ];
          },
          children: Text({
            get style(): TextProps['style'] {
              const t = theme();
              return [
                {
                  fontFamily: t.typography.fontFamily,
                  fontSize: t.typography.smallFontSize,
                  lineHeight: t.typography.smallLineHeight,
                  color: t.colors.text,
                  minWidth: 0,
                },
                props.textStyle,
              ];
            },
            get children() {
              return typeof props.children === 'string' ? props.children : '';
            },
          }),
        }) as PNode;
        const mirror = document.createElement('span');
        mirror.style.cssText = 'opacity:0;pointer-events:none;';
        attachDOMElement(node, mirror);
        createEffect(() => {
          mirror.textContent =
            typeof props.children === 'string' ? props.children : '';
        });
        onCleanup(
          node.observeLayout(() => {
            const height = Math.ceil(node._layoutNode.getComputedHeight());
            if (height > 0) setMeasuredHeight(height);
          }),
        );
        return node;
      },
    });
    let failed = false;
    createEffect(() => {
      const element = overlay.element();
      if (element) {
        element.id = scope.id;
        element.setAttribute('role', 'tooltip');
      }
      scope.setSurface(overlay.ready() ? element : undefined);
      if (!element) return;
      const enter = (event: PointerEvent) => {
        if (event.pointerType !== 'touch') scope.hover('content', true);
      };
      const leave = (event: PointerEvent) => {
        if (event.pointerType !== 'touch') scope.hover('content', false);
      };
      element.addEventListener('pointerenter', enter);
      element.addEventListener('pointerleave', leave);
      onCleanup(() => {
        element.removeEventListener('pointerenter', enter);
        element.removeEventListener('pointerleave', leave);
      });
      if (
        overlay.ready() &&
        (typeof props.children !== 'string' || !props.children.trim()) &&
        !failed
      ) {
        failed = true;
        untrack(() => {
          scope.dismiss();
          overlay.dispose();
          const error = new Error(
            'TooltipContent requires non-empty, noninteractive string content.',
          );
          if (props.onError) props.onError(error);
          else console.error('[piant/ui] Invalid tooltip content.', error);
        });
      }
    });
    return View({ style: { display: 'none' } }) as PNode;
  });
}
