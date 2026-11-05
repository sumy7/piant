# Field

`Field` 为一个 [TextField](/ui/text-field) 添加标签、帮助说明和校验错误。点击可见标签会聚焦输入。

<LiveExample example="uiField" title="编辑字段并查看校验提示" :height="440" hide-source />

## 用法

```tsx
import { Field, TextField } from '@piant/ui';

<Field label="邮箱" description="用于接收通知" required error={emailError()}>
  {() => <TextField type="email" name="email" autoComplete="email" />}
</Field>;
```

在函数子节点中放置一个 `TextField`。标签由 `Field` 提供，错误消息会标记字段无效，清空消息即可清除错误状态。应用可在提交时执行自己的校验并更新 `error`。`required` 传给输入字段，可与长度或格式约束一起使用。
