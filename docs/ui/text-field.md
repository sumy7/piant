# TextField

`TextField` 编辑单行文字，适用于名称、邮箱、密码等字段，保留浏览器的文本选择、剪贴板和输入法行为。

<LiveExample example="uiTextField" title="输入、复制或切换只读" :height="660" hide-source />

## 用法

```tsx
import { TextField } from '@piant/ui';

<TextField
  aria-label="项目名称"
  value={projectName()}
  onValueChange={setProjectName}
  placeholder="输入项目名称"
/>;
```

独立使用时，通过 `aria-label` 或 `aria-labelledby` 提供名称。可见标签、说明和错误可以交给 [Field](/ui/field)。`placeholder` 用于提示输入格式。

| 属性                                 | 用途                                                          |
| ------------------------------------ | ------------------------------------------------------------- |
| `type`                               | `text`（默认）、`search`、`email`、`url`、`tel` 或 `password` |
| `value` / `onValueChange`            | 由应用持有并更新输入值                                        |
| `defaultValue`                       | 设置非受控初值，编辑后改变初值不会重置内容                    |
| `readOnly` / `disabled`              | 只读时仍可选择复制，禁用时跳过键盘焦点                        |
| `name` / `autoComplete` / `required` | 设置原生字段名称、自动填充和必填行为                          |

需要主动设置焦点时，通过 `ref` 取得字段并调用 `focus()`。需要提交操作时单独处理，输入法候选确认期间的 Enter / Escape 会避开业务键盘回调。数值使用 [NumberField](/ui/number-field)，带提交或清空动作的搜索使用 [SearchField](/ui/search-field)。

## Field

为输入增加可见标签、说明和校验错误，参见 [Field](/ui/field)。
