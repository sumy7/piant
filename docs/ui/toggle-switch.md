# ToggleSwitch

`ToggleSwitch` 用于开启或关闭一个设置，例如声音提醒或自动保存。

<LiveExample example="uiToggleSwitch" title="开启或关闭设置" :height="590" hide-source />

## 用法

```tsx
import { ToggleSwitch } from '@piant/ui';

<ToggleSwitch
  label="自动保存"
  checked={autoSave()}
  onCheckedChange={setAutoSave}
/>;
```

点击开关或标签，或聚焦后按 Space，切换状态。需要组件自行管理状态时，使用 `defaultChecked`，默认关闭。使用 `description` 解释设置用途，使用 `disabled` 禁止切换。

开关两种状态使用同一个标签，例如“自动保存”。需要部分选中状态时使用 [Checkbox](/ui/checkbox)。
