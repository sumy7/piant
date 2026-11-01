# Tabs 与折叠容器

`Tabs` 在同一位置切换页面，`Collapsible` 展开或折叠独立内容，`Accordion` 管理一组单开或多开面板。三者都在 `UIProvider` 的延迟子树中创建，组合现有主题、按压与焦点服务及标题/面板关联；内容通过函数延迟创建。

## Tabs

<LiveExample example="uiTabs" title="Tabs：自动/手动激活、草稿保留与动态标签" :height="460" />

在“资料”中编辑草稿，再切到“偏好”并返回；示例显式使用 `mountStrategy="lazy"`，已打开页面保留同一个输入与草稿。自动模式方向键选择页面；手动模式只移动焦点，再按 Enter / Space 选择。反转顺序不会按数组下标重建已有面板；移除某个 `value` 会销毁该项，恢复后重新创建。

```tsx
import { Tabs } from '@piant/ui';

<Tabs
  label="项目设置"
  defaultValue="general"
  items={[
    {
      value: 'general',
      label: '常规',
      children: () => <TextField aria-label="项目名称" defaultValue="Piant" />,
    },
    {
      value: 'advanced',
      label: '高级',
      children: () => <TextField aria-label="高级配置" />,
    },
  ]}
/>;
```

Tabs 使用数据驱动的 `items`，每项包含稳定、唯一的 `value`、可见 `label`、可选 `disabled` 与 `children: () => unknown`。相同 key 重排保留对应标题/面板身份；移除 key 会释放该项，重新加入视为新项。避免使用数组下标作为随排序变化的 key。

| 属性                                               | 类型与行为                                                      |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `label`                                            | 必填非空 `string`，为 `tablist` 提供可访问名称                  |
| `items`                                            | 只读条目数组；条目 `value` 作为选择值和稳定身份                 |
| `value`、`defaultValue`                            | 可选 `string \| null`，分别为受控选择和初始化选择               |
| `onValueChange`                                    | `(value: string \| null) => void`，通知用户选择请求             |
| `activationMode`                                   | `'automatic'` 默认，方向键成功导航时同时选择；`'manual'` 只导航 |
| `orientation`                                      | `'horizontal'` 默认或 `'vertical'`，控制标题排列及导航方向      |
| `dir`                                              | `'ltr'` 默认或 `'rtl'`，横向左右导航反转                        |
| `disabled`                                         | 禁止所有标题操作与 Tab 停靠                                     |
| `mountStrategy`                                    | 默认 `'unmount'`；面板生命周期见下文                            |
| `style`、`listStyle`、`triggerStyle`、`panelStyle` | 外层、标题列表、标题和面板的布局样式                            |
| `ref`                                              | 外层 core View 节点引用                                         |

省略 `defaultValue` 时，非受控 Tabs 从第一个启用条目开始；显式 `defaultValue=null` 则从无选中页面开始。非受控存储值被移除或禁用时，当前有效页面回退到第一个启用条目；这是派生显示，不生成用户通知。受控 `value=null` 明确表示无选中页面；受控 key 不存在或被禁用时也不代替父级选出另一页。空列表或没有可选条目时无选中面板。

Tabs 为每项建立 `role="tab"` 标题与 `role="tabpanel"` 面板，通过 ID、`aria-controls`、`aria-labelledby` 和 `aria-selected` 关联。标题使用 roving focus：选中且启用项为 Tab 停靠项，没有有效选中项时使用第一个启用项。水平标题通过左右方向键导航，纵向通过上下方向键导航；Home / End 到达第一个/最后一个启用项。手动模式下 Enter / Space 才选择聚焦标题。禁用项不参与导航。当前面板本身也可通过 Tab 聚焦，随后进入其中的可用控件。

## Collapsible

<LiveExample example="uiCollapsible" title="Collapsible：保留与释放编辑内容的生命周期" :height="430" />

示例并列展示两个生命周期：关闭“保留编辑内容”后重新展开，输入草稿与 DOM 身份保留；关闭“关闭释放内容”会运行清理并销毁输入，重新展开从默认内容创建。状态计数用于观察实际创建与释放。

```tsx
<Collapsible label="连接设置" defaultOpen mountStrategy="lazy">
  {() => <TextField aria-label="服务器地址" defaultValue="localhost" />}
</Collapsible>
```

| 属性                                  | 类型与行为                                            |
| ------------------------------------- | ----------------------------------------------------- |
| `label`                               | 必填非空 `string`，可见标题与触发器名称               |
| `open`、`defaultOpen`                 | 可选 `boolean`，分别为受控状态与非受控初值            |
| `onOpenChange`                        | `(open: boolean) => void`，通知用户展开/折叠请求      |
| `disabled`                            | 禁止触发器操作，不参与 Tab                            |
| `mountStrategy`                       | 默认 `'unmount'`，也可选择 `'lazy'` / `'keepMounted'` |
| `children`                            | `() => unknown`，创建面板内容                         |
| `style`、`triggerStyle`、`panelStyle` | 外层、触发器与面板的布局样式                          |
| `ref`                                 | 外层 core View 节点引用                               |

