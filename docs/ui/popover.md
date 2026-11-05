# Popover

`Popover` 在触发控件旁显示可交互面板，适合就地编辑备注或调整少量设置。背景控件仍可操作。

<LiveExample example="uiPopover" title="打开备注面板并编辑" :height="380" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  TextField,
} from '@piant/ui';

<Popover>
  {() => (
    <View>
      <PopoverTrigger>编辑备注</PopoverTrigger>
      <PopoverContent
        name="项目备注"
        actions={() => <PopoverClose>完成</PopoverClose>}
      >
        {() => <TextField aria-label="备注" defaultValue="Piant" />}
      </PopoverContent>
    </View>
  )}
</Popover>;
```

在 [OverlayHost](/ui/overlays) 下放置触发器与内容。用 `name` 为面板命名。默认从触发器下方起始端打开，可用 `placement` 调整方向，空间不足时会自动避让。

打开后，焦点进入第一个可用控件。默认在按 Escape、点击外部或焦点离开时请求关闭。需要由应用决定是否关闭时，使用 `open` 和 `onOpenChange`。将需跨次保留的草稿放在面板外。

纯文字提示使用 [Tooltip](/ui/tooltip)，需要阻止同一 Canvas 的背景操作时使用 [Dialog](/ui/dialog)。
