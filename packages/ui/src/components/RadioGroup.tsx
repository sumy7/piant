import {
  createEffect,
  createMemo,
  createState,
  For,
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
import { createControllableState } from '../primitives/createControllableState';
import {
  createFocusable,
  type FocusableState,
} from '../primitives/createFocusable';
import { createPressable } from '../primitives/createPressable';
import { createRovingFocusGroup, useUIFocus } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { Icon } from './Icon';

export interface RadioGroupOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface RadioGroupProps {
  label: string;
  description?: string;
  options: readonly RadioGroupOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** Visual arrangement; all four arrow keys remain available. */
  orientation?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  style?: StyleValue<ViewStyles>;
  textStyle?: TextProps['style'];
  ref?: Parameters<typeof View>[0]['ref'];
}

/** A non-toolbar radio group with one Tab stop and selection on arrow navigation. */
export function RadioGroup(props: RadioGroupProps): ReturnType<typeof View> {
  useUIFocus();
  let stop = () => {};
  let removeDestroy = () => {};
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    removeDestroy();
  }
  const result = root((cleanup) => {
    stop = cleanup;
    return createMemo(() =>
      untrack(() => {
        try {
          const node = renderRadioGroup(props);
          removeDestroy = node.onDestroy(dispose);
          props.ref?.(
            node as Parameters<NonNullable<RadioGroupProps['ref']>>[0],
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

function renderRadioGroup(props: RadioGroupProps): PNode {
  const theme = useUITheme();
  const scope = useUIFocus();
  const label = () => {
    const text = props.label?.trim();
    if (!text) throw new Error('RadioGroup requires a non-empty label.');
    return text;
  };
  label();
  const options = createMemo(() => {
    const values = new Set<string>();
    for (const option of props.options) {
      if (!option.label.trim())
        throw new Error('Radio options require non-empty labels.');
      if (values.has(option.value))
        throw new Error('Radio option values must be unique.');
      values.add(option.value);
    }
    return props.options;
  });
  const keys = createMemo(() => options().map((option) => option.value));
  const [value, setValue] = createControllableState<string | undefined>({
    get value() {
      return props.value;
    },
    defaultValue: props.defaultValue,
    onChange(next) {
      if (next !== undefined) props.onValueChange?.(next);
    },
  });
  const members = new Map<string, FocusableState>();
  const [revision, setRevision] = createState(0);
  const group = createRovingFocusGroup({
    role: 'radiogroup',
    get name() {
      return label();
    },
    get description() {
      return props.description;
    },
    orientation: 'both',
    get dir() {
      return props.dir;
    },
    onNavigate(element) {
      const key = [...members].find(
        ([, member]) => member.element === element,
      )?.[0];
      if (key !== undefined) select(key);
    },
  });
  function select(key: string) {
    const option = options().find((item) => item.value === key);
    if (!props.disabled && option && !option.disabled) setValue(key);
  }
  const textStyle = () => ({
    fontFamily: theme().typography.fontFamily,
    fontSize: theme().typography.fontSize,
    lineHeight: theme().typography.lineHeight,
    color: theme().colors.text,
    minWidth: 0,
    flexShrink: 1,
  });
  const smallStyle = () => ({
    ...textStyle(),
    fontSize: theme().typography.smallFontSize,
    lineHeight: theme().typography.smallLineHeight,
    color: theme().colors.textMuted,
  });
  function optionView(key: string): PNode {
    let stopOption = () => {};
    let removeDestroyOption = () => {};
    let closed = false;
    function disposeOption() {
      if (closed) return;
      closed = true;
      stopOption();
      removeDestroyOption();
    }
    const node = root((cleanup) => {
      stopOption = cleanup;
      const option = () => options().find((item) => item.value === key);
      const disabled = () =>
        Boolean(props.disabled || !option() || option()?.disabled);
      const checked = () => value() === key;
      const [visual, setVisual] = createState({
        hovered: false,
        pressed: false,
        focusVisible: false,
      });
      const row = (
        <View
          style={{
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: 0,
            maxWidth: '100%',
            width: props.orientation === 'horizontal' ? undefined : '100%',
            minHeight: theme().controlSize.md,
            padding: theme().spacing.xs,
            gap: theme().spacing.sm,
            borderRadius: theme().radius.md,
            opacity: disabled() ? 0.5 : 1,
          }}
        >
          <View
            ref={(ring) => {
              ring._view.eventMode = 'none';
            }}
            style={{
              position: 'absolute',
              left: -2,
              right: -2,
              top: -2,
              bottom: -2,
              borderWidth: 2,
              borderColor: theme().colors.focusRing,
              borderRadius: theme().radius.md + 2,
              opacity: visual().focusVisible && !disabled() ? 1 : 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: theme().colors.text,
              borderRadius: theme().radius.md,
              opacity: disabled()
                ? 0
                : visual().pressed
                  ? 0.16
                  : visual().hovered
                    ? 0.08
                    : 0,
            }}
          />
          <Icon
            size={theme().typography.lineHeight}
            draw={(graphics, width, height) => {
              const side = Math.min(width, height);
              const cx = width / 2;
              const cy = height / 2;
              graphics
                .circle(cx, cy, Math.max(0, side / 2 - 1))
                .fill(theme().colors.surface)
                .stroke({
                  color: checked()
                    ? theme().colors.primary
                    : theme().colors.border,
                  width: 2,
                });
              if (checked())
                graphics.circle(cx, cy, side / 4).fill(theme().colors.primary);
            }}
          />
          <View
            style={{
              flexDirection: 'column',
              minWidth: 0,
              flexShrink: 1,
              gap: theme().spacing.xs,
            }}
          >
            <Text style={[textStyle(), props.textStyle]}>
              {option()?.label}
            </Text>
            <Show when={Boolean(option()?.description)}>
              {(_description) => (
                <Text style={smallStyle()}>{option()?.description}</Text>
              )}
            </Show>
          </View>
        </View>
      ) as PNode;
      const activate = () => {
        if (!row.isDestroyed) select(key);
      };
      const press = createPressable(row, {
        get disabled() {
          return disabled();
        },
        onPress: activate,
      });
      const focus = createFocusable(row, {
        role: 'radio',
        group,
        get name() {
          return option()?.label ?? key;
        },
        get description() {
          return option()?.description;
        },
        get checked() {
          return checked();
        },
        get disabled() {
          return disabled();
        },
        onActivate: activate,
      });
      members.set(key, focus);
      setRevision((current) => current + 1);
      onCleanup(() => {
        members.delete(key);
        setRevision((current) => current + 1);
      });
      createEffect(() => {
        const next = {
          hovered: press.hovered(),
          pressed: press.pressed() || focus.pressed(),
          focusVisible: focus.focusVisible(),
        };
        if (!row.isDestroyed) setVisual(next);
      });
      return row;
    });
    removeDestroyOption = node.onDestroy(disposeOption);
    onCleanup(disposeOption);
    return node;
  }
  const node = (
    <View
      style={[
        { flexDirection: 'column', minWidth: 0, gap: theme().spacing.sm },
        props.style,
      ]}
    >
      <Text style={[textStyle(), props.textStyle]}>{label()}</Text>
      <Show when={Boolean(props.description)}>
        {(_description) => (
          <Text style={smallStyle()}>{props.description}</Text>
        )}
      </Show>
      <View
        style={{
          flexDirection: props.orientation === 'horizontal' ? 'row' : 'column',
          flexWrap: props.orientation === 'horizontal' ? 'wrap' : 'nowrap',
          width: '100%',
          minWidth: 0,
          gap: theme().spacing.sm,
        }}
      >
        <For each={keys()}>{(key) => optionView(key)}</For>
      </View>
    </View>
  ) as PNode;
  createEffect(() => {
    const selected = value();
    const list = options();
    revision();
    const focused = scope.focused();
    if ([...members.values()].some((member) => member.element === focused))
      return;
    const enabled = list.filter(
      (option) => !props.disabled && !option.disabled,
    );
    const target =
      enabled.find((option) => option.value === selected) ?? enabled[0];
    if (target) {
      const member = members.get(target.value);
      if (member) group.setTabStop(member.element);
    }
  });
  return node;
}
