# SplitPane

将界面分成两个区域，让用户拖动分隔条分配空间。适合把列表与详情、工具与预览并排放置。

<LiveExample example="uiSplitPane" title="SplitPane：拖动、键盘调整与切换方向" :height="400" hide-source />

在两栏输入文字，再拖动分隔条或切换方向。调整布局会保留栏内输入。

## 基本用法

```tsx
import { SplitPane, TextField } from '@piant/ui';

<SplitPane
  name="列表与详情分栏"
  defaultSize={160}
  minSize={80}
  minSecondSize={100}
  style={{ width: '100%', height: 260 }}
  first={() => <TextField aria-label="搜索列表" />}
  second={() => <TextField aria-label="项目名称" />}
/>;
```

## 尺寸与容器变化

- `defaultSize` 是第一栏的初始逻辑像素尺寸，默认 160。要保存用户调整后的尺寸，使用 `size` 和 `onSizeChange`。
- `minSize` 和 `maxSize` 限制第一栏，`minSecondSize` 为第二栏留出空间。容器变窄时优先给第二栏留出空间，恢复后第一栏回到请求尺寸。
- 默认左右排列，`orientation="vertical"` 改为上下排列。需要滚动的内容可在各栏内使用 [ScrollView](/guide/components/scrollview)。

## 键盘调整

Tab 聚焦分隔条。左右分栏用左右键，上下分栏用上下键。每次移动量由 `step` 设置，默认 10。Home / End 跳到允许范围的两端。`disabled` 只禁用分隔条，栏内控件仍可使用。
