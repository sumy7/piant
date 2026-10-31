import {
  isComposingInput,
  registerInputComposition,
} from '../elements/inputComposition';
import type { InputStyles } from '../elements/inputStyles';
import { PInput } from '../elements/PInput';
import { bindDOMEvents } from '../events';
import { effect, root, untrack } from '../reactivity/effects';
import { onCleanup } from '../reactivity/hooks';
import { splitProps } from '../reactivity/props';
import type { StyleValue } from '../styleSheet';
import { StyleSheet } from '../styleSheet';
import { bindStyle } from './bindStyle';
import type { RefCallback } from './types';

export type InputProps = {
  style?: StyleValue<InputStyles>;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  inputMode?: string;
  enterKeyHint?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  onInput?: (value: string, event: Event) => void;
  onChange?: (value: string, event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onBeforeInput?: (event: InputEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onCompositionStart?: (event: CompositionEvent) => void;
  onCompositionUpdate?: (event: CompositionEvent) => void;
  onCompositionEnd?: (event: CompositionEvent) => void;
  onCopy?: (event: ClipboardEvent) => void;
  onCut?: (event: ClipboardEvent) => void;
  onPaste?: (event: ClipboardEvent) => void;
  onSelect?: (event: Event) => void;
  ref?: RefCallback<PInput>;
};

export function Input(props: InputProps): JSX.Element {
  const [styleProps, inputProps] = splitProps(props, ['style']);
  const element = new PInput();
  const dispose = root((dispose) => {
    const native = element.element;
    const composition = registerInputComposition(native);
    const state = composition.state;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;

    function syncValue() {
      const next = inputProps.value;
      if (
        !active ||
        state.composing ||
        state.settling ||
        next === undefined ||
        native.value === next
      )
        return;
      const supportsSelection = /^(text|search|tel|url|password)$/.test(
        native.type,
      );
      const start = supportsSelection ? native.selectionStart : null;
      const end = supportsSelection ? native.selectionEnd : null;
      const direction = supportsSelection ? native.selectionDirection : null;
      native.value = next;
      if (start !== null && end !== null) {
        native.setSelectionRange(
          Math.min(start, next.length),
          Math.min(end, next.length),
          direction ?? undefined,
        );
      }
    }
    function settle() {
      state.composing = false;
      state.settling = true;
      clearTimeout(timer);
      // Leave the browser's compositionend/final input sequence intact. The
      // latest controlled value wins after this event turn, without fake input.
      timer = setTimeout(() => {
        if (!active || state.composing) return;
        state.settling = false;
        untrack(syncValue);
      }, 0);
    }
    function businessKey(event: KeyboardEvent, down: boolean) {
      if (
        (event.key === 'Enter' || event.key === 'Escape') &&
        isComposingInput(event)
      ) {
        if (down) state.guardedKeys.add(event.key);
        else state.guardedKeys.delete(event.key);
        event.stopPropagation();
        return;
      }
      if (down) inputProps.onKeyDown?.(event);
      else inputProps.onKeyUp?.(event);
    }
    bindDOMEvents(native, {
      beforeinput: (event) => inputProps.onBeforeInput?.(event as InputEvent),
      input(event) {
        if ((event as InputEvent).isComposing) state.composing = true;
        try {
          inputProps.onInput?.(native.value, event);
        } finally {
          untrack(syncValue);
        }
      },
      change: (event) => inputProps.onChange?.(native.value, event),
      focus: (event) => inputProps.onFocus?.(event),
      blur(event) {
        state.guardedKeys.clear();
        if (state.composing) settle();
        inputProps.onBlur?.(event);
      },
      keydown: (event) => businessKey(event, true),
      keyup: (event) => businessKey(event, false),
      compositionstart(event) {
        clearTimeout(timer);
        state.settling = false;
        state.composing = true;
        inputProps.onCompositionStart?.(event);
      },
      compositionupdate: (event) => inputProps.onCompositionUpdate?.(event),
      compositionend(event) {
        settle();
        inputProps.onCompositionEnd?.(event);
      },
      copy: (event) => inputProps.onCopy?.(event),
      cut: (event) => inputProps.onCut?.(event),
      paste: (event) => inputProps.onPaste?.(event),
      select: (event) => inputProps.onSelect?.(event),
    });
    onCleanup(() => {
      active = false;
      clearTimeout(timer);
      composition.dispose();
    });
    props.ref?.(element);
    if (element.isDestroyed) return dispose;
    bindStyle<InputStyles>(element, () => StyleSheet.flatten(styleProps.style));
    if (inputProps.defaultValue !== undefined) {
      native.defaultValue = inputProps.defaultValue;
      native.value = inputProps.defaultValue;
    }
    effect(syncValue);
    effect(() => {
      native.placeholder = inputProps.placeholder ?? '';
    });
    effect(() => {
      native.type = inputProps.type ?? 'text';
    });
    effect(() => {
      native.disabled = inputProps.disabled ?? false;
      native.readOnly = inputProps.readOnly ?? false;
      if ((native.disabled || native.readOnly) && state.composing) settle();
    });
    // Only declared attributes are owned here. A ref adapter may supply its own
    // name/description/tabindex when the corresponding prop was not provided.
    const attributes = {
      id: 'id',
      name: 'name',
      autoComplete: 'autocomplete',
      inputMode: 'inputmode',
      enterKeyHint: 'enterkeyhint',
      required: 'required',
      minLength: 'minlength',
      maxLength: 'maxlength',
      min: 'min',
      max: 'max',
      step: 'step',
      pattern: 'pattern',
      tabIndex: 'tabindex',
      role: 'role',
      'aria-label': 'aria-label',
      'aria-labelledby': 'aria-labelledby',
      'aria-describedby': 'aria-describedby',
      'aria-errormessage': 'aria-errormessage',
      'aria-invalid': 'aria-invalid',
      'aria-required': 'aria-required',
      'aria-expanded': 'aria-expanded',
      'aria-controls': 'aria-controls',
      'aria-activedescendant': 'aria-activedescendant',
      'aria-autocomplete': 'aria-autocomplete',
    } as const;
    for (const [key, attribute] of Object.entries(attributes)) {
      const prop = key as keyof typeof attributes;
      if (!Object.hasOwn(inputProps, prop)) continue;
      effect(() => {
        const value = inputProps[prop];
        if (value === undefined || (prop === 'required' && value === false))
          native.removeAttribute(attribute);
        else
          native.setAttribute(
            attribute,
            prop === 'required' ? '' : String(value),
          );
      });
    }
    return dispose;
  });
  const removeDestroy = element.onDestroy(dispose);
  onCleanup(() => {
    removeDestroy();
    dispose();
  });
  return element as JSX.Element;
}
