import { createState, mount, type PNode } from '@piant/core';
import {
  Checkbox,
  RadioGroup,
  type RadioGroupOption,
  Stack,
  Surface,
  ToggleSwitch,
  UIProvider,
} from '@piant/ui';

document.body.style.fontFamily = 'Arial, sans-serif';
const title = document.createElement('h1');
title.textContent = 'Checkbox, ToggleSwitch and RadioGroup';
const before = document.createElement('button');
before.textContent = 'Before selection';
const host = document.createElement('div');
host.style.cssText = 'width:600px;height:920px;position:relative';
const after = document.createElement('button');
after.textContent = 'After selection';
const controls = document.createElement('div');
const status = document.createElement('pre');
document.body.append(title, before, host, after, controls, status);

const initialOptions: readonly RadioGroupOption[] = [
  { value: 'light', label: '浅色' },
  {
    value: 'system',
    label: '跟随系统',
    description: '使用设备当前的外观偏好。',
  },
  { value: 'contrast', label: '高对比（禁用）', disabled: true },
  { value: 'dark', label: '深色' },
];
interface Settings {
  dark?: boolean;
  compact?: boolean;
  large?: boolean;
  disabled?: boolean;
  reject?: boolean;
  horizontal?: boolean;
  rtl?: boolean;
}
let settings: Settings = {};
let update!: (value: Settings) => void;
let updateOptions!: (options: readonly RadioGroupOption[]) => void;
let updateDefault!: (value: boolean) => void;
let updateChecked!: (value: boolean | 'mixed') => void;
let updateRadio!: (value: string) => void;
let options = initialOptions;
const nodes: PNode[] = [];
const events: string[] = [];
let creations = 0;

const mounted = await mount(
  () => {
    const [config, setConfig] = createState<Settings>({});
    const [checked, setChecked] = createState<boolean | 'mixed'>('mixed');
    const [radio, setRadio] = createState('system');
    const [items, setItems] = createState(initialOptions);
    const [defaultChecked, setDefaultChecked] = createState(true);
    update = setConfig;
    updateOptions = setItems;
    updateDefault = setDefaultChecked;
    updateChecked = setChecked;
    updateRadio = setRadio;
    return UIProvider({
      get colorMode() {
        return config().dark ? 'dark' : 'light';
      },
      get density() {
        return config().compact ? 'compact' : 'comfortable';
      },
      get fontScale() {
        return config().large ? 2 : 1;
      },
      children: () => {
        creations++;
        return Surface({
          tone: 'canvas',
          style: { width: '100%', height: '100%' },
          children: Stack({
            style: { width: '100%' },
            children: [
              Checkbox({
                label: '同步全部项目',
                description: '受控三态：横线表示仅选择部分项目。',
                get checked() {
                  return checked();
                },
                get disabled() {
                  return config().disabled;
                },
                onCheckedChange(next) {
                  events.push(`checkbox:${next}`);
                  if (!config().reject) setChecked(next);
                  report();
                },
                ref: (node) => nodes.push(node),
              }),
              Checkbox({
                label: '保存到此设备',
                defaultChecked: true,
                onCheckedChange(next) {
                  events.push(`local:${next}`);
                  report();
                },
                ref: (node) => nodes.push(node),
              }),
              ToggleSwitch({
                label: '桌面通知',
                description: '非受控开关；修改默认值不会重置当前状态。',
                get defaultChecked() {
                  return defaultChecked();
                },
                get disabled() {
                  return config().disabled;
                },
                onCheckedChange(next) {
                  events.push(`switch:${next}`);
                  report();
                },
                ref: (node) => nodes.push(node),
              }),
              RadioGroup({
                label: '配色偏好',
                description: '方向键选择；Tab 离开整组。移除项不自动提交值。',
                get value() {
                  return radio();
                },
                get options() {
                  return items();
                },
                get disabled() {
                  return config().disabled;
                },
                get orientation() {
                  return config().horizontal ? 'horizontal' : 'vertical';
                },
                get dir() {
                  return config().rtl ? 'rtl' : 'ltr';
                },
                onValueChange(next) {
                  events.push(`radio:${next}`);
                  if (!config().reject) setRadio(next);
                  report();
                },
                ref: (node) => nodes.push(node),
              }),
            ],
          }),
        });
      },
    });
  },
  host,
  { resolution: Math.min(devicePixelRatio || 1, 2) },
);

function report() {
  mounted.root.doLayout();
  if (creations !== 1 || nodes.length !== 4)
    throw new Error('Selection tree rebuilt');
  status.textContent = JSON.stringify(
    {
      settings,
      creations,
      events,
      focus: document.activeElement?.getAttribute('aria-label'),
      controls: Array.from(
        host.querySelectorAll('[role=checkbox],[role=switch],[role=radio]'),
      ).map((element) => ({
        role: element.getAttribute('role'),
        label: element.getAttribute('aria-label'),
        checked: element.getAttribute('aria-checked'),
        disabled: element.getAttribute('aria-disabled'),
        tabIndex: (element as HTMLElement).tabIndex,
      })),
    },
    null,
    2,
  );
}
function control(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onpointerdown = (event) => event.preventDefault();
  button.onclick = action;
  controls.append(button);
}
function change(next: Partial<Settings>) {
  settings = { ...settings, ...next };
  update(settings);
  report();
}
control('Theme', () => change({ dark: !settings.dark }));
control('Density', () => change({ compact: !settings.compact }));
control('Text 200%', () => change({ large: !settings.large }));
control('Disabled', () => change({ disabled: !settings.disabled }));
control('Reject changes', () => change({ reject: !settings.reject }));
control('Horizontal', () => change({ horizontal: !settings.horizontal }));
control('RTL', () => change({ rtl: !settings.rtl }));
control('Mixed', () => {
  updateChecked('mixed');
  report();
});
control('Select system', () => {
  updateRadio('system');
  report();
});
control('Change default', () => {
  updateDefault(false);
  report();
});
control('Remove focused', () => {
  const label = document.activeElement?.getAttribute('aria-label');
  options = options.filter((option) => option.label !== label);
  updateOptions(options);
  report();
});
control('Restore options', () => {
  options = initialOptions;
  updateOptions(options);
  report();
});
control('Narrow 260px', () => {
  host.style.width = host.style.width === '260px' ? '600px' : '260px';
  requestAnimationFrame(() => requestAnimationFrame(report));
});
control('Unmount', () => {
  mounted.destroy();
  update({ dark: true, disabled: true });
  updateOptions([]);
  updateDefault(false);
  updateChecked(false);
  updateRadio('dark');
  if (
    host.querySelector('canvas,button,[role]') ||
    nodes.some((node) => !node.isDestroyed)
  )
    throw new Error('Selection disposal failed');
  status.textContent =
    'PASS: Canvas, semantic controls, groups and subscriptions disposed';
  for (const button of Array.from(controls.querySelectorAll('button')))
    button.disabled = true;
});
report();

requestAnimationFrame(() => requestAnimationFrame(report));
