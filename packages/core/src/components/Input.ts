import type { ViewStyles } from '../elements/layout/viewStyles';
import { PInput } from '../elements/PInput';
import { effect } from '../reactivity/effects';
import { splitProps } from '../reactivity/props';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
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
  const [styleProps, inputProps] = splitProps(props, ['style'], [
    'value',
    'defaultValue',
    'placeholder',
    'type',
    'disabled',
    'onInput',
    'onChange',
    'onFocus',
    'onBlur',
  ]);

  const element = new PInput();

  props.ref?.(element);

  effect(() => {
    element.setStyle(StyleSheet.flatten(styleProps.style) || {});
  });

  // Set initial defaultValue
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

  const handleInput = (event: Event) => {
    inputProps.onInput?.(element._inputElement.value, event);
  };

  const handleChange = (event: Event) => {
    inputProps.onChange?.(element._inputElement.value, event);
  };

  const handleFocus = (event: FocusEvent) => {
    inputProps.onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent) => {
    inputProps.onBlur?.(event);
  };

  element._inputElement.addEventListener('input', handleInput);
  element._inputElement.addEventListener('change', handleChange);
  element._inputElement.addEventListener('focus', handleFocus as EventListener);
  element._inputElement.addEventListener('blur', handleBlur as EventListener);

  return element as JSX.Element;
}
