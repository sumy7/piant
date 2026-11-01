import {
  createEffect,
  createMemo,
  createState,
  Input,
  type InputProps,
  type InputStyles,
  onCleanup,
  type PInput,
  root,
  type StyleValue,
  untrack,
  useContext,
} from '@piant/core';
import {
  createFocusable,
  type FocusableState,
} from '../primitives/createFocusable';
import { useUIFocus } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { FieldContext, type FieldScope } from './internal/fieldContext';

export type TextFieldSize = 'sm' | 'md' | 'lg';
export type TextFieldType =
  'text' | 'search' | 'email' | 'url' | 'tel' | 'password';

const forwarded = [
  'value',
  'defaultValue',
  'placeholder',
  'name',
  'autoComplete',
  'inputMode',
  'enterKeyHint',
  'minLength',
  'maxLength',
  'pattern',
  'onFocus',
  'onBlur',
  'onBeforeInput',
  'onKeyDown',
  'onKeyUp',
  'onCompositionStart',
  'onCompositionUpdate',
  'onCompositionEnd',
  'onCopy',
  'onCut',
  'onPaste',
  'onSelect',
] as const;

export interface TextFieldProps extends Pick<
  InputProps,
  | (typeof forwarded)[number]
  | 'disabled'
  | 'readOnly'
  | 'id'
  | 'required'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'aria-errormessage'
  | 'onInput'
  | 'onChange'
> {
  size?: TextFieldSize;
  type?: TextFieldType;
  invalid?: boolean;
  onValueChange?: (value: string, event: Event) => void;
  style?: StyleValue<InputStyles>;
  ref?: (node: PInput) => void;
}

let nextInputId = 0;

/** One native Input; editing, controlled synchronization and IME stay in core. */
export function TextField(props: TextFieldProps): ReturnType<typeof Input> {
  useUIFocus();
  const field = useContext(FieldContext);
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
    // Wait for enclosing JSX getter memos before snapshotting native defaults.
    // Untrack keeps this factory initialization-only; Input owns live updates.
    return createMemo(() =>
      untrack(() => {
        try {
          const node = renderTextField(props, field);
          removeDestroy = node.onDestroy(dispose);
          props.ref?.(node);
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

function renderTextField(
  props: TextFieldProps,
  field: FieldScope | undefined,
): PInput {
  const theme = useUITheme();
  const marker = `piant-text-field-${++nextInputId}`;
  const fallbackId = field?.controlId ?? marker;
  const id = () => props.id ?? fallbackId;
  const name = () => {
    const value = props['aria-label'] ?? field?.label() ?? '';
    if (!field && !value.trim() && !props['aria-labelledby']?.trim())
      throw new Error('TextField requires a Field or an accessible name.');
    return value;
  };
  name();
  const invalid = () => Boolean(props.invalid || field?.error());
  const required = () => Boolean(props.required || field?.required());
  const [focus, setFocus] = createState<FocusableState>();
  const inputProps: InputProps = {
    get id() {
      return id();
    },
    get type() {
      const type = props.type ?? 'text';
      if (!['text', 'search', 'email', 'url', 'tel', 'password'].includes(type))
        throw new Error(
          'TextField supports single-line text input types only.',
        );
      return type;
    },
    get disabled() {
      return props.disabled;
    },
    get readOnly() {
      return props.readOnly;
    },
    get required() {
      return required();
    },
    get 'aria-required'() {
      return required() || undefined;
    },
    get 'aria-label'() {
      return name() || undefined;
    },
    get 'aria-labelledby'() {
      return (
        props['aria-labelledby'] ??
        (props['aria-label'] === undefined ? field?.labelId : undefined)
      );
    },
    get 'aria-describedby'() {
      const ids = [
        props['aria-describedby'],
        field?.description() ? field.descriptionId : undefined,
        field?.error() ? field.errorId : undefined,
      ]
        .filter(Boolean)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean);
      return [...new Set(ids)].join(' ') || undefined;
    },
    get 'aria-errormessage'() {
      return (
        props['aria-errormessage'] ??
        (field?.error() ? field.errorId : undefined)
      );
    },
    get 'aria-invalid'() {
      return invalid() || undefined;
    },
    get style(): StyleValue<InputStyles> {
      const t = theme();
      const small = props.size === 'sm';
      const lineHeight = small
        ? t.typography.smallLineHeight
        : t.typography.lineHeight;
      return [
        {
          width: '100%',
          minWidth: 0,
          minHeight: Math.max(
            t.controlSize[props.size ?? 'md'],
            lineHeight + t.spacing.xs * 2 + 4,
          ),
          paddingInline: small ? t.spacing.sm : t.spacing.md,
          paddingBlock: t.spacing.xs,
          borderWidth: 2,
          borderRadius: t.radius.md,
          borderColor: focus()?.focused()
            ? t.colors.focusRing
            : invalid()
              ? t.colors.danger
              : t.colors.border,
          backgroundColor:
            props.disabled || props.readOnly
              ? t.colors.surfaceRaised
              : t.colors.surface,
          color: t.colors.text,
          caretColor: t.colors.primary,
          fontFamily: t.typography.fontFamily,
          fontSize: small ? t.typography.smallFontSize : t.typography.fontSize,
          lineHeight,
          opacity: props.disabled ? 0.5 : 1,
        },
        props.style,
      ];
    },
    onInput(value, event) {
      if (props.disabled || props.readOnly) return;
      props.onValueChange?.(value, event);
      props.onInput?.(value, event);
    },
    onChange(value, event) {
      if (!props.disabled && !props.readOnly) props.onChange?.(value, event);
    },
  };
  for (const key of forwarded)
    Object.defineProperty(inputProps, key, {
      enumerable: true,
      get: () => props[key],
    });
  const node = Input(inputProps) as PInput;
  const native = node.element;
  const placeholderStyle = native.ownerDocument.createElement('style');
  native.setAttribute('data-piant-text-field', marker);
  placeholderStyle.textContent = `input[data-piant-text-field="${marker}"]::placeholder{color:var(--piant-placeholder-color);opacity:1}`;
  node.domElement.hostElement.append(placeholderStyle);
  createEffect(() => {
    native.style.setProperty(
      '--piant-placeholder-color',
      theme().colors.textMuted,
    );
  });
  onCleanup(() => {
    placeholderStyle.remove();
    native.removeAttribute('data-piant-text-field');
    native.style.removeProperty('--piant-placeholder-color');
  });
  setFocus(
    createFocusable(node, {
      domElement: node.domElement,
      get name() {
        return name();
      },
    }),
  );
  const release = field?.register(
    Object.freeze({ node, id, required: () => Boolean(props.required) }),
  );
  if (release) onCleanup(release);
  return node;
}
