# @piant/ui

用于 Piant Canvas 应用的组件库，涵盖布局、表单、选择、导航、弹窗、通知和集合。可以组合设置页、编辑器面板和自定义工具。

## 开始使用

在已经配置 Piant JSX 的项目中，从 `@piant/ui` 导入组件，用 `UIProvider` 包住界面。

```tsx
import { Button, UIProvider } from '@piant/ui';

export function App() {
  return (
    <UIProvider>
      {() => <Button onPress={() => console.log('保存设置')}>保存设置</Button>}
    </UIProvider>
  );
}
```

`@piant/core` 由应用提供。依赖安装和挂载方式见 [UI 快速开始](../../docs/ui/quick-start.md)。如果公开 npm registry 尚无所需版本，可以从仓库运行下方的 Gallery。

## 文档与示例

- [组件目录](../../docs/ui/introduction.md)按场景查找组件、操作预览和阅读最小用法。
- [主题与 UIProvider](../../docs/ui/theme.md)介绍颜色、密度、字号和局部覆盖。
- [UI Gallery](../../examples/ui-gallery/README.md)提供可独立运行的设置面板与文档编辑示例。
- [浮层组合工作流](../../docs/ui/workflow.md)展示在同一个界面中使用弹窗、菜单、选择和通知。
