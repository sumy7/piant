# @piant/ui

Piant 的 Canvas UI 组件包，提供可与 `@piant/core` 组合的主题上下文、语义 tokens、共享交互原语、布局和状态展示组件。

## 安装与入口

```bash
pnpm add @piant/ui @piant/core "pixi.js@^8.22.0"
```

本包仅提供 ESM。公共入口为 `@piant/ui`，内部目录不提供子路径导出：

- 主题：`createTheme`、`defaultTheme`、`UIProvider`、`useUITheme`。
- 交互：`createControllableState`、`createPressable`。
- 焦点：`createFocusable`、`createRovingFocusGroup`、`useUIFocus`。
- 布局：`Stack`、`Surface`、`Separator`、`Spacer`。
- 展示：`Icon`、`Badge`、`ProgressBar`、`Spinner`。
- 操作：`Button`、`IconButton`。
- 类型：`ColorMode`、`ControlDensity`、`ThemeTokens`、`ThemeOverrides`、`ThemeOptions`、`UITheme`、`UIProviderProps`、`ControllableStateOptions`、`PressableOptions`、`PressableState`、`SpacerProps`、`StackProps`、`SurfaceProps`、`SeparatorProps`、`IconProps`、`IconDraw`、`BadgeProps`、`ProgressBarProps`、`SpinnerProps`、`ButtonProps`、`IconButtonProps`、`ButtonIconContext`、`ButtonPressEvent`、`ButtonSize`、`ButtonVariant`。

`@piant/core` 是 peer dependency，由应用提供，版本须满足已安装 UI 包的 `peerDependencies`。Core 的 peer dependency 为 `pixi.js ^8.22.0`。UI 构建保留对 core 的外部引用，不打包另一份 core 或响应式运行时。

## Spacer

`Spacer` 在父容器的 Flex 主轴上留出空间。`size?: number` 指定逻辑像素间距；省略时填充剩余空间。父容器的 `flexDirection` 决定间距方向。组件不接收 `children`、`style` 或 `ref`。

```tsx
import { View } from '@piant/core';
import { Spacer } from '@piant/ui';

export function App() {
  return (
    <View style={{ width: 320, height: 80, flexDirection: 'row' }}>
      <View style={{ width: 40, height: 40, backgroundColor: '#34d399' }} />
      <Spacer size={20} />
      <View style={{ width: 40, height: 40, backgroundColor: '#60a5fa' }} />
    </View>
  );
}
```

