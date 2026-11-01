import {
  createEffect,
  createMemo,
  createState,
  onCleanup,
  type PNode,
  root,
  Show,
  type StyleValue,
  Text,
  type TextProps,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../../primitives/createControllableState';
import { createFocusable } from '../../primitives/createFocusable';
import { createPressable } from '../../primitives/createPressable';
import { useUIFocus } from '../../primitives/focusScope';
import { useUITheme } from '../../theme/UIProvider';
import { Icon } from '../Icon';

export interface CheckableOptions<T extends boolean | 'mixed'> {
  label: string;
  checked?: T;
  defaultChecked?: T;
  onCheckedChange?: (checked: T) => void;
  disabled?: boolean;
  description?: string;
  style?: StyleValue<ViewStyles>;
  textStyle?: TextProps['style'];
  ref?: Parameters<typeof View>[0]['ref'];
}

/** Shared visuals and lifecycle, with role-specific keyboard behavior from focus. */
export function createCheckable<T extends boolean | 'mixed'>(
  props: CheckableOptions<T>,
  role: 'checkbox' | 'switch',
): ReturnType<typeof View> {
  useUIFocus();
  let disposed = false;
  let stop = () => {};
  let removeDestroy = () => {};
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  const result = root((cleanup) => {
    stop = cleanup;
    // Initialize once after enclosing compiled JSX getters settle, as Input does.
    return createMemo(() =>
      untrack(() => {
        try {
          const node = renderCheckable(props, role);
          removeDestroy = node.onDestroy(dispose);
          props.ref?.(
            node as Parameters<NonNullable<CheckableOptions<T>['ref']>>[0],
          );
          return node;
        } catch (error) {
          dispose();
          throw error;
        }
      }),
    );
  });
  onCleanup(dispose);
  return result;
}

function renderCheckable<T extends boolean | 'mixed'>(
  props: CheckableOptions<T>,
  role: 'checkbox' | 'switch',
): PNode {
  const theme = useUITheme();
  const label = () => {
    const value = props.label?.trim() ?? '';
    if (!value)
      throw new Error(
        `${role === 'checkbox' ? 'Checkbox' : 'ToggleSwitch'} requires a non-empty label.`,
      );
    return value;
  };
  label();
  const description = () => props.description?.trim() || undefined;
  const [checked, setChecked] = createControllableState<T>({
    get value() {
      return props.checked;
    },
    get defaultValue() {
      return props.defaultChecked ?? (false as T);
    },
    onChange: (value) => props.onCheckedChange?.(value),
  });
  const [visual, setVisual] = createState({
    hovered: false,
    pressed: false,
    focusVisible: false,
  });
  const indicatorSize = () => theme().typography.lineHeight;
  const node = (
    <View
      style={[
        {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme().spacing.sm,
          width: '100%',
          minWidth: 0,
          minHeight: theme().controlSize.md,
          padding: theme().spacing.xs,
          borderRadius: theme().radius.sm,
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
          borderRadius: theme().radius.sm + 4,
          opacity: visual().focusVisible && !props.disabled ? 1 : 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          borderRadius: theme().radius.sm,
          backgroundColor: theme().colors.text,
          opacity: props.disabled
            ? 0
            : visual().pressed
              ? 0.16
              : visual().hovered
                ? 0.08
                : 0,
        }}
      />
      <Icon
        size={indicatorSize()}
        style={{
          width: role === 'switch' ? indicatorSize() * 1.8 : indicatorSize(),
        }}
        draw={(graphics, width, height) => {
          const colors = theme().colors;
          const active = checked() !== false;
          const border = active ? colors.primary : colors.border;
          const background = active ? colors.primary : colors.surface;
          if (width <= 2 || height <= 2) return;
          const radius =
            role === 'switch'
              ? height / 2
              : Math.min(theme().radius.sm, height / 4);
          graphics
            .roundRect(1, 1, width - 2, height - 2, radius)
            .fill(background)
            .stroke({ color: border, width: 2 });
          if (role === 'switch') {
            const thumb = Math.max(0, (height - 6) / 2);
            graphics
              .circle(active ? width - thumb - 3 : thumb + 3, height / 2, thumb)
              .fill(active ? colors.onPrimary : colors.textMuted);
          } else if (active) {
            if (checked() === 'mixed') {
              graphics
                .moveTo(width * 0.25, height / 2)
                .lineTo(width * 0.75, height / 2);
            } else {
              graphics
                .moveTo(width * 0.25, height * 0.52)
                .lineTo(width * 0.43, height * 0.7)
                .lineTo(width * 0.77, height * 0.31);
            }
            graphics.stroke({
              color: colors.onPrimary,
              width: Math.max(1.5, height * 0.1),
              cap: 'round',
              join: 'round',
            });
          }
        }}
      />
      <View style={{ flex: 1, minWidth: 0, gap: theme().spacing.xs }}>
        <Text
          style={[
            {
              color: theme().colors.text,
              fontFamily: theme().typography.fontFamily,
              fontSize: theme().typography.fontSize,
              lineHeight: theme().typography.lineHeight,
              minWidth: 0,
            },
            props.textStyle,
          ]}
        >
          {label()}
        </Text>
        <Show when={Boolean(description())}>
          {(_description) => (
            <Text
              style={{
                color: theme().colors.textMuted,
                fontFamily: theme().typography.fontFamily,
                fontSize: theme().typography.smallFontSize,
                lineHeight: theme().typography.smallLineHeight,
                minWidth: 0,
              }}
            >
              {description()}
            </Text>
          )}
        </Show>
      </View>
    </View>
  ) as PNode;
  const activate = () => {
    if (!node.isDestroyed && !props.disabled)
      setChecked((value) => (value === 'mixed' ? true : !value) as T);
  };
  const pressable = createPressable(node, {
    get disabled() {
      return props.disabled;
    },
    onPress: activate,
  });
  const focusable = createFocusable(node, {
    role,
    get name() {
      return label();
    },
    get description() {
      return description();
    },
    get checked() {
      return checked();
    },
    get disabled() {
      return props.disabled;
    },
    onActivate: activate,
  });
  createEffect(() => {
    const next = {
      hovered: pressable.hovered(),
      pressed: pressable.pressed() || focusable.pressed(),
      focusVisible: focusable.focusVisible(),
    };
    // PNode destroys children before firing its own destruction callbacks.
    // Disposing focus/press must not restyle already-freed child Yoga nodes.
    if (!node.isDestroyed) setVisual(next);
  });
  return node;
}
