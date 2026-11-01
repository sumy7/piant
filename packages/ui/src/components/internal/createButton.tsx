import {
  createEffect,
  createState,
  type Getter,
  onCleanup,
  type PNode,
  root,
  Show,
  type StyleValue,
  Text,
  type TextProps,
  View,
  type ViewStyles,
} from '@piant/core';
import { createFocusable } from '../../primitives/createFocusable';
import {
  createPressable,
  type PressableOptions,
} from '../../primitives/createPressable';
import { useUIFocus } from '../../primitives/focusScope';
import { useUITheme } from '../../theme/UIProvider';
import { Spinner } from '../Spinner';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonPressEvent =
  MouseEvent | Parameters<NonNullable<PressableOptions['onPress']>>[0];
export interface ButtonIconContext {
  readonly size: Getter<number>;
  readonly color: Getter<string>;
}
export interface ButtonOptions {
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: (event: ButtonPressEvent, node: PNode) => void;
  icon?: (context: ButtonIconContext) => JSX.Element;
  style?: StyleValue<ViewStyles>;
  textStyle?: TextProps['style'];
  ref?: Parameters<typeof View>[0]['ref'];
}

type ContentProps = ButtonOptions & {
  name?: string;
  children?: Parameters<typeof View>[0]['children'];
};

/** The two public button components share one visual and interaction contract. */
export function createButton(
  props: ContentProps,
  iconOnly: boolean,
): ReturnType<typeof View> {
  let stop = () => {};
  let removeDestroy = () => {};
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  const node = root((cleanup) => {
    stop = cleanup;
    try {
      return renderButton(props, iconOnly);
    } catch (error) {
      cleanup();
      throw error;
    }
  });
  if (!node) return node;
  removeDestroy = node.onDestroy(dispose);
  onCleanup(dispose);
  props.ref?.(node as Parameters<NonNullable<ButtonOptions['ref']>>[0]);
  return node;
}

function renderButton(props: ContentProps, iconOnly: boolean): PNode {
  useUIFocus();
  const theme = useUITheme();
  const size = () => props.size ?? 'md';
  const isText = () =>
    typeof props.children === 'string' || typeof props.children === 'number';
  const label = () => (isText() ? String(props.children) : '');
  const name = () => {
    const value = (props.name ?? (iconOnly ? '' : label())).trim();
    if (!value) throw new Error('Button requires a non-empty accessible name.');
    return value;
  };
  // Nested compiled JSX getters can still be queued in the enclosing reaction.
  // Validate ready values now; createFocusable validates deferred names reactively.
  const pendingName =
    props.name === undefined &&
    props.children === undefined &&
    (Object.getOwnPropertyDescriptor(props, 'name')?.get ||
      Object.getOwnPropertyDescriptor(props, 'children')?.get);
  if (!pendingName) name();
  const unavailable = () => Boolean(props.disabled || props.loading);
  const palette = () => {
    const colors = theme().colors;
    switch (props.variant ?? 'primary') {
      case 'danger':
        return {
          background: colors.danger,
          foreground: colors.onDanger,
          border: colors.danger,
        };
      case 'secondary':
        return {
          background: colors.surfaceRaised,
          foreground: colors.text,
          border: colors.border,
        };
      case 'ghost':
        return {
          background: undefined,
          foreground: colors.text,
          border: undefined,
        };
      default:
        return {
          background: colors.primary,
          foreground: colors.onPrimary,
          border: colors.primary,
        };
    }
  };
  const iconSize = () =>
    size() === 'sm'
      ? theme().typography.smallLineHeight
      : theme().typography.lineHeight;
  const side = () =>
    Math.max(
      theme().controlSize[size()],
      iconSize() + theme().spacing.xs * 2 + 2,
    );
  const iconContext: ButtonIconContext = {
    size: iconSize,
    color: () => palette().foreground,
  };
  const [visual, setVisual] = createState({
    hovered: false,
    pressed: false,
    focusVisible: false,
  });
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        gap: theme().spacing.sm,
        opacity: props.loading ? 0 : 1,
      }}
    >
      {() => props.icon?.(iconContext)}
      <Show
        when={!iconOnly && isText()}
        fallback={iconOnly ? undefined : props.children}
      >
        {(_text) => (
          <Text
            style={[
              {
                color: palette().foreground,
                fontFamily: theme().typography.fontFamily,
                fontSize:
                  size() === 'sm'
                    ? theme().typography.smallFontSize
                    : theme().typography.fontSize,
                lineHeight: iconSize(),
                minWidth: 0,
                flexShrink: 1,
              },
              props.textStyle,
            ]}
          >
            {label()}
          </Text>
        )}
      </Show>
    </View>
  );
  const node = (
    <View
      style={[
        {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
          minWidth: side(),
          minHeight: side(),
          width: iconOnly ? side() : undefined,
          height: iconOnly ? side() : undefined,
          paddingInline: iconOnly
            ? 0
            : size() === 'sm'
              ? theme().spacing.sm
              : size() === 'lg'
                ? theme().spacing.lg
                : theme().spacing.md,
          paddingBlock: iconOnly ? 0 : theme().spacing.xs,
          borderWidth: props.variant === 'ghost' ? 0 : 1,
          borderColor: palette().border,
          backgroundColor: palette().background,
          borderRadius: theme().radius.md,
          opacity: props.disabled ? 0.5 : 1,
        },
        props.style,
      ]}
    >
      <View
        ref={(ring) => {
          ring._view.eventMode = 'none';
        }}
        style={{
          position: 'absolute',
          left: -4,
          right: -4,
          top: -4,
          bottom: -4,
          borderWidth: 2,
          borderColor: theme().colors.focusRing,
          borderRadius: theme().radius.md + 4,
          opacity: visual().focusVisible && !unavailable() ? 1 : 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: theme().radius.md,
          backgroundColor: palette().foreground,
          opacity: unavailable()
            ? 0
            : visual().pressed
              ? 0.16
              : visual().hovered
                ? 0.08
                : 0,
        }}
      />
      {content}
      <Show when={props.loading}>
        {(_loading) => (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner size={iconSize()} color={palette().foreground} />
          </View>
        )}
      </Show>
    </View>
  ) as PNode;
  function activate(event: ButtonPressEvent) {
    if (!node.isDestroyed && !unavailable()) props.onPress?.(event, node);
  }
  const pressable = createPressable(node, {
    get disabled() {
      return unavailable();
    },
    onPress: activate,
  });
  const focusable = createFocusable(node, {
    get name() {
      return name();
    },
    get disabled() {
      return unavailable();
    },
    onActivate: activate,
  });
  createEffect(() => {
    setVisual({
      hovered: pressable.hovered(),
      pressed: pressable.pressed() || focusable.pressed(),
      focusVisible: focusable.focusVisible(),
    });
  });
  createEffect(() => {
    if (props.loading) focusable.element.setAttribute('aria-busy', 'true');
    else focusable.element.removeAttribute('aria-busy');
  });
  return node;
}
