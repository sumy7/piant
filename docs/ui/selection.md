# Checkbox、ToggleSwitch 与 RadioGroup

这三个组件从 `@piant/ui` 根入口导入，并在 `UIProvider` 的延迟子树中创建。Checkbox 表达独立选中状态，ToggleSwitch 表达开/关，RadioGroup 在一组值中单选。它们组合已有受控状态、按压、焦点和语义桥接，Canvas 标签区域也可点击。

## Checkbox

<LiveExample example="uiCheckbox" title="Checkbox：混合态、受控/非受控、禁用与主题" :height="720" />

`CheckboxProps`：

| 属性              | 类型与默认值                            | 行为                     |
| ----------------- | --------------------------------------- | ------------------------ |
| `label`           | 必填非空 `string`                       | 可见标签和语义名称       |
| `checked`         | `boolean \| 'mixed'`，可选              | 提供时为受控状态         |
| `defaultChecked`  | `boolean \| 'mixed'`，默认 `false`      | 非受控初始状态，只读一次 |
| `onCheckedChange` | `(checked: boolean \| 'mixed') => void` | 通知请求的新状态         |
| `disabled`        | `boolean`，默认 `false`                 | 禁用操作并移出 Tab 停靠  |
| `description`     | 可选 `string`                           | 可见说明和 DOM 描述关联  |
| `style`、`ref`    | core `View` 属性                        | 外层控件布局与节点       |
| `textStyle`       | core `Text` 样式                        | 标签文字样式覆盖         |

`'mixed'` 表示部分选中，通过横线与 DOM `aria-checked="mixed"` 表达，常用于概括多个子项。应用负责从子项推导混合态，并在选择发生后更新相应子项。用户激活 mixed 时请求 `true`，之后在 `true` / `false` 间切换；mixed 由调用方设置或推导。它不是自动维护子项集合的树控件。

```tsx
import { createState } from '@piant/core';
import { Checkbox, UIProvider } from '@piant/ui';

function Content() {
  const [checked, setChecked] = createState<boolean | 'mixed'>('mixed');
  return (
    <Checkbox
      label="包含全部图层"
      checked={checked()}
      onCheckedChange={setChecked}
    />
  );
}

export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

## ToggleSwitch

<LiveExample example="uiToggleSwitch" title="ToggleSwitch：开关状态、非受控初值与禁用" :height="590" />

`ToggleSwitchProps` 与 Checkbox 具有相同的 `label`、`description`、`disabled`、`style`、`textStyle`、`ref`。`checked`、`defaultChecked` 和 `onCheckedChange` 只接受 `boolean`，不支持混合态；默认非受控状态为 `false`。

保持开关名称稳定，例如始终使用“自动保存”，把“已开启/已关闭”交给状态或独立说明表达。不要随值把名称改成两个不同动作。这个要求来自 [WAI-ARIA APG Switch 模式](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)。

Checkbox 和 ToggleSwitch 均通过 Space 切换，Enter 不激活。它们在可用时各有一个 Tab 停靠项，禁用时跳过；指针在控件内释放激活，取消或移出释放不会改变状态。Checkbox 的 Space 交互和三态语义参照 [APG Checkbox 模式](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)。

## RadioGroup

<LiveExample example="uiRadioGroup" title="RadioGroup：单选、动态选项、方向与主题" :height="780" />

`RadioGroupProps` 使用导出的 `RadioGroupOption` 描述选项。每项 `label` 必须非空，`value` 在组内唯一。示例以响应式 `defaultValue` 初始化非受控组；“修改默认质量”不会覆盖已初始化的当前值。

`RadioGroupProps`：

| 属性            | 类型与默认值                                    | 行为                                                                                     |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `label`         | 必填非空 `string`                               | 组名称                                                                                   |
| `description`   | 可选 `string`                                   | 组说明及 DOM 描述关联                                                                    |
| `value`         | 可选 `string`                                   | 受控值，由父级提交                                                                       |
| `defaultValue`  | 可选 `string`                                   | 非受控初值，只读一次                                                                     |
| `onValueChange` | `(value: string) => void`                       | 用户选择新值时通知                                                                       |
| `options`       | 只读选项数组                                    | 每项含 `value: string`、`label: string`，可选 `disabled: boolean`、`description: string` |
| `disabled`      | `boolean`，默认 `false`                         | 禁用整组                                                                                 |
| `orientation`   | `'horizontal' \| 'vertical'`，默认 `'vertical'` | 排列方向                                                                                 |
| `dir`           | `'ltr' \| 'rtl'`，默认 `'ltr'`                  | 水平方向语义                                                                             |
| `style`、`ref`  | core `View` 属性                                | 外层组布局与节点                                                                         |
| `textStyle`     | core `Text` 样式                                | 标签文字样式覆盖                                                                         |

`orientation` 仅控制视觉排列；由于四个方向键均可用，语义组不声明单轴 `aria-orientation`。组以 `radiogroup` 语义包含多个 `radio`，各项都提供名称和布尔 `aria-checked`。有选中项时，它是组内唯一的 Tab 停靠项；没有可用选中项时，以首个可用项作为停靠项。Tab/Shift+Tab 进出整组，无需逐个经过全部选项。组内导航时停靠点跟随当前焦点；受控父级拒绝改值时，焦点与选中项可暂时不同。离组后再次进入，优先停靠可用的选中项。

四个方向键都可用，与视觉排列方向无关：Right/Down 移动并选择下一可用项，Left/Up 移动并选择上一可用项，跳过禁用项并循环。`dir="rtl"` 仅反转 Left/Right 的方向；Space 选中当前项，Enter 不激活。Home/End 分别移动并选择首项/末项。普通单选组的焦点与选中同步规则参照 [APG Radio Group 模式](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)；Home/End 和本组件的动态选项策略是额外提供的行为。这里提供普通单选组，不采用工具栏内单选组的“方向键仅移动焦点”模式。

`options` 可响应式替换。移除聚焦项时恢复到可用项的焦点，不隐式提交新值；当前值已不存在或对应项被禁用时，保留原值，等待下一次用户选择。恢复相同值的选项后，其选中态可重新呈现。空 `options` 仍显示 Canvas 标题和说明，但没有可操作语义组或 Tab 停靠项；全部选项禁用时也跳过整组，不隐式选择。受控模式同样由父级决定最终值，不因为焦点恢复而回写业务数据。

## 受控、样式与生命周期

省略 `checked` / `value` 时组件管理非受控值，以 default 属性初始化。传入受控值时，回调只通知请求，父级需要提交新值，组件不会抢先覆盖。使用 JSX 属性或 getter 保留响应式转发，避免普通对象展开读取成快照。

`style` 在默认样式后覆盖布局、背景等；`textStyle` 在默认标签样式后应用。主题颜色、字体、间距、密度和圆角在运行中更新；200% 字号与紧凑密度仍使用文字测量和可用空间布局。自定义宽度后应验证换行、长标签、焦点环和图形缩放，避免让父级裁剪焦点反馈。

这些控件不提供原生表单字段的提交契约。需要提交到表单时，由应用持有选中值并接入自己的提交逻辑。节点或 owner 销毁后清理按压监听、焦点注册和语义 DOM；多个 provider 的作用域按现有[焦点规则](/ui/focus)组合。

## 验证范围

语义角色、名称、描述、选中值与 Tab 停靠可通过 DOM 和浏览器可访问性树检查，键盘与指针行为需在真实浏览器操作。Canvas 视觉、DOM/AX 证据与自动化测试不等同于 VoiceOver 等辅助技术的实际朗读验收；目标辅助技术、浏览器与系统组合仍须单独验证。
