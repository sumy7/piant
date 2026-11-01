import { createState, mount, type PInput, type PNode } from '@piant/core';
import {
  Field,
  Stack,
  Surface,
  TextField,
  UIProvider,
  type UIProviderProps,
} from '@piant/ui';

document.body.style.fontFamily = 'Arial, sans-serif';
const title = document.createElement('h1');
title.textContent = 'TextField and Field';
const before = document.createElement('button');
before.textContent = 'Before fields';
const host = document.createElement('div');
host.style.cssText = 'width:560px;height:560px;position:relative';
const after = document.createElement('button');
after.textContent = 'After fields';
const controls = document.createElement('div');
const status = document.createElement('pre');
document.body.append(title, before, host, after, controls, status);

interface Settings extends UIProviderProps {
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  hidden?: boolean;
}
let settings: Settings = {};
let update!: (value: Settings) => void;
let changeDefault!: (value: string) => void;
let nameField!: PInput;
let nickname!: PInput;
let password!: PInput;
const inputs: PInput[] = [];
const nodes: PNode[] = [];
let creations = 0;
let factories = 0;
let valueEvents = 0;
let inputEvents = 0;
let submits = 0;
const compositionEvents: string[] = [];
let retained = true;

const mounted = await mount(
  () => {
    const [options, set] = createState<Settings>({});
    const [value, setValue] = createState('');
    const [initial, setInitial] = createState('Piant');
    update = set;
    changeDefault = setInitial;
    return UIProvider({
      get colorMode() {
        return options().colorMode;
      },
      get density() {
        return options().density;
      },
      get fontScale() {
        return options().fontScale;
      },
      children: () => {
        creations++;
        const name = Field({
          label: '显示名称',
          description: '供团队成员识别的公开名称。',
          required: true,
          get error() {
            return options().error ? '名称至少需要三个字符。' : undefined;
          },
          ref: (node) => nodes.push(node),
          children: () => {
            factories++;
            return TextField({
              ref: (node) => {
                nameField = node;
                inputs.push(node);
              },
              get value() {
                return value();
              },
              get disabled() {
                return options().disabled;
              },
              get readOnly() {
                return options().readOnly;
              },
              placeholder: '请输入中文或英文名称',
              autoComplete: 'off',
              onValueChange(next) {
                valueEvents++;
                setValue(next);
                report();
              },
              onInput() {
                inputEvents++;
                report();
              },
              onKeyDown(event) {
                if (event.key === 'Enter') {
                  submits++;
                  report();
                }
              },
              onCompositionStart() {
                compositionEvents.push('start');
                report();
              },
              onCompositionUpdate() {
                compositionEvents.push('update');
                report();
              },
              onCompositionEnd() {
                compositionEvents.push('end');
                report();
              },
            });
          },
        });
        const uncontrolled = Field({
          label: '昵称',
          description: '非受控；修改默认值不会重置编辑。',
          ref: (node) => nodes.push(node),
          children: () => {
            factories++;
            return TextField({
              ref: (node) => {
                nickname = node;
                inputs.push(node);
              },
              get defaultValue() {
                return initial();
              },
              placeholder: '昵称',
              onValueChange: () => report(),
            });
          },
        });
        const secret = TextField({
          ref: (node) => {
            password = node;
            inputs.push(node);
          },
          'aria-label': '密码',
          type: 'password',
          placeholder: '密码（单行）',
          autoComplete: 'new-password',
        });
        const read = TextField({
          ref: (node) => {
            inputs.push(node);
          },
          'aria-label': '只读内容',
          value: '可选择和复制的只读内容',
          readOnly: true,
        });
        return Surface({
          tone: 'canvas',
          style: { width: '100%', height: '100%' },
          children: Stack({
            get style() {
              return {
                width: '100%' as const,
                display: options().hidden
                  ? ('none' as const)
                  : ('flex' as const),
              };
            },
            children: [name, uncontrolled, secret, read],
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
  if (creations !== 1 || factories !== 2)
    throw new Error('Field input tree rebuilt');
  status.textContent = JSON.stringify(
    {
      settings,
      creations,
      factories,
      valueEvents,
      inputEvents,
      submits,
      compositionEvents,
      retained,
      focused:
        document.activeElement instanceof HTMLInputElement
          ? document.activeElement.id
          : document.activeElement?.tagName,
      fields: inputs.map((node) => ({
        id: node.element.id,
        type: node.element.type,
        value: node === password ? '<password>' : node.element.value,
        label: node.element.getAttribute('aria-labelledby'),
        describedby: node.element.getAttribute('aria-describedby'),
        error: node.element.getAttribute('aria-errormessage'),
        invalid: node.element.getAttribute('aria-invalid'),
        disabled: node.element.disabled,
        readOnly: node.element.readOnly,
        size: [
          node._layoutNode.getComputedWidth(),
          node._layoutNode.getComputedHeight(),
        ],
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
function change(next: Partial<Settings>, preserve = true) {
  const input = nameField.element;
  const previous = {
    focused: document.activeElement === input,
    value: input.value,
    start: input.selectionStart,
    end: input.selectionEnd,
    direction: input.selectionDirection,
  };
  settings = { ...settings, ...next };
  update(settings);
  mounted.root.doLayout();
  if (
    preserve &&
    (input !== nameField.element ||
      input.value !== previous.value ||
      (previous.focused &&
        (document.activeElement !== input ||
          input.selectionStart !== previous.start ||
          input.selectionEnd !== previous.end ||
          input.selectionDirection !== previous.direction)))
  ) {
    retained = false;
    throw new Error('Theme/state update disturbed native editing');
  }
  report();
}
control('Theme', () =>
  change({ colorMode: settings.colorMode === 'dark' ? 'light' : 'dark' }),
);
control('Density', () =>
  change({
    density: settings.density === 'compact' ? 'comfortable' : 'compact',
  }),
);
control('Text 200%', () =>
  change({ fontScale: settings.fontScale === 2 ? 1 : 2 }),
);
control('Error', () => change({ error: !settings.error }));
control('Read only', () => change({ readOnly: !settings.readOnly }));
control('Disabled', () => change({ disabled: !settings.disabled }, false));
control('Change default', () => {
  const value = nickname.element.value;
  changeDefault('Replaced default');
  if (nickname.element.value !== value)
    throw new Error('Default value reset edits');
  report();
});
control('Focus name', () => nameField.focus());
control('Hide', () => change({ hidden: !settings.hidden }, false));
control('Narrow 240px', () => {
  host.style.width = host.style.width === '240px' ? '560px' : '240px';
  requestAnimationFrame(() => requestAnimationFrame(report));
});
control('Unmount', () => {
  mounted.destroy();
  const oldValues = inputs.map((node) => node.element.value);
  update({ colorMode: 'dark', error: true });
  changeDefault('After dispose');
  if (
    host.querySelector('canvas,input,label') ||
    inputs.some(
      (node, index) =>
        !node.isDestroyed || node.element.value !== oldValues[index],
    ) ||
    nodes.some((node) => !node.isDestroyed)
  )
    throw new Error('TextField disposal failed');
  status.textContent =
    'PASS: input nodes, labels, Canvas, DOM bindings and subscriptions disposed';
  for (const button of Array.from(controls.querySelectorAll('button')))
    button.disabled = true;
});
report();
