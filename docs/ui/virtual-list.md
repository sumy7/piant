# VirtualList

`VirtualList` 将纵向集合限制在当前可视窗口附近。只为可见行和少量预渲染行创建 Canvas 节点与语义节点，滚动离开的行会销毁。放在 `UIProvider` 内，从 `@piant/ui` 根入口导入。

<LiveExample example="uiVirtualList" title="VirtualList：大集合、滚动定位与动态条目" :height="720" />

在线示例使用不同高度的行和原生输入框，把编辑值按行键保存在列表外；滚动离开再返回、调整宽度或更新条目时可验证状态与锚点变化。

```tsx
import { Text } from '@piant/core';
import { VirtualList, type VirtualListHandle } from '@piant/ui';

const layers = Array.from({ length: 10000 }, (_, id) => ({
  id,
  name: `图层 ${id + 1}`,
}));
let list: VirtualListHandle | undefined;

<VirtualList
  label="图层列表"
  items={layers}
  getKey={(layer) => String(layer.id)}
  getLabel={(layer) => layer.name}
  estimateHeight={32}
  measure={false}
  overscan={2}
  style={{ height: 320 }}
  apiRef={(api) => {
    list = api;
  }}
>
  {(layer) => <Text>{layer().name}</Text>}
</VirtualList>;

// 以逻辑索引定位；不要求目标行已经挂载。
list?.scrollToIndex(9000, 'start');
```

## 行身份、状态与尺寸

`getKey(item, index)` 必须返回唯一、非空且稳定的字符串。删除、插入或重新排序时，键负责保留仍在当前窗口中的行身份。`children` 接收条目和索引的 getter；自定义行读取 `item()`、`index()`，可以跟随同键条目更新。省略 `children` 时显示 `getLabel` 返回的文字。

滚动离开窗口会销毁行，返回窗口时重新创建。需要跨滚动保留的草稿、选中值、展开值等应按稳定键保存在行外。组件不会为完整集合预先执行行工厂，也不维护离屏的输入节点。

默认开启测量，`estimateHeight` 提供尚未测量行的初始高度与偏移；自定义行的实测高度可以小于估计值。默认文字行以估计值为最小高度。测量挂载行后更新偏移和总高度，并尽量保留当前锚点键及行内偏移。容器宽度、同键内容身份、估计高度或测量开关变化会使对应旧测量失效；删除锚点时使用邻近索引回退。估计不准确时，滚动条总长度和定位会在实际行挂载测量后修正。固定行高时使用 `measure={false}`；行按估计高度布局并裁剪溢出内容。

`style` 必须给出有限的可视高度或由父布局提供有限高度。默认高度为 `240`。`overscan` 表示窗口前后各额外挂载的行数，默认 `2`，非负有限数会向下取整。行估计必须为正有限数。

## 属性

| 属性             | 类型与默认值                                              | 行为                                 |
| ---------------- | --------------------------------------------------------- | ------------------------------------ |
| `label`          | 必填 `string`                                             | 列表的非空辅助名称                   |
| `items`          | 必填 `readonly T[]`                                       | 当前有序集合                         |
| `getKey`         | 必填 `(item: T, index: number) => string`                 | 唯一稳定行键                         |
| `getLabel`       | 必填 `(item: T, index: number) => string`                 | 行辅助名称；也是默认行文字           |
| `estimateHeight` | `number \| ((item, index) => number)`                     | 默认主题 `controlSize.md`            |
| `disabled`       | `boolean`，默认 `false`                                   | 禁用集合入口导航和滚轮转发；自定义行控件由调用方禁用 |
| `measure`        | `boolean`，默认 `true`                                    | 读取已挂载行的布局高度               |
| `overscan`       | `number`，默认 `2`                                        | 窗口两端预渲染行数                   |
| `children`       | `(item: Getter<T>, index: Getter<number>) => JSX.Element` | 自定义行工厂                         |
| `style`          | `StyleValue<ViewStyles>`                                  | 滚动视口样式，默认高度 `240`         |
| `ref`            | `(node: PScrollView) => void`                             | 底层公共滚动节点                     |
| `apiRef`         | `(handle: VirtualListHandle) => void`                     | 集合定位与范围句柄                   |
| `onRangeChange`  | `(range: VirtualRange) => void`                           | 当前窗口或偏移变化时通知             |

传入 getter props 可响应集合、估计高度、预渲染数量和布局变化。需要更新集合时传入新的有序数组，保持条目键稳定。

## 定位句柄

`VirtualListHandle` 提供：

