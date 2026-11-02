import { createEffect, createState, For, ScrollView, Text } from '@piant/core';
import {
  Button,
  Combobox,
  NumberField,
  OverlayHost,
  SearchField,
  SplitPane,
  Stack,
  Surface,
  UIProvider,
  useUITheme,
} from '@piant/ui';

export interface ToolSnapshot {
  query: string;
  searches: number;
  amount: number | null;
  preset: string | null;
  presetInput: string;
  size: number;
}
export interface ToolPanelProps {
  name: string;
  colorMode?: 'light' | 'dark';
  density?: 'comfortable' | 'compact';
  fontScale?: number;
  disabled?: boolean;
  onStateChange?: (state: ToolSnapshot) => void;
}
const layers = ['背景 Background', '标题 Title', '图标 Icon', '中文图层'];
const presets = [
  { value: 'draft', label: 'Draft 草稿' },
  { value: 'standard', label: 'Standard 标准' },
  { value: 'print', label: 'Print 印刷' },
  { value: 'locked', label: 'Locked 禁用', disabled: true },
];

/** Small local tool workflow shared by the gallery, online docs and tarball smoke. */
export function ToolPanel(props: ToolPanelProps) {
  return UIProvider({
    get colorMode() {
      return props.colorMode;
    },
    get density() {
      return props.density;
    },
    get fontScale() {
      return props.fontScale;
    },
    children: () => OverlayHost({ children: () => ToolContent(props) }),
  });
}
function ToolContent(props: ToolPanelProps) {
  const theme = useUITheme();
  const [query, setQuery] = createState('');
  const [searches, setSearches] = createState(0);
  const [amount, setAmount] = createState<number | null>(1);
  const [preset, setPreset] = createState<string | null>('standard');
  const [presetInput, setPresetInput] = createState('Standard 标准');
  const [size, setSize] = createState(220);
  createEffect(() =>
    props.onStateChange?.({
      query: query(),
      searches: searches(),
      amount: amount(),
      preset: preset(),
      presetInput: presetInput(),
      size: size(),
    }),
  );
  function text(value: () => string) {
    return Text({
      get children() {
        return value();
      },
      get style() {
        return {
          color: theme().colors.text,
          fontSize: theme().typography.fontSize,
          lineHeight: theme().typography.lineHeight,
        };
      },
    });
  }
  return Surface({
    tone: 'canvas',
    padding: 'sm',
    style: { width: '100%', height: '100%' },
    children: Stack({
      gap: 'sm',
      style: { width: '100%', height: '100%' },
      children: [
        SearchField({
          'aria-label': `${props.name} 搜索图层`,
          clearLabel: `${props.name} 清除搜索`,
          get value() {
            return query();
          },
          onValueChange: setQuery,
          onSearch: () => setSearches((n) => n + 1),
          get disabled() {
            return props.disabled;
          },
          placeholder: '搜索图层 / Enter 确认',
        }),
        text(
          () =>
            `搜索提交 ${searches()} 次；匹配 ${layers.filter((s) => s.toLowerCase().includes(query().toLowerCase())).length} 项`,
        ),
        SplitPane({
          name: `${props.name} 调整分栏`,
          minSize: 90,
          get minSecondSize() {
            return theme().controlSize.md * 2 + 80;
          },
          get size() {
            return size();
          },
          onSizeChange: setSize,
          get disabled() {
            return props.disabled;
          },
          style: { width: '100%', flexGrow: 1, minHeight: 260 },
          first: () =>
            ScrollView({
              style: { width: '100%', height: '100%' },
              children: Stack({
                gap: 'sm',
                children: [
                  For({
                    get each() {
                      return layers.filter((s) =>
                        s.toLowerCase().includes(query().toLowerCase()),
                      );
                    },
                    children: (layer: string) => text(() => layer),
                  }),
                  text(() =>
                    layers.some((s) =>
                      s.toLowerCase().includes(query().toLowerCase()),
                    )
                      ? ''
                      : '没有匹配图层',
                  ),
                ],
              }),
            }),
          second: () =>
            ScrollView({
              style: { width: '100%', height: '100%' },
              children: Stack({
                gap: 'sm',
                style: { width: '100%' },
                children: [
                  text(() => '检查器 / 输出参数'),
                  NumberField({
                    'aria-label': `${props.name} 缩放`,
                    min: 0,
                    max: 10,
                    step: 0.1,
                    incrementLabel: `${props.name} 增加缩放`,
                    decrementLabel: `${props.name} 减少缩放`,
                    get value() {
                      return amount();
                    },
                    onValueChange: setAmount,
                    get disabled() {
                      return props.disabled;
                    },
                  }),
                  Combobox({
                    label: `${props.name} 输出预设`,
                    options: presets,
                    get value() {
                      return preset();
                    },
                    onValueChange: setPreset,
                    get inputValue() {
                      return presetInput();
                    },
                    onInputValueChange: setPresetInput,
                    get disabled() {
                      return props.disabled;
                    },
                    popupHeight: 180,
                    placeholder: '输入 Draft / Print 筛选',
                  }),
                  text(
                    () =>
                      `缩放 ${amount() ?? '空'}；预设 ${preset() ?? '未选择'}`,
                  ),
                  Button({
                    size: 'sm',
                    variant: 'secondary',
                    children: `${props.name} 重置参数`,
                    get disabled() {
                      return props.disabled;
                    },
                    onPress: () => {
                      setAmount(1);
                      setPreset('standard');
                      setPresetInput('Standard 标准');
                    },
                  }),
                ],
              }),
            }),
        }),
      ],
    }),
  });
}
