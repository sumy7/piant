# Button

使用 `Button` 执行保存、取消、重试等操作。使用 `variant` 区分主操作、次操作或危险操作。

<LiveExample example="uiButton" title="按钮操作、禁用与加载" :height="300" hide-source />

## 用法

```tsx
import { Button } from '@piant/ui';

<Button variant="primary" onPress={saveDraft}>
  保存草稿
</Button>;
```

将组件放在 [UIProvider](/ui/theme) 内。点击或聚焦后按 Enter / Space 都会触发 `onPress`。按钮文字会作为可访问名称，自定义内容用 `name` 补充名称。

| 属性       | 用途                                                |
| ---------- | --------------------------------------------------- |
| `variant`  | `primary`（默认）、`secondary`、`ghost` 或 `danger` |
| `size`     | `sm`、`md`（默认）或 `lg`                           |
| `disabled` | 禁用按钮并跳过键盘焦点                              |
| `loading`  | 显示加载反馈并阻止再次激活，由应用控制              |
| `icon`     | 在文字旁放置图标，回调可读取建议尺寸和颜色          |

异步保存时，在请求开始时设置 `loading`，并在请求结束后恢复。只有图标的按钮使用 [IconButton](/ui/icon-button)。