- `scrollToIndex(index, align = 'start')`：以逻辑索引定位，索引向下取整并限制到有效范围。
- `scrollToKey(key, align = 'start')`：以稳定键定位，缺失键不执行操作。
- `scrollToOffset(offset)`：定位到正向像素偏移，限制在可滚动范围。
- `focus()`：聚焦列表语义入口，返回是否成功。
- `range()`：当前 `VirtualRange`，含 `start`、`end`、`total`、`offset`、`totalHeight`。`end` 为不包含的结束索引，范围包含预渲染行；`offset` 为正向滚动偏移。
- `getItemNode(key)` / `getItemElement(key)`：返回当前挂载行的 Canvas/语义节点；离屏或不存在时返回 `undefined`。
- `node` / `element`：滚动节点和列表语义入口。

`VirtualAlignment` 为 `'start' | 'center' | 'end' | 'nearest'`。`nearest` 保留已经完整可见的行，否则滚动到最近边缘。销毁后的句柄不会重新创建列表或继续滚动。

## 键盘、焦点与辅助技术

列表使用 `list`，已挂载行使用 `listitem`，每行提供完整集合中的 `aria-posinset` 和 `aria-setsize`。列表入口支持 Home / End 到首尾、PageUp / PageDown 按视口移动、上下方向键按主题控件高度移动。该组件不隐含选中、菜单或候选提交语义。

自定义行可以包含输入或按钮。原生输入上的滚轮会转交所属列表，按像素/行/页单位滚动；Ctrl+滚轮保留浏览器缩放行为。`disabled` 禁用集合导航与转发，自定义行输入/按钮的禁用状态仍由调用方设置。行仍在窗口内时不因滚动偏移变化而重建；即将回收聚焦行时，将焦点恢复到列表入口，避免焦点停在已销毁的输入上。离屏行不保留额外 Tab 停靠。语义 DOM 仅包含当前窗口，辅助技术无法一次性浏览所有离屏行；实际读屏器效果需按目标浏览器和读屏器组合验收。

## 性能验证与边界

仓库提供 `packages/ui/browser-tests/collectionsBenchmark.mjs`，以同一 640 × 320 视口、32 像素行、10,000 条 `View` + `Text` 内容，对照 `ScrollView` + `For` 与公开 `VirtualList`。先预热 10 帧，再采样 90 个 RAF 间隔，记录挂载、布局/渲染、滚动帧、节点数及行创建/销毁计数。[原始基线与对照 JSON](/benchmarks/collections.json) 包含完整逐帧样本、浏览器版本和方法说明；计时会受机器负载和浏览器调度影响，16.7ms p95 是实测目标，不是组件保证。

该组件仅提供纵向列表与本地集合窗口化；不包含远程分页、二维网格、横向虚拟化或离屏输入保活。数据索引和高度前缀仍与完整集合大小有关，避免把巨大集合数据更新与每一帧滚动绑定。

本仓库一次 Headless Chrome 156、10,000 行的实测如下（同一机器，未限速；数值仅用于复核该次运行）：

| 指标                      | ScrollView + For | VirtualList |
| ------------------------- | ---------------: | ----------: |
| 初次挂载                  |         1016.3ms |      21.8ms |
| 显式初次布局/渲染         |         1361.6ms |       9.3ms |
| 初次行数 / 节点数         |  10,000 / 20,004 |     12 / 41 |
| 滚动采样最大行数 / 节点数 |  10,000 / 20,004 |     14 / 47 |
| 同步滚动工作量 p95        |           16.6ms |       3.5ms |
| RAF 间隔 p95              |           33.4ms |      16.7ms |
| 完整销毁后存活行数        |                0 |           0 |

VirtualList 的窗口为 10 个可见行加两端预渲染，采样行数低于 16 行预算。键控替换时先创建新窗口再释放旧窗口，构造但尚未销毁的行计数瞬时峰值为 28；这与渲染后窗口中的 14 行分别记录。采样期间共创建 1398 行，最终全部销毁。

最终对照运行的 RAF p95 达到 16.7ms 目标；较早独立运行测得 16.8ms，浏览器调度和机器负载仍会影响结果，不承诺固定帧率。JSON 比较使用 1e-9ms 数值容差，仅处理浮点时间戳相减误差。

复现时先构建 UI 包，再从仓库根目录运行 `pnpm --dir docs exec vite --config ../packages/ui/browser-tests/vite.config.mjs`，然后在另一个终端运行：

```sh
COLLECTIONS_BENCHMARK_MODE=both \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
node packages/ui/browser-tests/collectionsBenchmark.mjs
```

需要符合仓库 engines 的 Node、Playwright 和已安装的 Chrome。`PLAYWRIGHT_MODULE` 可省略以使用当前环境的 `playwright` 包；不需要给仓库添加依赖。输出默认位于 `/tmp/piant-cod172/benchmark`，可用 `COLLECTIONS_EVIDENCE_DIR` 更改。`COLLECTIONS_ROWS` 可更改数据量，默认 10,000；计时不作为跨机器失败断言，行数和完整清理使用断言验证。
