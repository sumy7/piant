import {
  attachDOMElement,
  createEffect,
  createMemo,
  createState,
  onCleanup,
  root,
  Show,
  Text,
  type TextProps,
  untrack,
  View,
} from '@piant/core';
import { useUITheme } from '../theme/UIProvider';
import {
  FieldContext,
  type FieldControl,
  type FieldScope,
} from './internal/fieldContext';

export interface FieldProps extends Pick<
  Parameters<typeof View>[0],
  'style' | 'ref'
> {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  labelStyle?: TextProps['style'];
  descriptionStyle?: TextProps['style'];
  errorStyle?: TextProps['style'];
  /** Defer the single TextField until this Field's context is installed. */
  children: () => JSX.Element;
}

let nextFieldId = 0;

/** Canvas field copy and the actual DOM label/description targets for one TextField. */
export function Field(props: FieldProps): ReturnType<typeof View> {
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
    try {
      const theme = useUITheme();
      const [control, setControl] = createState<FieldControl>();
      const prefix = `piant-field-${++nextFieldId}`;
      const scope: FieldScope = {
        label: () => {
          const value = props.label?.trim() ?? '';
          if (!value) throw new Error('Field requires a non-empty label.');
          return value;
        },
        description: () => props.description?.trim() || undefined,
        error: () => props.error?.trim() || undefined,
        required: () => Boolean(props.required),
        controlId: `${prefix}-control`,
        labelId: `${prefix}-label`,
        descriptionId: `${prefix}-description`,
        errorId: `${prefix}-error`,
        register(value) {
          if (disposed)
            throw new Error('Cannot register a control in a disposed Field.');
          if (control())
            throw new Error('Field supports exactly one TextField.');
          setControl(value);
          let released = false;
          return () => {
            if (released) return;
            released = true;
            if (control() === value) setControl(undefined);
          };
        },
      };
      if (
        props.label !== undefined ||
        !Object.getOwnPropertyDescriptor(props, 'label')?.get
      )
        scope.label();
      const labelText = () =>
        `${scope.label()}${scope.required() || control()?.required() ? ' *' : ''}`;
      const focusControl = () => {
        const current = control();
        if (
          current &&
          !current.node.isDestroyed &&
          !current.node.element.disabled
        )
          current.node.focus();
      };
      const smallText = () => ({
        fontFamily: theme().typography.fontFamily,
        fontSize: theme().typography.smallFontSize,
        lineHeight: theme().typography.smallLineHeight,
        minWidth: 0,
      });
      return (
        <FieldContext.Provider value={scope}>
          {() => {
            const content = createMemo(() => untrack(() => props.children()));
            return (
              <View
                ref={(node) => {
                  removeDestroy = node.onDestroy(dispose);
                  const mirror = document.createElement('div');
                  mirror.style.cssText = 'opacity:0;pointer-events:none;';
                  const label = document.createElement('label');
                  label.id = scope.labelId;
                  const description = document.createElement('span');
                  description.id = scope.descriptionId;
                  const error = document.createElement('span');
                  error.id = scope.errorId;
                  mirror.append(label, description, error);
                  attachDOMElement(node, mirror);
                  createEffect(() => {
                    label.textContent = scope.label();
                    label.htmlFor = control()?.id() ?? scope.controlId;
                    const descriptionText = scope.description();
                    description.textContent = descriptionText ?? '';
                    description.hidden = !descriptionText;
                    const errorText = scope.error();
                    error.textContent = errorText ?? '';
                    error.hidden = !errorText;
                  });
                  props.ref?.(node);
                }}
                style={[
                  {
                    flexDirection: 'column',
                    gap: theme().spacing.xs,
                    minWidth: 0,
                  },
                  props.style,
                ]}
              >
                <View onClick={focusControl} style={{ minWidth: 0 }}>
                  <Text
                    style={[
                      {
                        fontFamily: theme().typography.fontFamily,
                        fontSize: theme().typography.fontSize,
                        lineHeight: theme().typography.lineHeight,
                        color: theme().colors.text,
                        minWidth: 0,
                      },
                      props.labelStyle,
                    ]}
                  >
                    {labelText()}
                  </Text>
                </View>
                {content}
                <Show when={Boolean(scope.description())}>
                  {(_description) => (
                    <Text
                      style={[
                        smallText(),
                        { color: theme().colors.textMuted },
                        props.descriptionStyle,
                      ]}
                    >
                      {scope.description()}
                    </Text>
                  )}
                </Show>
                <Show when={Boolean(scope.error())}>
                  {(_error) => (
                    <Text
                      style={[
                        smallText(),
                        { color: theme().colors.danger },
                        props.errorStyle,
                      ]}
                    >
                      {scope.error()}
                    </Text>
                  )}
                </Show>
              </View>
            );
          }}
        </FieldContext.Provider>
      );
    } catch (error) {
      cleanup();
      throw error;
    }
  });
  onCleanup(dispose);
  return result;
}
