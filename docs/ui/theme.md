# 主题与 UIProvider

主题由语义 tokens 组成。`createTheme` 生成独立值，`UIProvider` 在组件树中提供响应式主题，`useUITheme` 返回当前主题的 accessor。所有 API 从 `@piant/ui` 根入口导入。

<LiveExample example="uiTheme" title="切换主题、密度与文字大小" :height="420" />

## 主题值与默认设置

```ts
import { createTheme, defaultTheme } from '@piant/ui';

const theme = createTheme({
  colorMode: 'dark',
  density: 'compact',
  fontScale: 2,
  reducedMotion: true,
  theme: { colors: { primary: '#93c5fd' } },
});
```

`createTheme(options?)` 不读取浏览器环境、不修改传入对象，返回深度冻结的 `UITheme`。`defaultTheme` 等于默认选项生成的主题：`colorMode: 'light'`、`density: 'comfortable'`、`fontScale: 1`、`reducedMotion: false`。

| Token 组      | 内容与单位                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `colors`      | `canvas`、`surface`、`surfaceRaised`、`text`、`textMuted`、`border`、`primary`、`onPrimary`、`danger`、`onDanger`、`focusRing` |
| `spacing`     | `xs`、`sm`、`md`、`lg`、`xl`，逻辑像素                                                                                         |
| `controlSize` | `sm`、`md`、`lg`，控件最小高度，逻辑像素                                                                                       |
| `typography`  | `fontFamily`，以及正文、小字、标题的字号和行高，逻辑像素                                                                       |
| `radius`      | `sm`、`md`、`lg`、`pill`，逻辑像素                                                                                             |
| `motion`      | `fast`、`normal`、`slow`，毫秒；`easing` 为缓动名称                                                                            |

默认字体为 `Arial, sans-serif`；正文为 14/20、小字为 12/16、标题为 20/28（字号/行高）。舒适密度的间距为 4/8/12/16/24、控件高度为 32/40/48；紧凑密度分别为 2/4/8/12/16 和 28/36/44。默认圆角为 4/8/12/9999，动画时长为 120/200/320 ms，缓动为 `ease-out`。

## 在组件中消费

```tsx
import { Text, View } from '@piant/core';
import { UIProvider, useUITheme } from '@piant/ui';

function Content() {
  const theme = useUITheme();
  return (
    <View
      style={{
        padding: theme().spacing.md,
        backgroundColor: theme().colors.surface,
      }}
    >
      <Text
        style={{
          color: theme().colors.text,
          fontFamily: theme().typography.fontFamily,
          fontSize: theme().typography.fontSize,
          lineHeight: theme().typography.lineHeight,
        }}
      >
        Piant UI
      </Text>
    </View>
  );
}

export function App() {
  return <UIProvider colorMode="dark">{() => <Content />}</UIProvider>;
}
```

子树使用 `{() => <Content />}` 延迟创建，让组件在 provider 的上下文中运行。`useUITheme()` 返回稳定的响应式 accessor；调用 `theme()` 获取当前值。没有 provider 时读取 `defaultTheme`。

主题读取应保留在响应式 JSX 属性或 getter 中。将 `theme().colors.text` 提前存进普通常量、解构快照或静态 `StyleSheet.create`，不会让该快照随主题更新。Provider 不自动给 `View`、`Text` 或输入框应用全部 tokens，组件应显式选择对应样式。

## 嵌套与覆盖顺序

`UIProvider` 接受 `colorMode`、`density`、`fontScale`、`reducedMotion`、`theme`、`domRoot` 和延迟创建的 `children`。嵌套 provider 未指定的选项从父级继承；其合并过程为：

1. 继承父级尚未缩放的选项和覆盖值，再应用局部选项。
2. 根据最终 `colorMode` 和 `density` 选择默认 tokens。
3. 按 token 组的叶子合并继承覆盖及局部 `theme` 覆盖，局部已定义值优先。
4. 按 `fontScale` 缩放字号及行高，计算控件最小高度，最后应用减少动画设置。

