# Menu 与 Select

`Menu` 提供一组明确的动作，`Select` 从已知选项中提交一个值。两者以触发器为锚点，复用 `OverlayHost` 的非模态浮层与生命周期；它们都需在 `UIProvider` 和 `OverlayHost` 的函数子树中创建。

## Menu

<LiveExample example="uiMenu" title="Menu：动作导航、禁用项、受控关闭与 Dialog 嵌套" :height="460" />

通过 Enter / Space 或方向键打开菜单，使用上下方向键、Home / End 和字符前缀浏览，Enter / Space 或点击执行当前动作。禁用的 Export 可以被导航发现，但不会执行。示例只更新本地动作计数，不操作文件或服务。

Menu 打开时点击后面的背景操作会先关闭菜单并消费这次手势；再次点击才执行背景动作。勾选“拒绝 Menu 关闭请求”后，执行动作仍由明确激活触发，但父级可保持菜单打开，不会自动重复动作。Dialog 示例展示菜单关闭回到父弹窗的触发器，Escape 不越过当前顶层关闭父弹窗。

```tsx
import { View } from '@piant/core';
import { Menu, MenuTrigger, MenuContent } from '@piant/ui';

<Menu
  label="项目操作"
  items={[
    { value: 'rename', label: 'Rename 重命名' },
    { value: 'export', label: 'Export 导出', disabled: true },
  ]}
  onAction={(value) => runProjectAction(value)}
>
  {() => (
    <View>
      <MenuTrigger>项目操作</MenuTrigger>
      <MenuContent />
    </View>
  )}
</Menu>;
```

### Menu API

| 组件或属性                              | 类型与行为                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Menu.label`                            | 必填非空 `string`，为菜单提供名称；Trigger 的文字由它自己的 `children` 提供                                                          |
| `items`                                 | 必填 `readonly MenuOption[]`；每项有唯一非空 `value`、非空 `label`、可选 `disabled`                                                  |
| `open` / `defaultOpen` / `onOpenChange` | 受控打开值、初始化非受控值和状态请求回调；默认关闭                                                                                   |
| `disabled`                              | 禁止根组件的触发与动作；空数据也使触发器不可用                                                                                       |
| `onAction`                              | `(value: string, event: ChoiceSelectEvent) => void`，明确激活可用条目时调用                                                          |
| `children` / `style` / `ref`            | 部件工厂 `() => unknown`，以及根 View 的样式与引用                                                                                   |
| `MenuTrigger`                           | 复用 `ButtonProps`，需要自己的文字或名称；提供 `aria-haspopup="menu"`、展开状态和内容关联                                            |
| `MenuContent`                           | 默认宽 `240`、高 `280` CSS 像素；省略 `children` 时自动渲染数据中的 MenuItem                                                         |
| `MenuItem`                              | 必填 `value`，查找根数据中的标签与禁用状态；可选 `onSelect(event: ChoiceSelectEvent)`、`style`、`textStyle`、`ref`，不接收交互子内容 |

Menu 的 DOM 焦点停在 `role="menu"` 容器，当前候选通过 `aria-activedescendant` 指向 `role="menuitem"`，不会在每次导航时调用动作或移动到一排独立按钮。禁用项通过 `aria-disabled` 表达，保持可发现；指针和键盘均不能激活。

公共类型 `ChoiceSelectEvent` 表达原始指针/点击或键盘激活事件，可通过 `preventDefault()` 取消后续操作。自定义条目回调先于根动作执行：`MenuItem.onSelect` → 未阻止时 `Menu.onAction` → 仍未阻止时请求关闭。`event.preventDefault()` 可以停止后续步骤；回调销毁节点或父 owner 后不会继续执行过期动作。

## Select

<LiveExample example="uiSelect" title="Select：预览与提交、受控拒绝、动态值和空列表" :height="520" />

字段名称是“项目可见性”，触发器展示已提交值。打开后方向键和字符前缀只改变候选；Enter / Space 或点击才提交。按 Escape、Tab 或点击外部取消本次预览，保留原提交值。连续输入 `p` 可在 Private 和 Public 之间循环查找。

勾选“拒绝 Select 值更新”后，确认发出请求但值仍由父级保留；打开值独立管理，面板仍可正常关闭。勾选“拒绝 Select 关闭请求”可观察关闭被拒绝时不重复提交。移除 Team 选项只改变显示，不伪造值变化；恢复同一个 key 后，若存储值仍为 `team`，触发器恢复显示该标签。空列表关闭视觉面并禁用触发器。

```tsx
import { View } from '@piant/core';
import { Select, SelectTrigger, SelectContent } from '@piant/ui';

