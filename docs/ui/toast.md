# Toast

在操作结束后显示简短反馈，例如草稿已保存、上传完成或可撤销的更改。通知会显示在应用指定的位置，用户可以继续原来的操作。

## 在线示例

<LiveExample example="uiToast" title="Toast：排队、更新、持久操作、定时反馈与重挂载" :height="1000" hide-source />

加入一批通知，再关闭其中一条，观察后面的通知依次补位。也可以试试更新上传通知和恢复草稿。

## 基本用法

在使用通知的 UIProvider 内安装 `ToastProvider`，并在需要显示通知的位置放置一个 `ToastViewport`。在 Provider 子树中通过 `useToast()` 调用 `show`。

```tsx
import {
  Button,
  Stack,
  ToastProvider,
  ToastViewport,
  UIProvider,
  useToast,
} from '@piant/ui';

function DraftEditor() {
  const toast = useToast();
  return (
    <Stack>
      <Button onPress={() => toast.show({ title: '草稿已保存' })}>保存</Button>
      <ToastViewport label="通知" dismissLabel="关闭" />
    </Stack>
  );
}

export function App() {
  return (
    <UIProvider>
      {() => <ToastProvider>{() => <DraftEditor />}</ToastProvider>}
    </UIProvider>
  );
}
```

## Provider 与控制器

`maxVisible` 默认 3，`maxToasts` 默认 20（含可见和等待中的通知）。队列满时，新增通知的 `show` 返回 `undefined`。用 `dismiss(id)` 关闭指定通知，或用 `dismissAll()` 清空队列。

## 通知数据与更新

`show` 接收必填 `title` 和可选 `description`，并返回通知 ID。用相同 ID 再调用 `show` 会替换整条内容并保留队列位置。只想更新个别字段时使用 `update(id, patch)`。

```tsx
toast.show({
  id: 'archive',
  title: '文档已归档',
  action: { label: '撤销', onAction: restoreDocument },
});
```

操作按钮只在用户激活时执行，执行后会关闭通知。需要保留通知时，在回调中调用 `event.preventDefault()`。

## 展示位置、交互与计时

通知默认持续显示，适合需要阅读或操作的反馈。对简短提示可设置毫秒数 `duration`。排队期间不计时，悬停或聚焦时暂停计时。使用 `ToastViewport` 的 `style` 安排显示位置和尺寸，通知区域受所在容器的裁剪约束。

普通反馈使用默认 `priority: 'polite'`，需要立即注意的反馈可用 `'assertive'`，仅视觉显示可用 `'off'`。
