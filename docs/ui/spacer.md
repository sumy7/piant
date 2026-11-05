# Spacer

在父容器的主轴上留出固定间距，或把两组内容推到两端。试着点击预览里的按钮，观察固定间距变化。

<LiveExample example="uiSpacer" title="Spacer：固定间距与自动占位" :height="240" hide-source />

## 用法

```tsx
import { Button, Spacer, Stack } from '@piant/ui';

<Stack direction="row" gap={0} style={{ width: '100%' }}>
  <Button variant="secondary">取消</Button>
  <Spacer />
  <Button>保存</Button>
</Stack>;
```

省略 `size` 时，Spacer 占据主轴的剩余空间。传入 `size={16}` 可设置 16 个逻辑像素的固定留白。给同组各项统一加间距时，直接使用 [Stack 的 gap](/ui/stack)。