<Select
  label="项目可见性"
  defaultValue="team"
  options={[
    { value: 'team', label: 'Team 团队' },
    { value: 'private', label: 'Private 私密' },
    { value: 'public', label: 'Public 公开' },
  ]}
  onValueChange={(value) => saveVisibility(value)}
>
  {() => (
    <View>
      <SelectTrigger />
      <SelectContent />
    </View>
  )}
</Select>;
```

### Select API

| 组件或属性                              | 类型与行为                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Select.label`                          | 必填非空 `string`，作为 combobox 的字段名称，与当前值标签分开                                                                                           |
| `options`                               | 必填 `readonly SelectOption[]`，每项包含唯一非空 `value`、非空 `label` 和可选 `disabled`                                                                |
| `value` / `defaultValue`                | `string \| null`，分别为受控值与非受控初值；`null` 表示没有选择                                                                                         |
| `onValueChange`                         | `(value: string \| null) => void`，只通知明确提交的值请求                                                                                               |
| `open` / `defaultOpen` / `onOpenChange` | 独立于选择值的打开状态，遵循相同受控约定                                                                                                                |
| `placeholder`                           | 无有效已提交选项时展示的文字，默认 `Select an option`                                                                                                   |
| `disabled`                              | 禁止触发与提交；空选项列表也禁用触发器                                                                                                                  |
| `children` / `style` / `ref`            | 部件工厂及根 View 的样式与引用                                                                                                                          |
| `SelectTrigger`                         | 支持 Button 的 `size`、`variant`、`icon`、`disabled`、`loading`、`style`、`textStyle`、`ref` 和 `onPress`；不接收 `children` / `name`，显示由根状态决定 |
| `SelectContent`                         | 默认宽 `280`、高 `280` CSS 像素；不提供 `children` 时自动渲染 SelectItem                                                                                |
| `SelectItem`                            | 必填 `value`，从根数据读取标签与禁用状态；可选 `onSelect(event: ChoiceSelectEvent)`、`style`、`textStyle`、`ref`，不接收交互子内容                      |

Canvas 触发器同时显示字段名和已提交标签。SelectTrigger 使用具有 `role="combobox"` 的真实 button；DOM 焦点在打开期间仍停在触发器，通过 `aria-activedescendant` 指向 `role="listbox"` 中的当前 `role="option"`。触发器的名称来自 `label`，已提交值使用真实 DOM 文字表达，选项的 `aria-selected` 对应已提交选择。它不是可编辑输入框，不接受自由文字；程序聚焦触发器也不会进入文本编辑。

方向导航只预览，不调用 `onValueChange`。`SelectItem.onSelect` 未阻止时才进入值提交流程，再请求关闭。受控选择被拒绝更新时不重试、不自动换成另一个值；关闭请求可以独立成功或被拒绝。未知或已移除的存储值显示 placeholder，不因此通知 `onValueChange`。稳定 key 恢复后可重新显示原选择。

## 键盘与关闭策略

| 操作                        | Menu                                        | Select                               |
| --------------------------- | ------------------------------------------- | ------------------------------------ |
| Trigger Enter / Space       | 打开并指向第一项；已打开时按触发器策略切换  | 打开选择面板；打开后提交当前可用候选 |
| Trigger ArrowDown / ArrowUp | 打开并指向第一项 / 最后一项                 | 打开并预览，保持已提交值不变         |
| 内容 ArrowDown / ArrowUp    | 在条目中循环                                | 候选移动到边界后停止，不循环         |
| Home / End                  | 第一项 / 最后一项                           | 第一项 / 最后一项，只预览            |
| 字符前缀                    | 700ms 内累计匹配，多次同字符循环查找        | 同样支持前缀与重复字符，仍只预览     |
| Enter / Space / 条目点击    | 激活可用条目并请求关闭                      | 提交可用候选并请求关闭               |
| Escape                      | 关闭当前菜单并恢复安全焦点                  | 取消预览并关闭，值不变               |
| Tab / Shift+Tab             | 关闭，离开至触发器后的同作用域控件 / 触发器 | 取消预览并关闭，继续正常焦点移动     |
| 外部主指针                  | 请求关闭并消费该次手势                      | 取消预览、请求关闭并消费该次手势     |