`ThemeOverrides` 只允许已定义的组及叶子。它是每组一层的部分覆盖；`undefined` 表示继承，不清空值。例如父级设置 `spacing.md` 后，子级仅设置 `colors.primary`，父级的间距覆盖仍保留。改变子级模式或密度会更新相应默认值，显式继承的覆盖仍有效。缩放使用未缩放配置，因此父子各为 `fontScale: 2` 时不会变成四倍。

```tsx
<UIProvider colorMode="dark" theme={{ spacing: { md: 16 } }}>
  {() => (
    <UIProvider density="compact" theme={{ colors: { primary: '#93c5fd' } }}>
      {() => <Content />}
    </UIProvider>
  )}
</UIProvider>
```

## 文字缩放与控件高度

`fontScale` 必须是正有限数，否则抛出 `RangeError`。`2` 表示把所有字号和行高扩大到 200%；间距和圆角不随之倍增。

`controlSize` 是最小高度：`sm` 至少容纳小字行高加两倍 `spacing.xs`，`md` 至少容纳正文行高加两倍 `spacing.sm`，`lg` 至少容纳正文行高加两倍 `spacing.md`。组件应使用这些高度或内容驱动的布局，并为换行和溢出留出空间。

[WCAG 文字缩放要求](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)关注达到 200% 后不丢失内容或功能。Token 缩放只提供工程基础；应用仍需验证实际文字、控件、布局和操作在放大后可用。

## DOM 输入的主题范围

可选 `domRoot` 是显式的 `HTMLElement`，provider 仅在该元素写入 `color`、`color-scheme`、`font-family`、`font-size`、`line-height` 内联样式。更换根元素或销毁时恢复原值及原优先级，不会自动给 `document.body` 或全局样式应用主题。

```tsx
function InputApp(props: { domRoot: HTMLElement }) {
  return (
    <UIProvider domRoot={props.domRoot} fontScale={2}>
      {() => <Content />}
    </UIProvider>
  );
}
```

Core `Input` 的原生 DOM 输入继承实际 DOM 祖先的 `fontSize`、`fontFamily` 和 `color`，因此传入的根元素必须包含对应的输入 DOM 层。Canvas 的组件树层级不等于 DOM 层级；嵌套 DOM 主题须提供各自不同的根元素，并使其包含对应输入，不能让多个 provider 写同一个元素。

`Input` 的布局与背景仍通过 core 的 `ViewStyles` 设置。主题不提供 `TextField`，也不会自动替输入框绑定背景、边框或高度。

## 减少动画

根 `UIProvider` 未指定 `reducedMotion` 时跟随 `prefers-reduced-motion`；嵌套 provider 未指定时继承父级。显式 `true` / `false` 固定偏好，`'system'` 独立跟随系统。Provider 读取初始值并监听运行期间的 `change`；切换策略或销毁时清理监听。

减少动画开启时，合并后的 `motion.fast`、`normal`、`slow` 全部为 `0`，包括用户覆盖的时长。消费者应据此直接呈现终态，或使用无需运动的反馈，仍保留操作结果。它不会自动取消应用中未消费这些 tokens 的动画。参见 [CSS 减少动画偏好](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)和 [matchMedia 动态监听](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)。

## 对比度与验证范围

默认浅色与深色配色中，`text`、`textMuted` 对 `canvas` / `surface` / `surfaceRaised`，以及 `onPrimary` 对 `primary`、`onDanger` 对 `danger`，以普通文字至少 4.5:1 为目标；`border`、`focusRing` 对上述三个中性背景，以必要非文字提示至少 3:1 为目标。应用改变颜色、透明度、相邻背景或绘制方式后，需要重新核对实际组合。焦点环位于主色或危险色内部时，不能直接假设这些中性背景组合仍适用。

这对应 [WCAG 文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)和[非文字对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)的视觉要求，不是整页 WCAG 合规声明。Canvas 的键盘交互、语义和读屏支持还需单独实现与验证；参见 [HTML Canvas 的可访问性要求](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)。
