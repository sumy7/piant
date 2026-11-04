import {
  CustomView,
  createEffect,
  createState,
  Text,
  untrack,
  View,
} from '@piant/core';
import {
  Button,
  ColorPicker,
  OverlayHost,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';
export interface ColorEditorSnapshot {
  fill: string;
  outline: string;
  requests: number;
  accepted: number;
  disabled: boolean;
  readOnly: boolean;
  reject: boolean;
}
export interface ColorEditorControls {
  setFill(value: string): void;
  setDisabled(value: boolean): void;
  setReadOnly(value: boolean): void;
  setReject(value: boolean): void;
}
export interface ColorEditorPanelProps {
  name: string;
  colorMode?: 'light' | 'dark';
  density?: 'comfortable' | 'compact';
  fontScale?: number;
  onReady?: (controls: ColorEditorControls) => void;
  onStateChange?: (state: ColorEditorSnapshot) => void;
}
/** Layer fill and outline edit the same Canvas preview through public UI APIs. */
export function ColorEditorPanel(props: ColorEditorPanelProps) {
  return View({
    style: { width: '100%', height: '100%', minHeight: 0, flexShrink: 1 },
    children: UIProvider({
      get colorMode() {
        return props.colorMode;
      },
      get density() {
        return props.density;
      },
      get fontScale() {
        return props.fontScale;
      },
      children: () =>
        OverlayHost({ children: () => untrack(() => Content(props)) }),
    }),
  });
}
function Content(props: ColorEditorPanelProps) {
  const theme = useUITheme();
  const [fill, setFill] = createState('#3366ff80');
  const [outline, setOutline] = createState('#ff8800');
  const [requests, setRequests] = createState(0),
    [accepted, setAccepted] = createState(0);
  const [disabled, setDisabled] = createState(false),
    [readOnly, setReadOnly] = createState(false),
    [reject, setReject] = createState(false);
  props.onReady?.({ setFill, setDisabled, setReadOnly, setReject });
  createEffect(() =>
    props.onStateChange?.({
      fill: fill(),
      outline: outline(),
      requests: requests(),
      accepted: accepted(),
      disabled: disabled(),
      readOnly: readOnly(),
      reject: reject(),
    }),
  );
  const label = (read: () => string) =>
    Text({
      get children() {
        return read();
      },
      get style() {
        const t = theme();
        return {
          fontSize: t.typography.fontSize,
          lineHeight: t.typography.lineHeight,
          color: t.colors.text,
        };
      },
    });
  const preview = CustomView({
    style: { width: '100%', height: 150, minHeight: 80, flexShrink: 1 },
    onDraw(g, width, height) {
      const t = theme();
      g.clear();
      const tile = 12;
      for (let y = 0; y < height; y += tile)
        for (let x = 0; x < width; x += tile)
          g.rect(
            x,
            y,
            Math.min(tile, width - x),
            Math.min(tile, height - y),
          ).fill(
            (Math.floor(x / tile) + Math.floor(y / tile)) % 2
              ? t.colors.border
              : t.colors.surface,
          );
      const alpha =
        fill().length === 9 ? Number.parseInt(fill().slice(7, 9), 16) / 255 : 1;
      g.roundRect(
        16,
        16,
        Math.max(0, width - 32),
        Math.max(0, height - 32),
        t.radius.md,
      )
        .fill({ color: fill().slice(0, 7), alpha })
        .stroke({ color: outline(), width: 4 });
    },
  });
  const stateText = () =>
    `${props.name} 填充 ${fill()}；轮廓 ${outline()}；接受 ${accepted()} / 请求 ${requests()}`;
  const disabledText = () =>
    `${props.name} ${disabled() ? '启用' : '禁用'}填充`;
  const readOnlyText = () =>
    `${props.name} ${readOnly() ? '允许编辑' : '设为只读'}`;
  const rejectText = () =>
    `${props.name} ${reject() ? '接受请求' : '拒绝请求'}`;
  return Surface({
    tone: 'canvas',
    padding: 'sm',
    style: { width: '100%', height: '100%' },
    children: Stack({
      gap: 'sm',
      style: { width: '100%', height: '100%' },
      children: [
        label(() => `${props.name} 图层检查器`),
        Stack({
          direction: 'row',
          gap: 'sm',
          wrap: true,
          children: [
            ColorPicker({
              label: `${props.name} 填充`,
              get value() {
                return fill();
              },
              onValueChange(next) {
                setRequests((n) => n + 1);
                if (!reject()) {
                  setFill(next);
                  setAccepted((n) => n + 1);
                }
              },
              get disabled() {
                return disabled();
              },
              get readOnly() {
                return readOnly();
              },
            }),
            ColorPicker({
              label: `${props.name} 轮廓`,
              alpha: false,
              get value() {
                return outline();
              },
              onValueChange: setOutline,
            }),
          ],
        }),
        preview,
        label(stateText),
        Stack({
          direction: 'row',
          wrap: true,
          gap: 'sm',
          children: [
            Button({
              size: 'sm',
              variant: 'secondary',
              get children() {
                return disabledText();
              },
              onPress: () => setDisabled((v) => !v),
            }),
            Button({
              size: 'sm',
              variant: 'secondary',
              get children() {
                return readOnlyText();
              },
              onPress: () => setReadOnly((v) => !v),
            }),
            Button({
              size: 'sm',
              variant: 'secondary',
              get children() {
                return rejectText();
              },
              onPress: () => setReject((v) => !v),
            }),
            Button({
              size: 'sm',
              variant: 'secondary',
              children: `${props.name} 外部设为半透明绿`,
              onPress: () => setFill('#00ff0080'),
            }),
          ],
        }),
      ],
    }),
  });
}
