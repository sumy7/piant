import {
  createEffect,
  createState,
  mergeProps,
  type PInput,
  type PNode,
  untrack,
  View,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { Button } from './Button';
import { componentRoot } from './internal/componentRoot';
import { TextField, type TextFieldProps } from './TextField';

export interface NumberFieldProps extends Omit<
  TextFieldProps,
  'value' | 'defaultValue' | 'onValueChange' | 'type'
> {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  onInputValueChange?: (text: string, event: Event) => void;
  min?: number;
  max?: number;
  step?: number;
  decrementLabel?: string;
  incrementLabel?: string;
}

/** Decimal editing stays textual until Enter, blur, or an explicit step. */
export function NumberField(props: NumberFieldProps): ReturnType<typeof View> {
  return componentRoot(() => {
    let input: PInput;
    const bounds = () => {
      const min = props.min ?? -Infinity;
      const max = props.max ?? Infinity;
      const step = props.step ?? 1;
      if (
        Number.isNaN(min) ||
        Number.isNaN(max) ||
        min === Infinity ||
        max === -Infinity ||
        min > max ||
        !Number.isFinite(step) ||
        step <= 0
      )
        throw new Error(
          'NumberField requires an ordered range and a finite positive step.',
        );
      return { min, max, step };
    };
    const normalize = (n: number | null) => {
      if (n === null) return null;
      if (!Number.isFinite(n))
        throw new Error('NumberField value must be finite or null.');
      const { min, max } = bounds();
      return Math.min(max, Math.max(min, n));
    };
    const [value, setValue] = createControllableState<number | null>({
      get value() {
        return props.value;
      },
      defaultValue: props.defaultValue ?? null,
      onChange: (next) => props.onValueChange?.(next),
    });
    const display = () => {
      const n = normalize(value());
      return n === null ? '' : String(n);
    };
    const [text, setText] = createState(display());
    createEffect(() => {
      const next = display();
      bounds();
      untrack(() => setText(next));
    });
    const usable = () =>
      !props.disabled && !props.readOnly && !input?.isComposing;
    const parse = () => {
      const raw = text().trim();
      if (!raw) return null;
      // Reject coercions such as hex, Infinity, and incomplete exponents.
      return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) &&
        Number.isFinite(Number(raw))
        ? Number(raw)
        : undefined;
    };
    const commit = () => {
      if (!usable()) return;
      const parsed = parse();
      if (parsed !== undefined) setValue(normalize(parsed));
      setText(display());
    };
    const step = (direction: number) => {
      if (!usable()) return;
      const parsed = parse();
      const base = parsed ?? normalize(value()) ?? 0;
      const next = base + direction * bounds().step;
      if (!Number.isFinite(next)) return;
      setValue(normalize(Number(next.toPrecision(15))));
      setText(display());
      input.focus();
    };
    const field = TextField(
      mergeProps(props, {
        type: 'text',
        inputMode: 'decimal',
        get semantics() {
          const range = bounds();
          const current = normalize(value());
          return {
            role: 'spinbutton' as const,
            value:
              current === null
                ? undefined
                : {
                    now: current,
                    min: Number.isFinite(range.min) ? range.min : undefined,
                    max: Number.isFinite(range.max) ? range.max : undefined,
                  },
          };
        },
        get value() {
          return text();
        },
        ref(node: PInput) {
          input = node;
          props.ref?.(node);
        },
        onValueChange(next: string, event: Event) {
          setText(next);
          props.onInputValueChange?.(next, event);
        },
        onBlur(event: FocusEvent) {
          commit();
          props.onBlur?.(event);
        },
        onKeyDown(event: KeyboardEvent) {
          props.onKeyDown?.(event);
          if (event.defaultPrevented || event.isComposing || !usable()) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setText(display());
          } else if (
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            (event.key === 'ArrowUp' || event.key === 'ArrowDown')
          ) {
            event.preventDefault();
            step(event.key === 'ArrowUp' ? 1 : -1);
          }
        },
      }) as TextFieldProps,
    );
    const button = (direction: number) =>
      Button({
        children: direction > 0 ? '+' : '−',
        get name() {
          return direction > 0
            ? (props.incrementLabel ?? 'Increase')
            : (props.decrementLabel ?? 'Decrease');
        },
        variant: 'ghost',
        get size() {
          return props.size;
        },
        get disabled() {
          return Boolean(props.disabled || props.readOnly);
        },
        onPress: () => step(direction),
      });
    return View({
      style: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
      children: [
        button(-1),
        View({
          style: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
          children: field,
        }),
        button(1),
      ],
    }) as PNode;
  });
}
