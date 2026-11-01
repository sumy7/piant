# Button 与 IconButton

`Button` 将文字或自定义内容呈现为操作按钮，`IconButton` 提供带语义名称的图标操作。两者从 `@piant/ui` 根入口导入，组合现有主题、按压与焦点原语，处理指针、键盘、禁用和加载状态。

## Button

<LiveExample example="uiButton" title="Button：操作计数、禁用、加载与主题切换" :height="540" />

Button 必须在 `UIProvider` 的延迟子树中创建。普通文字或数字内容可以作为语义名称；也可显式传入 `name`。动态标签先在函数中计算，再交给 JSX，避免复杂内联文字表达式。

```tsx
import { createState } from '@piant/core';
import { Button, UIProvider } from '@piant/ui';

function Content() {
  const [count, setCount] = createState(0);
  const label = () => `保存 ${count()} 次`;
  return (
    <Button onPress={() => setCount((value) => value + 1)}>{label()}</Button>
  );
}

export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

`ButtonProps` 提供以下属性；尺寸、变体、图标上下文和事件类型分别导出为 `ButtonSize`、`ButtonVariant`、`ButtonIconContext`、`ButtonPressEvent`：

| 属性           | 类型与默认值                                                   | 行为                                             |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `children`     | 文字、数字或 core 节点内容                                     | 默认标签使用主题字体、颜色和真实文字测量         |
| `name`         | 可选非空 `string`                                              | 覆盖由文字内容推导的语义名称；自定义内容必须提供 |
| `size`         | `'sm' \| 'md' \| 'lg'`，`'md'`                                 | 选择主题最小控件高度和内容间距                   |
| `variant`      | `'primary' \| 'secondary' \| 'ghost' \| 'danger'`，`'primary'` | 选择主色、中性、透明或危险色外观                 |
| `disabled`     | `boolean`，`false`                                             | 禁止指针与键盘激活，不参与 Tab 导航              |
| `loading`      | `boolean`，`false`                                             | 显示 Spinner，同时禁用操作并同步 `aria-busy`     |
| `onPress`      | `(event, node) => void`                                        | 统一指针与键盘/DOM 语义激活回调                  |
| `icon`         | `(context) => JSX.Element`，可选                               | 创建与按钮尺寸、颜色同步的图标                   |
| `style`、`ref` | 对应 core `View` 属性                                          | 设置或取得外层按钮节点                           |
| `textStyle`    | 对应 core `Text` 的 `style`                                    | 覆盖默认文字标签样式                             |

最小高度来自当前密度的 `controlSize`，文字放大时跟随主题增大。`style` 在组件默认样式后应用，可以覆盖宽度、内边距、背景、边框等；`textStyle` 在标签默认样式后应用。自定义内容负责自身颜色、字体和内容语义，按钮不会递归修改子节点。自定义内容与图标仅用于展示，不支持嵌套 Button、Input 或其他可交互/可聚焦控件。

## IconButton

<LiveExample example="uiIconButton" title="IconButton：带名称的刷新操作与加载状态" :height="500" />

`IconButtonProps` 共享 Button 的 `size`、`variant`、`disabled`、`loading`、`onPress`、`style` 与 `ref`；必须提供非空 `name` 和 `icon` 绘制回调，不接受 `children`。默认最小宽高相同，适合工具栏中的单个图标操作。`name` 应描述操作，例如“刷新预览”，而不是仅描述图案。

```tsx
<IconButton
  name="添加项目"
  icon={(context) => (
    <Icon
      size={context.size()}
      color={context.color()}
      draw={(graphics, width, height, color) => {
        graphics
          .moveTo(width / 2, 0)
          .lineTo(width / 2, height)
          .moveTo(0, height / 2)
          .lineTo(width, height / 2)
          .stroke({ color, width: 2 });
      }}
    />
  )}
  onPress={() => addItem()}
/>
```

图标回调的 `context.size`、`context.color` 是响应式 accessor。应在图标的 JSX 属性或 getter 中调用它们，使运行中的主题、按钮尺寸与状态变化继续生效。图标本身通常作为装饰内容，操作名称由外层按钮提供；无需给内部 Icon 再添加重复 `label`。调用方资产仍遵循 [Icon 的资源所有权规则](/ui/foundations#icon)。

加载时原内容保持布局但变为透明，居中的 Spinner 提供视觉反馈，因此按钮尺寸和语义名称保持稳定，已有图标节点也保留。Spinner 跟随减少动画偏好，减少动画时保留静态加载反馈。`loading` 由调用方控制；异步提交时应在 `onPress` 中先同步设置加载状态，再等待操作完成并恢复状态，组件不会自动追踪返回的 Promise。

## 指针、键盘与状态

两种按钮都通过 `createPressable` 处理指针按下、悬停、移出/移回、释放与取消，通过 `createFocusable` 提供 DOM 语义代理、焦点与键盘激活。使用统一 `onPress` 接收操作，无需额外叠加 core `onClick` 或 `pointertap` 监听。

指针在按钮内释放时激活；移出释放或取消不激活。键盘 Tab 导航到可用按钮后，Enter 按下时激活，Space 释放时激活；重复按键与输入法合成不会重复提交。DOM 语义代理的 click 也进入同一回调。`event` 在指针路径为 Pixi pointer 事件，在键盘或 DOM 语义路径为 `MouseEvent`；第二个参数始终为按钮 `PNode`。事件来自不同路径，业务处理通常只依赖操作本身。

Hover、press 与 focus-visible 有独立视觉反馈，焦点环向按钮外侧偏移 4px。父级设置 `overflow: 'hidden'` 时可能裁剪外环，应为按钮周围保留空间。`disabled` 与 `loading` 都会取消未完成的按压、阻止操作，并移出 Tab 停靠；加载还设置 `aria-busy`。节点或所属 owner 销毁时，按压、焦点、DOM 代理和加载动画资源随之释放。

## 主题与验证范围

按钮在运行中消费颜色、字体、间距、密度、圆角和控件尺寸 tokens，支持明暗主题与文字缩放。`primary` 使用主色及其前景色，`danger` 使用危险色及其前景色，`secondary` 使用中性表面和边框，`ghost` 保留透明背景。修改默认外观后，需要在应用的真实背景上检查对比度、焦点环与窄容器内容。

Canvas 视觉与无障碍 DOM 代理的名称、role、禁用和忙碌属性共同表达按钮状态。浏览器键盘验证与 DOM 语义检查不等于实际读屏验证；VoiceOver 等辅助技术的朗读、操作顺序和浏览器组合仍需单独验收。焦点作用域、嵌套 provider 与验证边界参见[焦点与语义桥接](/ui/focus)。
