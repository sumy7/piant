import type { ViewStyles } from '../elements/layout/viewStyles';
import { PInput } from '../elements/PInput';
import { bindDOMEvents } from '../events';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import { bindStyle } from './bindStyle';
import type { RefCallback } from './types';

export type InputProps = {
  style?: StyleValue<ViewStyles>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  onInput?: (value: string, event: Event) => void;
  onChange?: (value: string, event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  ref?: RefCallback<PInput>;
};

export function Input(props: InputProps): JSX.Element {
  const [styleProps, inputProps] = splitProps(
    props,
    ['style'],
    [
      'value',
      'defaultValue',
      'placeholder',
      'type',
      'disabled',
      'onInput',
      'onChange',
      'onFocus',
      'onBlur',
    ],
  );

  const element = new PInput();

  props.ref?.(element);

  bindStyle<ViewStyles>(element, () => StyleSheet.flatten(styleProps.style));

  // defaultValue is initialization-only (mirrors HTML semantics)
  if (inputProps.defaultValue !== undefined) {
    element._inputElement.value = inputProps.defaultValue;
  }

  effect(() => {
    const el = element._inputElement;
    if (inputProps.value !== undefined && el.value !== inputProps.value) {
      el.value = inputProps.value;
    }
  });

  effect(() => {
    element._inputElement.placeholder = inputProps.placeholder ?? '';
  });

  effect(() => {
    element._inputElement.type = inputProps.type ?? 'text';
  });

  effect(() => {
    element._inputElement.disabled = inputProps.disabled ?? false;
  });

  // Stable wrappers read the current props when a native event arrives.
  bindDOMEvents(element._inputElement, {
    input: (event) => inputProps.onInput?.(element._inputElement.value, event),
    change: (event) =>
      inputProps.onChange?.(element._inputElement.value, event),
    focus: (event) => inputProps.onFocus?.(event),
    blur: (event) => inputProps.onBlur?.(event),
  });

  return element as JSX.Element;
}
