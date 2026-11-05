# IconButton

`IconButton` 用于工具栏等空间有限的地方，比如刷新预览或打开设置。

<LiveExample example="uiIconButton" title="点击刷新图标" :height="270" hide-source />

## 用法

```tsx
import { Icon, IconButton } from '@piant/ui';

<IconButton
  name="添加项目"
  icon={({ size, color }) => (
    <Icon
      size={size()}
      color={color()}
      draw={(graphics, width, height, ink) => {
        graphics
          .moveTo(width / 2, 0)
          .lineTo(width / 2, height)
          .moveTo(0, height / 2)
          .lineTo(width, height / 2)
          .stroke({ color: ink, width: 2 });
      }}
    />
  )}
  onPress={addProject}
/>;
```

`name` 和 `icon` 必填。名称应说明操作，例如“添加项目”。可在 `icon` 回调中读取主题提供的尺寸与颜色。还可使用 [Button](/ui/button) 的 `size`、`variant`、`disabled` 和 `loading`。需要同时展示文字和图标时，使用 Button 的 `icon` 属性。
