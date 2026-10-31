# 焦点与语义桥接

`createFocusable` 将 Canvas 节点或已有原生输入注册到所属 `UIProvider` 的焦点作用域，提供键盘焦点、focus-visible 状态和 DOM 语义。`createPressable` 继续只处理指针，两者通过同一个业务动作组合。

<LiveExample example="uiFocus" title="用 Tab、Enter/Space 和箭头操作 Canvas 与原生输入" :height="560" />

先点击预览内的控件，再用 Tab 和 Shift+Tab 移动。黄色边框展示 Canvas 控件的 `focusVisible()`；Enter 或 Space 激活按钮。输入框可直接编辑文本。进入「计数操作」组后，用左右箭头或 Home/End 移动，禁用项会被跳过。

## 作用域与生命周期

根 `UIProvider` 创建独立焦点作用域；嵌套 provider 默认继承，传入 `focusScope="isolate"` 创建独立作用域。不同挂载实例不共享注册表或当前焦点。子树必须通过函数延迟创建，确保注册发生在对应上下文内：

```tsx
import { UIProvider, useUIFocus } from '@piant/ui';

function Content() {
  const scope = useUIFocus();
  // 在事件回调中调用 scope.focusFirst()，聚焦首个可用注册项。
  // scope.focused() 返回当前作用域内有焦点的 HTMLElement，或 null。
  return null;
}

export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

作用域用于组织注册与键盘行为，不形成模态焦点陷阱。禁用、隐藏和已销毁的项不能成为导航目标。注册随所属响应式 owner 或节点销毁清理，也可调用返回句柄的 `dispose()` 提前移除；清理应由创建注册的一方负责。

## 注册 Canvas 控件

```ts
import { createFocusable, createPressable } from '@piant/ui';
import type { PNode } from '@piant/core';

function bindAction(node: PNode, activate: () => void) {
  const press = createPressable(node, { onPress: activate });
  const focus = createFocusable(node, {
    name: '保存设置',
    role: 'button',
    description: '保存当前表单中的修改。',
    onActivate: activate,
  });
  return { press, focus };
}
```

Canvas 节点使用透明 DOM 按钮作为语义代理，默认角色为 `button`。指针路径由 `createPressable.onPress` 调用动作，键盘及辅助技术激活路径由 `createFocusable.onActivate` 调用同一动作；不要再为同一动作增加第二个 tap/click 激活监听。`onActivate` 收到 `(event: MouseEvent, node: PNode)`。

返回句柄提供：

| 成员             | 用途                                 |
| ---------------- | ------------------------------------ |
| `element`        | 对应的语义 DOM 元素                  |
| `focused()`      | 当前项是否有焦点                     |
| `focusVisible()` | 是否应绘制键盘焦点提示               |
| `pressed()`      | 键盘按压状态，用于与指针按压视觉合并 |
| `focus()`        | 尝试聚焦，返回是否成功               |
| `dispose()`      | 幂等地移除注册及其资源               |

Canvas 焦点环应读取 `focusVisible()`；按压视觉读取 `press.pressed() || focus.pressed()`。仅有焦点状态不会自动为 Canvas 绘制焦点环。

在 JSX 的 `ref` 中创建句柄时，用 `createState<ReturnType<typeof createFocusable>>()` 保存，并在样式中读取 `focus()?.focusVisible()`。这样 ref 初始化完成后样式能重新求值，避免属性 getter 提前执行时读取尚未赋值的变量。完整写法见本页在线示例源码。

## 响应式语义选项

选项通过 getter 保留响应式更新，避免展开或提前解构动态属性。

同一场景内默认按保留节点树的顺序组织 DOM/Tab 导航，协调重排后同步更新；不依赖 ref 的创建先后。`order` 可显式调整优先级，同值时仍按节点树顺序。独立场景之间保留注册顺序，组内成员作为连续的复合控件组织；不会使用正数 tabindex。

| 选项                                                                 | 语义                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `name: string`                                                       | 控件的可访问名称，应说明用途                                                     |
| `role?`                                                              | `button`、`checkbox`、`radio`、`switch`、`tab`、`link`、`slider` 或 `spinbutton` |
| `description?: string`                                               | 补充说明文本                                                                     |
| `checked?: boolean \| 'mixed'`                                       | 勾选状态                                                                         |
| `expanded?: boolean`                                                 | 展开状态                                                                         |
| `selected?: boolean`                                                 | 选择状态                                                                         |
| `pressed?: boolean \| 'mixed'`                                       | 切换按钮的语义按下状态；与句柄的瞬时 `pressed()` 不同                            |
| `value?: { now: number; min?: number; max?: number; text?: string }` | 数值及可读值说明                                                                 |
| `disabled?: boolean`、`hidden?: boolean`                             | 可用性及可见性                                                                   |
| `order?: number`                                                     | 作用域中的导航顺序                                                               |
| `group?: RovingFocusGroup`                                           | 所属 roving 组                                                                   |
| `domElement?: DOMElementBinding`                                     | 复用 core 的原生 DOM 绑定                                                        |
| `onActivate?`                                                        | 激活动作，接收 MouseEvent 和节点                                                 |
| `onKeyDown?`                                                         | 自定义按键处理，接收 KeyboardEvent 和节点                                        |

只提供适合该角色的状态：例如 checkbox 使用 `checked`，tab 使用 `selected`，slider 使用 `value`。角色和数值描述本身不会实现 Slider 的步长变化等控件逻辑；应用仍负责状态与对应操作。

## 复用原生 Input

```tsx
import { Input } from '@piant/core';
import { createFocusable } from '@piant/ui';

