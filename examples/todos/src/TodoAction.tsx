import {
  attachDOMElement,
  createEffect,
  createState,
  onCleanup,
  type StyleValue,
  Text,
  View,
  type ViewStyles,
} from '@piant/core';
import { adoptTodoDOM } from './TodoSemantics';

interface TodoActionProps {
  label: string;
  text?: string;
  id?: string;
  variant?: 'primary' | 'quiet' | 'danger';
  selected?: boolean;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  style?: StyleValue<ViewStyles>;
  onPress: () => void;
}

/** Canvas visuals with a native button for pointer, keyboard and AT activation. */
export function TodoAction(props: TodoActionProps) {
  const [hovered, setHovered] = createState(false);
  const [focused, setFocused] = createState(false);
  const button = document.createElement('button');
  button.type = 'button';
  button.style.cssText =
    'opacity:0;pointer-events:auto;border:0;cursor:pointer;';
  const node = (
    <View
      ref={(node) => {
        adoptTodoDOM(attachDOMElement(node, button).hostElement);
      }}
      style={[
        {
          minHeight: 40,
          paddingLeft: 12,
          paddingRight: 12,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          borderWidth: 1,
          borderRadius: 8,
          borderColor: focused() ? '#2563eb' : '#dce3ec',
          backgroundColor:
            props.variant === 'primary' || props.selected
              ? '#2563eb'
              : hovered()
                ? '#edf2f8'
                : '#ffffff',
          opacity: props.disabled ? 0.45 : 1,
        },
        props.style,
      ]}
    >
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          fontWeight: '600',
          color:
            props.variant === 'primary' || props.selected
              ? '#ffffff'
              : props.variant === 'danger'
                ? '#b42335'
                : '#475569',
        }}
      >
        {props.text ?? props.label}
      </Text>
    </View>
  );
  createEffect(() => {
    button.id = props.id ?? '';
    button.setAttribute('aria-label', props.label);
    button.disabled = Boolean(props.disabled);
    if (props.checked !== undefined) {
      button.setAttribute('role', 'checkbox');
      button.setAttribute('aria-checked', String(props.checked));
    }
    if (props.selected !== undefined && props.checked === undefined)
      button.setAttribute('aria-pressed', String(props.selected));
  });
  button.onclick = () => {
    if (!button.disabled && button.isConnected) props.onPress();
  };
  button.onfocus = () => setFocused(true);
  button.onblur = () => setFocused(false);
  button.onpointerenter = () => setHovered(true);
  button.onpointerleave = () => setHovered(false);
  onCleanup(() => {
    button.onclick = null;
    button.onfocus = null;
    button.onblur = null;
    button.onpointerenter = null;
    button.onpointerleave = null;
  });
  return node;
}
