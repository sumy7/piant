import {
  CustomView,
  createEffect,
  createState,
  isComposingInput,
  onCleanup,
  type PInput,
  type PNode,
  Show,
  type StyleValue,
  Text,
  untrack,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { useUITheme } from '../theme/UIProvider';
import { Field } from './Field';
import { ColorArea } from './internal/ColorArea';
import {
  formatHexColor,
  type Hsva,
  hsvaToRgba,
  normalizeHsva,
  parseHexColor,
  rgbaToHsva,
} from './internal/colorValue';
import { componentRoot } from './internal/componentRoot';
import { NumberField } from './NumberField';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './Popover';
import { Slider } from './Slider';
import { TextField, type TextFieldSize } from './TextField';

export interface ColorPickerProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (hex: string) => void;
  /** False forces opaque six-digit output and hides alpha controls. */
  alpha?: boolean;
  disabled?: boolean;
  /** Read-only can open and copy the current value, but cannot edit. */
  readOnly?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: TextFieldSize;
  popupWidth?: number;
  popupHeight?: number;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
  onError?: (error: unknown) => void;
}

/** An immediate-commit HSVA editor with canonical hex as its public value. */
export function ColorPicker(props: ColorPickerProps): ReturnType<typeof View> {
  return componentRoot(() => {
    const theme = useUITheme();
    let rootNode: PNode | undefined;
    let closing = false;
    let previousAlpha = props.alpha !== false;
    const alpha = () => props.alpha !== false;
    const canonicalize = (text: string) => {
      const rgba = parseHexColor(text);
      if (!rgba) throw new Error('ColorPicker value must be a CSS hex color.');
      return formatHexColor({ ...rgba, a: alpha() ? rgba.a : 1 }, alpha());
    };
    const [value, setValue] = createControllableState({
      get value() {
        return props.value;
      },
      defaultValue: canonicalize(props.defaultValue ?? '#3366ffff'),
      onChange: (next) => {
        if (!disposed && !rootNode?.isDestroyed) props.onValueChange?.(next);
      },
    });
    const current = () => canonicalize(value());
    const [intent, setIntent] = createState<Hsva>(
      rgbaToHsva(parseHexColor(current())!),
    );
    const [draft, setDraft] = createState(current());
    const [editing, setEditing] = createState(false);
    const [open, setOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (next) => {
        if (!disposed && !rootNode?.isDestroyed) props.onOpenChange?.(next);
      },
    });
    let disposed = false;
    let hex: PInput | undefined;
    const blocked = () =>
      disposed ||
      Boolean(
        rootNode?.isDestroyed || closing || props.disabled || props.readOnly,
      );
    const project = (next: Hsva) =>
      canonicalize(formatHexColor(hsvaToRgba(next)));
    createEffect(() => {
      if (!props.label?.trim())
        throw new Error('ColorPicker requires a label.');
      const accepted = current();
      const mode = alpha();
      untrack(() => {
        const previous = intent();
        if (project(previous) !== accepted)
          setIntent(rgbaToHsva(parseHexColor(accepted)!, previous));
        else if (!alpha() && previous.a !== 1) setIntent({ ...previous, a: 1 });
        if (!editing() || mode !== previousAlpha) setDraft(accepted);
        previousAlpha = mode;
      });
    });
    createEffect(() => {
      if (!props.disabled) return;
      untrack(() => {
        if (disposed || rootNode?.isDestroyed) return;
        // Masking Popover's open prop alone would retain our uncontrolled true
        // state and reopen on enable. Request closure at the state owner too.
        closing = true;
        setOpen(false);
        if (disposed || rootNode?.isDestroyed) return;
        setEditing(false);
        setDraft(current());
      });
    });
    function change(next: Hsva) {
      if (blocked()) return;
      const previous = intent();
      const candidate = normalizeHsva({ ...next, a: alpha() ? next.a : 1 });
      const output = project(candidate);
      // Retain hue on gray and saturation on black even if the RGB projection
      // did not change. A rejected controlled RGB request retains old intent.
      setIntent(candidate);
      if (output !== current()) setValue(output);
      if (disposed) return;
      if (current() !== output)
        setIntent(rgbaToHsva(parseHexColor(current())!, previous));
      if (!editing()) setDraft(current());
    }
    function commitHex() {
      if (disposed || hex?.isComposing) return;
      if (!blocked()) {
        const parsed = parseHexColor(draft());
        if (parsed) change(rgbaToHsva(parsed, intent()));
      }
      if (!disposed) setDraft(current());
    }
    const preview = () =>
      CustomView({
        get style(): StyleValue<ViewStyles> {
          return {
            width: theme().controlSize.sm,
            height: theme().controlSize.sm,
            flexShrink: 0,
          };
        },
        onDraw(graphics, width, height) {
          const t = theme();
          const rgba = parseHexColor(current())!;
          graphics.clear();
          const tile = 6;
          for (let y = 0; y < height; y += tile)
            for (let x = 0; x < width; x += tile)
              graphics
                .rect(
                  x,
                  y,
                  Math.min(tile, width - x),
                  Math.min(tile, height - y),
                )
                .fill(
                  (Math.floor(x / tile) + Math.floor(y / tile)) % 2
                    ? t.colors.border
                    : t.colors.surface,
                );
          graphics
            .rect(0, 0, width, height)
            .fill({ color: formatHexColor(rgba, false), alpha: rgba.a });
          graphics
            .rect(0, 0, width, height)
            .stroke({ color: t.colors.border, width: 1 });
        },
      });
    const valueText = () =>
      Text({
        get style() {
          const t = theme();
          return {
            color: t.colors.text,
            fontFamily: t.typography.fontFamily,
            fontSize: t.typography.fontSize,
            lineHeight: t.typography.lineHeight,
            minWidth: 0,
            flexShrink: 1,
          };
        },
        get children() {
          return current();
        },
      });
    const numeric = (channel: keyof Hsva, label: string) =>
      Field({
        label,
        children: () =>
          NumberField({
            get 'aria-label'() {
              return `${props.label} ${channel === 'h' ? 'Hue' : channel === 's' ? 'Saturation' : channel === 'v' ? 'Brightness' : 'Alpha'}`;
            },
            get value() {
              return Number(
                (channel === 'h'
                  ? intent().h
                  : intent()[channel] * 100
                ).toFixed(2),
              );
            },
            min: 0,
            max: channel === 'h' ? 360 : 100,
            step: 1,
            get size() {
              return props.size;
            },
            get disabled() {
              return props.disabled;
            },
            get readOnly() {
              return props.readOnly;
            },
            onValueChange(next) {
              if (next !== null)
                change({
                  ...intent(),
                  [channel]: channel === 'h' ? next : next / 100,
                });
            },
            get decrementLabel() {
              return `Decrease ${props.label} ${label}`;
            },
            get incrementLabel() {
              return `Increase ${props.label} ${label}`;
            },
          }),
      });
    onCleanup(() => {
      disposed = true;
      hex = undefined;
    });
    rootNode = View({
      get style(): StyleValue<ViewStyles> {
        return [{ minWidth: 0 }, props.style];
      },
      children: Popover({
        get open() {
          return open() && !props.disabled;
        },
        onOpenChange(next) {
          if (disposed || rootNode?.isDestroyed || (next && props.disabled))
            return;
          closing = !next;
          setOpen(next);
          if (!disposed && open()) closing = false;
          if (!disposed && !next) {
            setEditing(false);
            setDraft(current());
          }
        },
        children: () => [
          PopoverTrigger({
            get name() {
              return props.label;
            },
            get disabled() {
              return props.disabled;
            },
            get size() {
              return props.size;
            },
            variant: 'secondary',
            children: View({
              get style(): StyleValue<ViewStyles> {
                return {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme().spacing.sm,
                  minWidth: 0,
                };
              },
              children: [preview(), valueText()],
            }),
          }),
          PopoverContent({
            get name() {
              return `${props.label} Color editor`;
            },
            get scrollLabel() {
              return `${props.label} Scrollable color editor`;
            },
            get width() {
              return props.popupWidth ?? 360;
            },
            get height() {
              return props.popupHeight ?? 520;
            },
            get dismissOnEscape() {
              return (
                hex?.element.ownerDocument.activeElement !== hex?.element ||
                (draft() === current() && !hex?.isComposing)
              );
            },
            onError: (error) => props.onError?.(error),
            children: () => {
              closing = false;
              return [
                View({
                  style: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                  children: [preview(), valueText()],
                }),
                ColorArea({
                  get name() {
                    return `${props.label} Saturation and brightness`;
                  },
                  get value() {
                    return intent();
                  },
                  onValueChange: change,
                  get disabled() {
                    return props.disabled;
                  },
                  get readOnly() {
                    return props.readOnly;
                  },
                  description:
                    'Use the Saturation and Brightness numeric fields as keyboard alternatives.',
                  style: { width: '100%', height: 150, flexShrink: 0 },
                }),
                Field({
                  label: 'Hex',
                  children: () =>
                    TextField({
                      get 'aria-label'() {
                        return `${props.label} Hex`;
                      },
                      get value() {
                        return draft();
                      },
                      get disabled() {
                        return props.disabled;
                      },
                      get readOnly() {
                        return props.readOnly;
                      },
                      get size() {
                        return props.size;
                      },
                      autoComplete: 'off',
                      onFocus() {
                        setEditing(true);
                      },
                      onValueChange: setDraft,
                      onBlur() {
                        setEditing(false);
                        commitHex();
                      },
                      onKeyDown(event) {
                        if (isComposingInput(event) || disposed) return;
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitHex();
                        } else if (
                          event.key === 'Escape' &&
                          draft() !== current()
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          setDraft(current());
                        }
                      },
                      ref(node) {
                        hex = node;
                        onCleanup(() => {
                          if (hex === node) hex = undefined;
                        });
                      },
                    }),
                }),
                numeric('h', 'Hue (degrees)'),
                Slider({
                  get name() {
                    return `${props.label} Hue slider`;
                  },
                  get value() {
                    return intent().h;
                  },
                  min: 0,
                  max: 360,
                  step: 1,
                  get disabled() {
                    return Boolean(props.disabled || props.readOnly);
                  },
                  onValueChange: (h) => change({ ...intent(), h }),
                }),
                numeric('s', 'Saturation (%)'),
                numeric('v', 'Brightness (%)'),
                Show({
                  get when() {
                    return alpha();
                  },
                  children: () =>
                    View({
                      style: { flexDirection: 'column', gap: 8 },
                      children: [
                        numeric('a', 'Alpha (%)'),
                        Slider({
                          get name() {
                            return `${props.label} Alpha slider`;
                          },
                          get value() {
                            return intent().a * 100;
                          },
                          min: 0,
                          max: 100,
                          step: 1,
                          get disabled() {
                            return Boolean(props.disabled || props.readOnly);
                          },
                          onValueChange: (a) =>
                            change({ ...intent(), a: a / 100 }),
                        }),
                      ],
                    }),
                }),
              ];
            },
            actions: () =>
              PopoverClose({
                get name() {
                  return `Close ${props.label} Color editor`;
                },
                children: 'Close',
                get size() {
                  return props.size;
                },
              }),
          }),
        ],
      }),
    }) as PNode;
    return rootNode;
  }, props.ref);
}