应用自己的 JSX 需要配置 `@piant/babel-preset-piant`，参见 [安装与配置](https://piant.sumygg.com/guide/installation)。UI 包内部的 TSX 已在构建时通过该预设转换，发布文件为 JavaScript ESM 和 `.d.ts`，消费者无需转换依赖源码。直接调用 `Spacer(props)` 的普通 TypeScript 消费端无需 Babel；[ui-smoke 示例](../../examples/ui-smoke/src/index.ts) 演示了这种方式及响应式更新、卸载检查。

## 布局与状态组件

`Stack` 提供方向、对齐、换行与 token 间距；`Surface` 提供语义背景、内边距、圆角与可选边框；`Separator` 提供横纵分隔线。`Icon` 接受调用方的 Sprite/Graphics 资产或按实际尺寸绘图的回调，不捆绑图标集。资产由调用方持有，Icon 不销毁资产或 texture。`Badge` 使用 core Text 的真实文字测量，支持语义配色、内容驱动尺寸与受约束宽度下的省略号；`style`/`ref` 对应外层 View，`textStyle` 单独覆盖内部标签的文字样式。

`ProgressBar` 支持 min/max/value、边界归一化和不确定状态；`Spinner` 支持尺寸、颜色、线宽与暂停。动画响应减少动画偏好，并随 owner 或节点销毁清理。可选 `label` 为 Icon、ProgressBar、Spinner 附加无 Tab 停靠的 DOM 展示语义；实际读屏支持需在目标应用验证。

组件的 `style` 在默认样式后应用。Props 与主题应保留响应式 getter；`Surface` 不会给子树的 core Text 自动继承文字样式。所有组件及其 `Props` 类型从包根入口导出。详细属性、资源所有权、动画契约与每组件独立在线示例见[布局与状态文档](../../docs/ui/foundations.md)。

## Button 与 IconButton

`Button` 提供文字或自定义内容操作，`IconButton` 提供带必填语义名称的图标操作。两者需在 `UIProvider` 的延迟子树中创建，复用主题、按压与焦点能力，支持尺寸、语义变体、禁用、加载、焦点环和统一 `onPress`。图标回调读取响应式尺寸与颜色；加载时使用遵循减少动画偏好的 Spinner。

`style`/`ref` 对应外层 View，Button 的 `textStyle` 可覆盖默认标签样式。文字标签可推导按钮名称，自定义内容与 IconButton 必须提供非空 `name`。API、键盘行为、资源清理和独立在线示例见[按钮文档](../../docs/ui/buttons.md)。实际读屏支持仍需在目标辅助技术中验证。

## 主题

`createTheme(options?)` 是不读取浏览器偏好的纯函数，返回深度冻结的 `UITheme`；`defaultTheme` 使用浅色、舒适密度、`fontScale: 1`、`reducedMotion: false`。主题包含 `colors`、`spacing`、`controlSize`、`typography`、`radius`、`motion` 六组 tokens。

```tsx
import { Text } from '@piant/core';
import { UIProvider, useUITheme } from '@piant/ui';

function Content() {
  const theme = useUITheme();
  return (
    <Text
      style={{
        color: theme().colors.text,
        fontSize: theme().typography.fontSize,
      }}
    >
      Piant UI
    </Text>
  );
}

export function ThemedApp() {
  return <UIProvider colorMode="dark">{() => <Content />}</UIProvider>;
}
```

子树通过函数延迟创建，确保 `useUITheme()` 在上下文中运行。它返回响应式 accessor；应在响应式样式读取中调用，不能把读取结果提前存进静态 `StyleSheet.create`。无 provider 时返回 `defaultTheme`。

嵌套 provider 继承未缩放配置；先选择模式与密度默认值，再合并父级及局部 token 叶子覆盖，最后缩放字号/行高、抬高控件最小高度并应用减少动画策略。`theme` 仅接受已定义组和叶子，`undefined` 继承原值。`fontScale` 必须为正有限数，`2` 表示文字放大到 200%。根 provider 默认跟随系统减少动画偏好，嵌套 provider 默认继承，也可显式传 `true`、`false` 或 `'system'`。

可选 `domRoot` 只为指定 DOM 元素设置字体、文字颜色和配色方案，销毁时恢复原内联样式。原生 `Input` 的字号、字体和文字颜色从其真实 DOM 祖先继承；嵌套 DOM 主题须提供各自不同的根元素。Canvas 组件仍须显式消费 tokens。完整合并规则、默认值及视觉验证边界见[主题文档](../../docs/ui/theme.md)。

## 共享交互

`createControllableState({ value?, defaultValue, onChange? })` 返回 `[value, setValue]`。`defaultValue` 必填且只读取一次；`value` 为 `undefined` 时非受控，`null`、`false`、`0` 仍是受控值。Setter 接受值或 updater，使用 `Object.is` 跳过相同值并返回请求值。受控模式只通知最新回调，由父级提交；切回非受控时恢复最后内部值或初始化默认值。通过 getter 可适配 `value/defaultValue/onValueChange`、`checked/defaultChecked/onCheckedChange`、`open/defaultOpen/onOpenChange`。

`createPressable(node, { disabled?, onPress? })` 为已有 `PNode` 返回 `hovered()`、`pressed()`、`disabled()` 和 `dispose()`。主指针按下后，移出暂停按压视觉、移回恢复，控件内释放只触发一次；取消、禁用和销毁不会激活动作。绑定随 owner 或节点销毁清理自己的资源，不移除其他监听。它只处理指针行为，不包含视觉 Button、键盘或焦点。

响应式选项和回调用 getter 传递，避免对象展开产生快照。完整契约、Pixi 取消事件边界及在线示例见[交互文档](../../docs/ui/interactions.md)。

## 焦点与语义

`UIProvider` 根实例创建焦点作用域，嵌套默认继承，`focusScope="isolate"` 可独立管理。`createFocusable` 为 Canvas 节点提供透明语义代理，或通过 `domElement: node.domElement` 注册 core Input 的原生元素。它提供焦点、focus-visible、键盘按压状态和激活回调；`createRovingFocusGroup` 提供单 Tab 停靠与箭头/Home/End 导航。指针仍由 `createPressable` 处理，两条路径共享业务动作。Canvas 焦点环需显式消费 `focusVisible()`。接入和读屏验证边界见[焦点文档](../../docs/ui/focus.md)。

## 工程边界

Core 提供渲染节点、响应式原语、生命周期、基础组件与样式能力；UI 通过 core 公共入口组合布局与控件策略，不深度导入 core 源码。

源码按职责组织：

- `src/theme/`：主题相关代码。
- `src/primitives/`：共享行为与内部工具。
- `src/components/`：组件实现；组件使用 PascalCase，属性类型使用 `Props` 后缀。
- `src/index.ts`：显式列出公共出口。
- `tests/`：组件与构建产物测试。

UI 不在模块加载时注册全局监听或修改 DOM，使用 `sideEffects: false` 允许构建器剔除未使用代码。此声明仅属于 UI 包；core 与其依赖保留自身的初始化语义。新增具有外部初始化副作用的文件必须在 `sideEffects` 中显式保留。Provider 的媒体查询监听和 DOM 样式由实例生命周期管理。

## 验证

仓库开发环境要求 Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`。在仓库根目录执行：

```bash
pnpm --filter @piant/ui build
pnpm --filter @piant/ui typecheck
pnpm --filter @piant/ui test:run
pnpm --filter @piant/ui verify:package
pnpm --filter @piant/examples-ui-smoke typecheck
pnpm --filter @piant/examples-ui-smoke build
pnpm --filter @piant/examples-ui-smoke dev
```

`verify:package` 在仓库外复制工作区版本元数据与构建文件，执行 Changesets 版本预演后 pack，并隔离验证发布消费。它会检查发布 peer 与核心版本匹配，同时断言源码版本与 Changesets 未被改写。使用真实本地 core tarball 的验证不能等同于 registry 发布验证。浏览器中打开 smoke 示例，检查初始间距、点击「Increase gap」后的间距变化，以及「Unmount」后的资源清理；`/theme.html` 提供主题消费场景，`/pressable.html` 提供交互原语消费场景，`/foundations.html` 提供七个基础组件的组合预览，可操作主题、进度、窄容器、缩放和卸载；`/buttons.html` 提供 Button/IconButton 的键盘、事件替换、禁用与反复加载验证。生产构建成功本身不代表浏览器运行通过。
