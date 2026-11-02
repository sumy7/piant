# SplitPane

`SplitPane` 将工具面板分成两个可保留输入状态的区域，用一个可聚焦分隔条调整第一栏尺寸。放在 `UIProvider` 的延迟子树中，从 `@piant/ui` 根入口导入。

<LiveExample example="uiSplitPane" title="SplitPane：拖动、键盘调整与切换方向" :height="400" />

在两栏分别输入草稿，再拖动分隔条或切换排列方向；已有输入保持。Tab 聚焦分隔条，横向分栏用左右键、纵向分栏用上下键，Home / End 到达当前可用范围边缘。

```tsx
import { createState } from '@piant/core';
import { SplitPane, TextField } from '@piant/ui';

function Panels() {
  const [width, setWidth] = createState(160);
  return (
    <SplitPane
      name="列表与检查器分栏"
      size={width()}
      onSizeChange={setWidth}
      minSize={80}
      minSecondSize={100}
      style={{ width: '100%', height: 260 }}
      first={() => <TextField aria-label="搜索列表" />}
      second={() => <TextField aria-label="参数名称" />}
    />
  );
}
```

## 属性

| 属性                 | 类型与默认值                                 | 行为                                                          |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| `name`               | 必填非空 `string`                            | 分隔条的可访问名称                                            |
| `first`、`second`    | 必填 `() => unknown`                         | 延迟创建两栏内容，保留所属 owner/context                      |
| `orientation`        | `'horizontal' \| 'vertical'`，`'horizontal'` | 横向为左右分栏，纵向为上下分栏                                |
| `size`               | 可选 `number`                                | 受控第一栏逻辑像素尺寸，不包含分隔条                          |
| `defaultSize`        | `number`，`160`                              | 非受控初始尺寸，只读取一次                                    |
| `onSizeChange`       | `(size: number) => void`                     | 用户请求不同的合法尺寸时调用                                  |
| `minSize`、`maxSize` | `number`，`0` / 无上限                       | 第一栏尺寸范围，受容器可用空间限制                            |
| `minSecondSize`      | `number`，`0`                                | 为第二栏预留的最小尺寸                                        |
| `step`               | 正有限 `number`，`10`                        | 键盘每次调整的逻辑像素数                                      |
| `disabled`           | `boolean`，`false`                           | 禁止拖动及键盘调整，分隔条退出 Tab 顺序；栏内控件仍由应用控制 |
| `description`        | 可选 `string`                                | 分隔条的辅助说明                                              |
| `style`              | core `StyleValue<ViewStyles>`                | 外层布局；默认宽度 `100%`、高度 `240`                         |
| `ref`                | core `View` 的 `ref`                         | 外层节点                                                      |

尺寸和约束使用有限非负数；无效 `size` / `defaultSize` 回退到 `160`，无效最小尺寸回退到 `0`，无效 `maxSize` 视作无上限，非正或非有限 `step` 回退到 `10`。分隔条宽度取 `max(8, theme.spacing.sm)`；应用可在栏内组合 `Surface` 及内边距，外层应保留组件的排列方向、无间距和无内边距几何契约。

## 尺寸与容器变化

第一栏实际尺寸限制在当前容器主轴长度减去分隔条和 `minSecondSize` 后的空间内，再应用 `minSize` / `maxSize`。空间不足时先预留第二栏最小尺寸，再压缩第一栏；无法同时满足的第一栏最小尺寸会下降到可用上限。容器比第二栏最小尺寸还小时，第一栏为零，第二栏使用剩余空间。两栏内容裁剪在各自区域内；需滚动时由应用组合滚动容器。

组件保存请求尺寸与实际尺寸的区别。容器缩小时只收缩实际布局，放大后恢复请求尺寸；容器变化和 props 更新不触发 `onSizeChange`。受控交互只请求尺寸，由调用方决定接受、转换或拒绝，未提交前继续显示调用方的值。非受控交互在内部保存尺寸；后续修改 `defaultSize` 不覆盖当前值。转发 props 时保留 getter，避免解构或展开形成快照。

## 指针、键盘与生命周期

主鼠标、笔或触摸指针在分隔条按下后保持抓取偏移，拖动使用外层局部坐标，支持祖先 Pixi 缩放与旋转。指针移出分隔条或 Canvas 后释放会结束拖动。取消、丢失主按钮、窗口或分隔条失焦、页面隐藏、禁用、方向/约束/容器尺寸变化和销毁也会终止手势；取消保留最新尺寸，不回滚。

分隔条只有一个焦点代理，提供 `role="separator"`、名称、说明、当前像素值和范围。`aria-orientation` 描述分隔线方向：左右分栏为 `vertical`，上下分栏为 `horizontal`。Tab / Shift+Tab 进入或离开分隔条；聚焦后左右分栏使用 `ArrowLeft` / `ArrowRight` 减小 / 增大，上下分栏使用 `ArrowUp` / `ArrowDown` 减小 / 增大。Home 到最小值，End 到最大值；连续按键可重复调整。Enter / Space 没有按钮激活动作，修饰键组合和输入法合成期间不处理尺寸快捷键。

两栏不会因尺寸和主题变化被重新创建。分隔条颜色、焦点和禁用外观使用主题 tokens。临时全局指针监听仅在拖动期间安装，结束或销毁时清理，多实例分别管理自己的尺寸和手势。

## 限制与验证边界

组件提供两栏像素尺寸分配，不提供比例模式、折叠、嵌套布局协调或自动滚动。Canvas DOM 的 CSS 旋转/倾斜、跨 iframe 和浏览器窗口外的持续追踪不在当前坐标映射范围内。触摸目标厚度应结合目标设备验证，必要时通过主题间距扩大。

自动测试覆盖键盘、变换坐标、触摸事件、动态约束、尺寸变化和监听清理；真实浏览器交互及语义属性检查与平台读屏朗读是不同验收。VoiceOver 等辅助技术、真实触摸设备与平台输入法仍需按目标环境单独验证，参见[焦点与语义桥接](/ui/focus)。