触发器遵循按钮键盘规则：Enter 按下、Space 释放时切换，通过 `aria-expanded` 表达状态，`aria-controls` 指向对应面板。标题与面板保持语义关联；禁用不改变应用传入的打开状态。需要自定义打开策略时配对 `open` 与 `onOpenChange`，由父级决定最终状态。

## Accordion

<LiveExample example="uiAccordion" title="Accordion：单开、多开、键盘导航与草稿保留" :height="700" />

上组是受控单开，允许全部关闭；下组是受控多开，可同时展开两个面板。两组显式使用 `keepMounted`，未打开内容也预先创建，关闭后保留编辑状态。所有启用标题分别参与 Tab，组内上下键与 Home / End 移动焦点，Enter / Space 切换当前项。

```tsx
<Accordion
  type="single"
  defaultValue="account"
  collapsible
  items={[
    { value: 'account', label: '账户', children: () => <AccountSettings /> },
    { value: 'display', label: '显示', children: () => <DisplaySettings /> },
  ]}
/>
```

`type` 在创建时确定，使用判别联合表达选择值。单开使用 `type="single"`，`value` / `defaultValue` 为 `string | null`，`onValueChange` 接收 `string | null`；`collapsible` 默认 `true`，控制能否通过激活已打开项将它关闭；设为 `false` 时不能通过该动作关闭当前单项。省略初始值时单开从 `null` 开始，多开从空数组开始。不存在的 key 不展开面板，也不自动改写调用方值。多开使用 `type="multiple"`，值为 `readonly string[]`，回调接收同样的只读数组。

| 公共属性                              | 行为                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `items`                               | 只读条目数组，每项包含唯一稳定 `value`、`label`、可选 `disabled`、延迟 `children` |
| `disabled`                            | 禁止整组标题操作与 Tab 停靠                                                       |
| `mountStrategy`                       | 默认 `'unmount'`；决定面板隐藏时的生命周期                                        |
| `style`、`triggerStyle`、`panelStyle` | 外层、标题与面板的布局样式                                                        |
| `ref`                                 | 外层 core View 节点引用                                                           |

每个标题通过 `aria-expanded`、`aria-controls` 与面板 ID 关联，面板由相应标题命名。单开组在一次操作中选择另一项，多开组分别切换每个 key；禁用标题不参与指针、键盘操作或组内导航。禁用已经展开的条目仅禁止标题操作，不强制关闭内容。方向导航只移动焦点，不隐式展开；Tab 保持普通文档导航，区别于 Tabs 的单停靠标题列表。

## 面板生命周期

| `mountStrategy` | 创建时机           | 隐藏与恢复                                                   |
| --------------- | ------------------ | ------------------------------------------------------------ |
| `'unmount'`     | 每次打开时创建     | 关闭即释放内容 owner、节点、状态和清理回调；再次打开重新创建 |
| `'lazy'`        | 首次打开时创建     | 此后隐藏但保留内容、原生输入与响应式效果，重新打开继续使用   |
| `'keepMounted'` | 条目创建时立即创建 | 隐藏时保留内容，未打开面板的效果也已存在                     |

保留指内容 owner、节点与编辑状态的生命周期；浏览器渲染器可以在隐藏期间暂时分离原生 DOM 绑定，重新显示时挂回同一个元素。

`lazy` 与 `keepMounted` 中隐藏内容的响应式效果继续运行；涉及昂贵订阅时应选择 `unmount`，或由业务根据可见状态显式暂停。保留面板通过隐藏、DOM 语义与焦点约束退出可见交互，不占布局、不参与 Tab 和可访问性树；应用不应绕过这些约束强行聚焦隐藏控件。

面板 `children` 是每次挂载内容时调用的初始化工厂。相同条目 `value` 已经挂载的内容会保留，即使父级替换了条目对象或函数包装；不通过工厂引用变化重置草稿。内容需要响应式更新时，在内容内部读取响应式 props/state。新工厂在下一次释放后重新打开时使用；要立即替换整项内容，使用新的 key。独立 Collapsible 可通过 `unmount` 的关闭/展开或重挂载组件重新创建。

三种策略都在组件或条目移除时释放内容。面板工厂在各次创建时保留所属 UIProvider 的主题、焦点及其他上下文；关闭、切换、重排不会把内容搬到另一个 provider。Tabs 与 Accordion 的 key 在列表内必须唯一；不通过更换同一 key 的数组位置重置草稿。

## 状态、样式与验证边界

受控值只由调用方提交，用户操作发出请求；父级拒绝请求时，视觉与语义保持已提交状态。`defaultValue` / `defaultOpen` 只初始化一次，挂载、范围或列表派生变化不会伪造用户通知。响应式包装和转发属性时保留 getter，面板 `children` 使用函数创建，避免把已经创建的交互节点重复交给多个面板。

三类容器的标题、面板、间距与焦点状态复用 UI 主题 tokens，支持运行中的主题和禁用变化；不内置高度过渡动画。面板内容负责自身业务标签和布局，自定义标题/面板样式后应核对焦点环、对比度与窄容器。它们不提供浮层、路由同步或数据加载策略。

在线示例及自动化测试验证状态、键盘事件、DOM 关联、输入保留与清理；VoiceOver 等辅助技术的实际朗读与导航仍需在目标平台单独验收，不能由 ARIA 属性或构建通过推断。通用焦点约定见[焦点与语义桥接](/ui/focus)。
