# Tree

在可展开的层级中浏览和选择一项，适合文件夹、图层或项目资源。只渲染滚动视口附近的行，可用于较大的本地树。

<LiveExample example="uiTree" title="Tree：展开、键盘导航、单选与大量节点" :height="720" hide-source />

用右方向键展开分支，用上下方向键移动，按 Enter 选中节点。

## 基本用法

```tsx
import { Tree } from '@piant/ui';

<Tree
  label="项目素材"
  nodes={[
    {
      value: 'assets',
      label: '素材',
      children: [{ value: 'logo', label: 'Logo' }],
    },
  ]}
  defaultExpandedValues={['assets']}
  style={{ height: 280 }}
/>;
```

## 数据与属性

每个节点提供 `value` 和 `label`，可选 `children` 和 `disabled`。`value` 在整棵树中必须唯一且稳定。Tree 使用固定行高，默认跟随主题；用 `rowHeight` 设置其他高度。

## 选择、展开与动态数据

选中键和展开键分开保存。用 `defaultValue` 设置初始选中键，默认 `null`；用 `defaultExpandedValues` 设置初始展开分支。需要同步应用状态时，使用 `value` / `onValueChange` 和 `expandedValues` / `onExpandedValuesChange`。

单击行或按 Enter / Space 才选中节点，方向键只移动当前活动项。单击展开箭头只改变分支的展开状态。禁用节点仍可浏览，不能选择或通过用户操作展开。

## 键盘与语义

| 操作                | 结果                                 |
| ------------------- | ------------------------------------ |
| 上 / 下             | 移到前一行或后一行。                 |
| 右 / 左             | 展开或进入子节点；折叠或返回父节点。 |
| Home / End          | 跳到第一行或最后一行。               |
| Page Up / Page Down | 向前或向后移动约一屏。               |
| 输入文字            | 按标签前缀查找已展开的行。           |

如需从外部定位，使用 `apiRef` 获取句柄并调用 `scrollToKey(key)`，目标需要位于已展开的分支。Tree 支持同步本地数据和单选，平铺数据可使用 [VirtualList](./virtual-list)。
