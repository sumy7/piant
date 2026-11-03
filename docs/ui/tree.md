# Tree

`Tree` 用于文件、图层和分类等单选层级列表。它把展开的节点扁平化后交给与 [VirtualList](/ui/virtual-list) 共用的虚拟滚动层，只创建视口附近的 Canvas 行和语义节点。选中值、展开键集合和键盘活动节点各自独立。

<LiveExample example="uiTree" title="Tree：展开、键盘导航、单选与大量节点" :height="720" />

先用右方向键展开，再用上下键移动活动节点；Enter 或 Space 确认选择。滚动远离当前活动行后，下一次方向键会把目标带回视口。示例可以切换主题、字体和挂载状态，检查选中键与展开状态的变化。

```tsx
import { createState } from '@piant/core';
import { Tree, type TreeNode, UIProvider } from '@piant/ui';

const files: readonly TreeNode[] = [
  {
    value: 'assets',
    label: '素材',
    children: [
      { value: 'logo', label: 'Logo' },
      { value: 'cover', label: '封面' },
    ],
  },
  { value: 'archive', label: '归档', disabled: true },
];

function Content() {
  const [selected, setSelected] = createState<string | null>(null);
  const [expanded, setExpanded] = createState<readonly string[]>(['assets']);
  return (
    <Tree
      label="项目素材"
      nodes={files}
      value={selected()}
      onValueChange={setSelected}
      expandedValues={expanded()}
      onExpandedValuesChange={setExpanded}
      style={{ width: '100%', height: 320 }}
    />
  );
}
export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

## 数据与属性

从 `@piant/ui` 根入口导入 `Tree`、`TreeProps`、`TreeNode` 和 `TreeHandle`，在 `UIProvider` 的延迟子树中创建。

```ts
interface TreeNode {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly children?: readonly TreeNode[];
}
```

`value` 是整棵树中唯一且非空的稳定字符串键，包含折叠分支下的后代；`label` 必须是非空字符串。重复、空键和空标签会抛出错误。没有 `children` 或子数组为空的节点都是叶子。扁平化按原始兄弟节点顺序进行，不自行排序，也不克隆或修改调用方节点。

| 属性                     | 类型与默认值                           | 行为                                      |
| ------------------------ | -------------------------------------- | ----------------------------------------- |
| `label`                  | 必填非空 `string`                      | 整棵树的可访问名称                        |
| `nodes`                  | 必填 `readonly TreeNode[]`             | 根节点及嵌套后代                          |
| `value`                  | 可选 `string \| null`                  | 受控选中键；`null` 表示没有选择           |
| `defaultValue`           | `string \| null`，`null`               | 非受控初始选中键，只读一次                |
| `onValueChange`          | `(value: string \| null) => void`      | 用户确认不同的可用节点时请求新选择        |
| `expandedValues`         | 可选 `readonly string[]`               | 受控展开键集合                            |
| `defaultExpandedValues`  | `readonly string[]`，`[]`              | 非受控初始展开键，只读一次                |
| `onExpandedValuesChange` | `(values: string[]) => void`           | 用户请求展开或折叠后给出完整键集合        |
| `disabled`               | `boolean`，`false`                     | 整棵树禁止用户操作并退出 Tab 顺序         |
| `rowHeight`              | 正有限 `number`，主题 `controlSize.md` | 固定行高，单位为逻辑像素                  |
| `overscan`               | 有限非负 `number`，`2`                 | 视口前后额外创建的行数，小数向下取整      |
| `style`                  | core `StyleValue<ViewStyles>`          | 滚动视口布局；默认宽度 `100%`、高度 `240` |
| `ref`                    | `(node: PScrollView) => void`          | 取得滚动节点                              |
| `apiRef`                 | `(handle: TreeHandle) => void`         | 取得程序化滚动、焦点和当前窗口接口        |

`rowHeight` 非正或非有限时抛出错误。行内标签采用主题字体、颜色和缩进；固定高度不会自动适应自定义文本换行。省略 `rowHeight` 时字体和密度变化会更新主题默认高度；手动指定时应同时验证大字号和窄视口的裁剪。建议使用明确的视口高度，避免把整棵树内容高度当作视口高度而取消虚拟化效果。

## 选择、展开与动态数据

受控模式的回调只提出变更请求；调用方可以接受、转换或拒绝。在提交新的 props 之前，选中和展开状态仍以调用方的值为准。非受控模式在内部保存状态，后续修改默认值不会覆盖用户操作。挂载、props 更新及数据变化不合成选择或展开回调。响应式转发 props 时保留 getter，避免解构或展开为快照。

选择不会跟随键盘活动节点移动。聚焦树时，初始活动键取可见的选中键，否则取第一个可见节点；上下导航、类型前缀查找及程序化滚动不确认选择。单击行主体、Enter 或 Space 才选择节点；单击三角展开区只改变展开状态，没有额外的 Tab 焦点停靠。选中行采用主题主色背景及 `onPrimary` 前景，活动行另有焦点边框。

禁用节点仍可见、可被方向键访问并提供 `aria-disabled`，但不能选择或通过用户操作展开/折叠。调用方可让禁用分支保持展开；其可用后代仍能访问。整棵树禁用时禁止行操作和导航，不会清除已有选择或展开集合。

数据更新及重排以 `value` 识别节点。折叠活动节点的祖先时，活动节点移到最近可见祖先；活动节点被删除时先尝试原祖先，再取原扁平位置附近的可见节点。空树没有活动后代。现有选中键及展开键不会因为节点暂时不在数据中而被清除；相同键重新出现后继续应用原状态。调用方应在业务需要彻底清理时显式更新受控状态或重新挂载。

## 键盘与语义

行为参考 [WAI-ARIA Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)。树本身只有一个 Tab 焦点目标，Canvas 行不生成独立按钮焦点；保留普通 Tab / Shift+Tab 离开行为。

| 按键                    | 行为                                         |
| ----------------------- | -------------------------------------------- |
| `ArrowDown` / `ArrowUp` | 下一个 / 上一个可见节点                      |
| `ArrowRight`            | 展开活动分支；已展开时进入第一个直接子节点   |
| `ArrowLeft`             | 折叠活动分支；叶子或已折叠分支移到父节点     |
| `Home` / `End`          | 第一个 / 最后一个可见节点                    |
| `PageDown` / `PageUp`   | 按视口高度与行高移动约一屏可见节点           |
| `Enter` / `Space`       | 选择当前可用节点                             |
| 可打印字符              | 在可见节点中按标签前缀循环查找，移动活动节点 |

前缀查找按 NFKC 归一化并忽略大小写；连续字符在 `700ms` 内组成一个前缀，重复同一字符循环匹配该字符开头的节点。按输入时刻判断间隔，不启动定时器。修饰键组合和输入法合成期间不接管导航；Shift 与可打印字符可用于输入大写前缀，不启用范围选择。

根节点提供 `role="tree"` 与名称，已挂载行提供 `role="treeitem"`、名称、`aria-level`、`aria-posinset`、`aria-setsize`、选择状态及必要的展开/禁用状态。兄弟位置和总数反映完整数据层级，包含当前窗口外的兄弟；语义 DOM 只为当前窗口和 overscan 行创建。根的 `aria-activedescendant` 只引用实际挂载的行 ID。

## 程序化滚动与生命周期

`TreeHandle` 与 VirtualList 的句柄相同，包含：

| 成员                                      | 行为                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| `node`、`element`                         | 滚动节点和根语义元素                                        |
| `range()`                                 | 当前半开窗口 `[start, end)`、可见扁平总数、滚动偏移和总高度 |
| `scrollToIndex(index, align?)`            | 跳到当前可见扁平索引                                        |
| `scrollToKey(key, align?)`                | 跳到当前已展开序列中的键；折叠分支后代或不存在的键不操作    |
| `scrollToOffset(offset)`                  | 设置逻辑像素垂直偏移                                        |
| `focus()`                                 | 聚焦树视口，返回是否成功                                    |
| `getItemElement(key)`、`getItemNode(key)` | 取得当前已挂载行；窗口外返回 `undefined`                    |

对齐支持 `start`（默认）、`center`、`end`、`nearest`。范围和索引描述展开后的序列，变化时无需创建全部行。程序化滚动不改选择、展开或活动键，也不自动展开目标的祖先。活动行滚出窗口后暂时移除 `aria-activedescendant`，视口仍保持焦点；下一次导航计算逻辑目标并将其带回窗口，避免引用已卸载节点。

折叠、数据变化及滚动移出窗口会销毁不再使用的行与行内监听。父 owner 清理或根节点销毁后释放虚拟滚动、语义、指针与布局资源；多个实例独立管理活动键、选择、展开和视口。Tree 不持有长期计时器。

## 范围与验证边界

Tree 当前提供同步本地数据、固定行高和单选，不提供多选、懒加载、远程异步节点、拖动排序、表格列或树形大纲编辑器。模型使用迭代遍历支持深层级；数据校验和展开序列计算仍与节点数相关，虚拟化减少的是同时创建的行和语义节点。

行为测试覆盖层级语义、键盘选择与展开、禁用节点、受控拒绝、动态数据、万行窗口、焦点保持、多实例和清理。自动浏览器交互及 DOM 属性检查不能代替 VoiceOver 等平台读屏、真实触屏和平台输入法验收，详见[焦点与语义桥接](/ui/focus)。
