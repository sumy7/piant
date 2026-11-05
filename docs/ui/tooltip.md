# Tooltip

`Tooltip` 为控件补充简短文字，例如解释按钮效果或图标含义。

<LiveExample example="uiTooltip" title="悬停或聚焦按钮以查看说明" :height="340" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '@piant/ui';

<Tooltip>
  {() => (
    <View>
      <TooltipTrigger onPress={saveDraft}>保存草稿</TooltipTrigger>
      <TooltipContent>保存当前草稿，项目保持未发布。</TooltipContent>
    </View>
  )}
</Tooltip>;
```

在 [OverlayHost](/ui/overlays) 下使用。默认悬停约 500 毫秒显示，键盘聚焦时立即显示。指针可以移到提示上继续阅读，离开后默认保留约 200 毫秒。可以用 `openDelay` 和 `closeDelay` 调整悬停等待时间。Escape 关闭提示，触发器仍可正常操作。

触摸操作不会显示悬停提示。必要信息应直接可见或放在可点击的帮助入口。需要在面板中放按钮、链接或输入框时用 [Popover](/ui/popover)。
