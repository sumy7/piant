# 主题与 UIProvider

把 UIProvider 放在应用的组件树外层，为组件统一设置浅色或深色外观、间距密度和文字大小。

<LiveExample example="uiTheme" title="切换主题、密度与文字大小" :height="420" hide-source />

点击切换按钮，观察浅色、舒适密度与深色、紧凑密度的区别，以及放大后的文字。

## 基本用法

```tsx
import { Button, UIProvider } from '@piant/ui';

export function App() {
  return (
    <UIProvider colorMode="dark" density="compact">
      {() => <Button>保存设置</Button>}
    </UIProvider>
  );
}
```

用函数作为 `children`，让子组件在 Provider 的主题下创建。将状态值传给属性即可切换主题，已有控件会跟随更新。

## 主题值与默认设置

| 选项            | 用法                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| `colorMode`     | 默认 `'light'`，可切换为 `'dark'`。                                                        |
| `density`       | 默认 `'comfortable'`，也可用 `'compact'` 缩小间距和控件高度。                              |
| `fontScale`     | 默认 1，传入正数放大或缩小字号与行高。2 表示 200%。                                        |
| `reducedMotion` | 默认跟随系统偏好。传入布尔值固定设置，或用 `'system'` 明确跟随系统。                       |
| `theme`         | 按需覆盖 `colors`、`spacing`、`controlSize`、`typography`、`radius` 和 `motion` 中的属性。 |

用 `createTheme(options)` 可在组件外生成一份主题值。用 `defaultTheme` 读取默认主题。

## 在组件中消费

Piant UI 组件会使用当前主题。自己组合 Core 的 View 或 Text 时，用 `useUITheme()` 读取所需颜色和尺寸。

```tsx
import { View } from '@piant/core';
import { useUITheme } from '@piant/ui';

function PreviewPanel() {
  const theme = useUITheme();
  return (
    <View
      style={{
        padding: theme().spacing.md,
        backgroundColor: theme().colors.surface,
        borderRadius: theme().radius.md,
      }}
    />
  );
}
```

在响应式属性中调用 `theme()`，以便切换主题后同步更新。

## 嵌套与覆盖顺序

嵌套 Provider 会继承父级设置，局部配置优先。可以只给工具栏改用紧凑密度，或在该 Provider 的 `theme` 中设置 `colors.primary` 来覆盖局部主色。

## 文字缩放与控件高度

`fontScale` 放大字号和行高。控件最小高度会为更大的文字留出空间，间距与圆角保留各自设定。应用自定义布局时，仍应为文字换行留出足够空间。

## DOM 输入的主题范围

用 UI 的 [TextField](./text-field) 可直接获得主题样式。如果使用 Core 的原生 Input，可把包含输入 DOM 的宿主元素传给 `domRoot`，让该范围继承主题字体和颜色。每个独立主题应使用自己的宿主。

## 减少动画

开启减少动画后，主题里的动画时长为 0。自定义动画读取这些值后，可以直接呈现终态。
