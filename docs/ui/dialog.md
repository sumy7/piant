# Dialog

`Dialog` 用于在弹窗里编辑内容或完成一项任务。打开时将焦点移入弹窗，并限制同一 Canvas 中的背景操作。

<LiveExample example="uiDialog" title="打开个人资料弹窗并编辑" :height="340" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  TextField,
} from '@piant/ui';

<Dialog>
  {() => (
    <View>
      <DialogTrigger>编辑项目</DialogTrigger>
      <DialogContent actions={() => <DialogClose>完成</DialogClose>}>
        {() => (
          <View style={{ flexDirection: 'column', gap: 12 }}>
            <DialogTitle>项目名称</DialogTitle>
            <TextField aria-label="项目名称" defaultValue="Piant" />
          </View>
        )}
      </DialogContent>
    </View>
  )}
</Dialog>;
```

在 [OverlayHost](/ui/overlays) 下创建弹窗。用 `DialogTitle` 或 `DialogContent.name` 提供名称，可加 `DialogDescription` 说明用途。内容过高时可以滚动，`actions` 区域仍保留操作按钮。

Tab / Shift+Tab 在当前弹窗内移动。默认可以按 Escape、点遮罩或激活 `DialogClose` 关闭，随后焦点回到可用触发器。可用 `dismissOnEscape` 和 `dismissOnOutsidePointer` 禁用对应方式，并保留可见关闭按钮。

用 `open` 和 `onOpenChange` 管理打开状态。关闭后内容会重建，把需要保留的草稿存到弹窗外。模态范围限于所属 Canvas，页面其余 DOM 和其他 Canvas 仍可操作。需要明确确认高影响操作时，用 [AlertDialog](/ui/alert-dialog)。