禁用项参与方向键和字符查找，但不执行动作或提交。导航时当前候选保持可见，包括已提交选项初次打开时位于滚动区域之外的情况。条目重排以 `value` 为身份；当前候选移除后按邻近条目修复，不按旧数组下标错误复用业务值。空数据或触发器隐藏/销毁时，失效视觉面会安全释放，即使受控父级拒绝更新打开值，也不保留过期锚点。

两类浮层是非模态的，但默认外部关闭策略会消费原始指针手势，避免一次点击同时关闭菜单并执行背景动作；这与 Popover 保留外部背景手势的策略不同。焦点移至同一实例内的浮层外控件时也请求关闭；其他实例和外部 DOM 的焦点事件由各自范围处理。受控调用方仍需提交最终状态；拒绝关闭不意味着重复业务动作。

## 内容组合与生命周期

每个根组件最多一个 Trigger 和一个 Content。Content 接受 `width`、`height`、`placement`、`gap`、`padding`、`flip`、`shift`、`style`、`ref`、`onError`，定位参数及正有限尺寸要求沿用[浮层底座](/ui/overlays)。默认内容根据根数组自动生成；需要条目样式或回调时，可在 Content 的工厂函数中按稳定 key 创建对应 MenuItem / SelectItem，标签和禁用状态仍以根数组为准。

```tsx
<Menu label="项目操作" items={[{ value: 'rename', label: '重命名' }]}>
  {() => (
    <View>
      <MenuTrigger>项目操作</MenuTrigger>
      <MenuContent>
        {() => (
          <MenuItem
            value="rename"
            onSelect={(event) => event.preventDefault()}
          />
        )}
      </MenuContent>
    </View>
  )}
</Menu>
```

这个自定义回调阻止根动作与自动关闭；没有指定 `children` 时不需要手写 Item。列表工厂只创建相应条目，不放入 TextField、其他按钮或可编辑表单。需要表单使用 Popover 或 Dialog。

内容只在打开期间存在，关闭即释放条目 owner、Canvas、原生语义节点和监听，再次打开重新创建。父 owner、Host、触发器和根组件卸载会清理所属内容。动态 props 与主题通过 getter 保持响应式；不通过重建整套浮层管理器刷新标签、字号、禁用或选择状态。回调中父级同步更新、销毁或拒绝状态都不会导致同一次激活重复发出业务请求。

## 语义与支持边界

菜单使用 Menu / MenuItem 的动作语义，选择框使用 select-only combobox / listbox / option 的字段语义；二者不互换角色。当前实现没有 MenuItemCheckbox、MenuItemRadio、Submenu 或可编辑 Combobox API，也不创建隐藏原生表单字段。表单提交由应用读取已提交值并自行接入。

[APG Menu 模式](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)描述了菜单中的方向导航、Tab 离开和禁用项发现。[APG select-only 示例](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)区分候选浏览与提交；本组件选择让 Tab 和焦点离开取消预览，这与该示例提交当前候选的策略不同。这里的 700ms 字符窗口和边界行为是组件约定，不是规范常量。button 上使用 combobox 角色符合 [ARIA in HTML 的 button 角色约束](https://www.w3.org/TR/html-aria/#el-button)，但角色合法本身不能证明辅助技术操作已验收。

嵌套在 Dialog 或 Popover 中时，仍复用当前 Host 的栈和许可焦点范围；独立 Canvas 保持实例边界。浏览器顶层、缩放和祖先裁剪约束见[浮层底座](/ui/overlays)。Chrome AX 检查只能证明对应名称、值、角色与关联被暴露，不代表 VoiceOver 朗读、选项导航或触摸读屏已通过。字符导航也不等于支持操作系统中文候选窗口；真实系统 IME 和辅助技术应在目标平台分别验收。构建、组件/文档测试、浏览器交互和人工辅助技术结果需独立记录。