export function NameInput() {
  return (
    <Input
      defaultValue="Piant"
      ref={(node) => {
        createFocusable(node, {
          name: '显示名称',
          description: '输入保存时使用的名称。',
          domElement: node.domElement,
        });
      }}
      style={{ width: 280, height: 40 }}
    />
  );
}
```

`node.domElement` 绑定原生 input，注册复用该元素，不额外创建一份可聚焦代理。省略 `role` 保留输入框自身的语义。原生输入继续使用浏览器的编辑、选区、中文输入和键盘行为，不按 Canvas 按钮方式截获 Enter/Space。需要监听值时，继续使用 core Input 的 `onInput`、`onChange` 等属性。

原生输入的禁用状态由 `Input.disabled` 管理；传入 `domElement` 时不接受注册选项 `disabled`，注册表会读取真实原生禁用状态。Canvas 代理使用 `createFocusable` 的 `disabled`，组合指针原语时把同一 getter 传给 `createPressable`。

## Roving 组

`createRovingFocusGroup({ role?, name?, orientation?, loop?, dir? })` 创建组句柄，用作注册选项的 `group`，并提供 `dispose()`。

- `role`：`toolbar`、`radiogroup`、`tablist` 或 `group`。
- `orientation`：`horizontal`、`vertical` 或 `both`。
- `dir`：`ltr` 或 `rtl`，用于水平方向导航。
- `loop`：是否从末项循环至首项，或反向循环。

每组只有一个 Tab 停靠项；箭头按方向移动焦点，Home/End 到首末可用项。禁用和隐藏项被跳过。移动焦点不等同于提交选择值，应用仍通过激活动作管理选中状态。

## 验证边界

浏览器实际键盘操作、可访问性树检查与屏幕阅读器实际朗读是不同的验证。确认 DOM 角色、名称和状态可解析，不能直接证明特定读屏器的朗读及操作体验。

本页示例用于交互检查，不代表所有浏览器或读屏器组合均已验证。发布验收需分别记录浏览器/系统、键盘路径、读屏器与版本、实际朗读结果，以及未覆盖范围；尚未完成的读屏验证应保持待测状态。
