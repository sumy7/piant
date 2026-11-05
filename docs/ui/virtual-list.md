# VirtualList

浏览大量纵向条目时，只显示滚动视口附近的行。适合图层列表、长日志或结果列表。

<LiveExample example="uiVirtualList" title="VirtualList：大集合、滚动定位与动态条目" :height="720" hide-source />

编辑一行，跳到远处再滚回来。示例把输入按行键保存在列表之外，因此离屏后仍能恢复。

## 基本用法

```tsx
import { VirtualList } from '@piant/ui';

const layers = Array.from({ length: 10_000 }, (_, id) => ({
  id,
  name: `图层 ${id + 1}`,
}));

<VirtualList
  label="图层列表"
  items={layers}
  getKey={(layer) => String(layer.id)}
  getLabel={(layer) => layer.name}
  estimateHeight={32}
  measure={false}
  style={{ height: 320 }}
/>;
```

## 行身份、状态与尺寸

- `getKey` 为条目提供非空、唯一且稳定的键。插入、删除或重排后仍应使用同一个键标识同一条目。
- 默认按 `getLabel` 渲染文本。自定义行可传函数子节点，例如 `{(item) => <Text>{item().name}</Text>}`。需要跨滚动保留的草稿和选择，应按键保存在行外。
- 视口高度默认 240。用 `estimateHeight` 设置初始行高，默认跟随主题。默认测量实际高度；固定行高可用 `measure={false}`。
- `overscan` 默认 2，表示在视口两端分别多准备两行。

## 定位句柄

用 `apiRef` 获取句柄，调用 `scrollToKey(key)`、`scrollToIndex(index)` 或 `scrollToOffset(offset)` 定位。前两种方式可用 `'start'`、`'center'`、`'end'`、`'nearest'` 指定对齐。通过 `onRangeChange` 可以观察窗口范围与滚动偏移。

键盘支持方向键、Page Up / Page Down、Home / End。如果聚焦的自定义行滚出窗口，焦点会回到列表入口。需要层级展开或内置单选时，请使用 [Tree](./tree)。

## 性能验证与边界

VirtualList 适用于本地纵向集合。若要查看万行样例的挂载与滚动开销，可阅读 [原始基准与采样数据](/benchmarks/collections.json)。
