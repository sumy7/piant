# AlertDialog

`AlertDialog` 在删除、覆盖等高影响操作前，请用户明确确认或取消。

<LiveExample example="uiAlertDialog" title="打开删除确认并尝试取消" :height="280" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@piant/ui';

<AlertDialog>
  {() => (
    <View>
      <AlertDialogTrigger variant="danger">删除项目</AlertDialogTrigger>
      <AlertDialogContent
        actions={() => (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AlertDialogCancel variant="secondary">取消</AlertDialogCancel>
            <AlertDialogConfirm variant="danger" onPress={deleteProject}>
              确认删除
            </AlertDialogConfirm>
          </View>
        )}
      >
        {() => (
          <View style={{ flexDirection: 'column', gap: 12 }}>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
          </View>
        )}
      </AlertDialogContent>
    </View>
  )}
</AlertDialog>;
```

在 [OverlayHost](/ui/overlays) 下使用。弹窗默认聚焦取消按钮，点遮罩会保留弹窗。Escape 默认仅关闭弹窗，输入框里的 Enter 不会触发确认。

把业务动作放在 `AlertDialogConfirm.onPress` 中。校验失败时可调用 `event.preventDefault()` 保留弹窗。异步操作也可先阻止关闭，再通过受控 `open` 在完成后关闭。弹窗作用于所属 Canvas，普通编辑任务使用 [Dialog](/ui/dialog)。
