import { mergeProps, type PInput, type PNode, View } from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { Button } from './Button';
import { componentRoot } from './internal/componentRoot';
import { TextField, type TextFieldProps } from './TextField';

export interface SearchFieldProps extends TextFieldProps {
  /** Enter submits the current text synchronously; input is never debounced. */
  onSearch?: (value: string, event: KeyboardEvent) => void;
  onClear?: () => void;
  clearLabel?: string;
}

/** Search editing uses the same native input and focus target as TextField. */
export function SearchField(props: SearchFieldProps): ReturnType<typeof View> {
  return componentRoot(() => {
    let input: PInput;
    const [value, setValue] = createControllableState({
      get value() {
        return props.value;
      },
      defaultValue: props.defaultValue ?? '',
    });
    const clear = () => {
      if (props.disabled || props.readOnly || input?.isComposing || !value())
        return;
      setValue('');
      props.onValueChange?.('', new Event('input'));
      props.onClear?.();
      input.focus();
    };
    const field = TextField(
      mergeProps(props, {
        // Native search inputs clear on Escape even during IME in Chromium.
        // Keep text editing native; this component alone owns search clearing.
        type: 'text',
        get enterKeyHint() {
          return props.enterKeyHint ?? 'search';
        },
        get semantics() {
          return { ...props.semantics, role: 'searchbox' as const };
        },
        get value() {
          return value();
        },
        ref(node: PInput) {
          input = node;
          props.ref?.(node);
        },
        onValueChange(next: string, event: Event) {
          setValue(next);
          props.onValueChange?.(next, event);
        },
        onKeyDown(event: KeyboardEvent) {
          props.onKeyDown?.(event);
          if (
            event.defaultPrevented ||
            event.isComposing ||
            input?.isComposing ||
            props.disabled
          )
            return;
          if (event.key === 'Enter') {
            event.preventDefault();
            props.onSearch?.(value(), event);
          }
          if (event.key === 'Escape' && !props.readOnly && value()) {
            event.preventDefault();
            clear();
          }
        },
      }) as TextFieldProps,
    );
    return View({
      style: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
      children: [
        View({
          style: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
          children: field,
        }),
        Button({
          get children() {
            return props.clearLabel ?? 'Clear search';
          },
          variant: 'ghost',
          get size() {
            return props.size;
          },
          get disabled() {
            return Boolean(props.disabled || props.readOnly || !value());
          },
          onPress: clear,
        }),
      ],
    }) as PNode;
  });
}
