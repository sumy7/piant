# Piant Devtools API 与调试边界

初次使用请先阅读 [Piant Devtools 简介](/devtools/introduction) 与 [快速开始](/devtools/quick-start)。`@piant/devtools` 是独立可选包，需要单独安装并显式接入；不会随业务 Store 初始化自动生效。

`@piant/devtools` 使用 `@tanstack/devtools-ui` 的 Solid.js 基础组件，提供单层 Piant 面板。一期采用页面内嵌的底部停靠面板，用于检查 Piant **元素树**、选中高亮、基础样式和布局、只读业务状态、显式注册的 Store 历史预览与恢复、布局更新时间线与动画状态。它检查 `PRoot` 下的 `PNode`，没有追踪函数组件调用关系；`Show`、`For` 或业务组件不会因此成为可检查的组件实例。

## 运行示例

```bash
pnpm install
pnpm --filter @piant/examples-devtools-demo dev
```

示例位于 `examples/devtools-demo`。点击计数按钮观察状态快照，切换卡片观察元素树变化，点击「Start animation」观察显式注册的动画。面板选中元素后，画布上显示高亮；普通选中高亮不会阻止点击业务按钮；开启元素选择器后，画布点击用于确认检查目标。通过右下角「Open Piant Devtools」入口打开面板，通过面板工具栏收起。收起时保留当前功能页、筛选与展开状态，暂停 Piant 自动采样并清除选择与高亮；重新打开会刷新元素树并恢复采样。点击工具栏「Disconnect」会卸载整个调试会话；点击「Unmount application」则按顺序卸载会话和业务应用。

生产示例构建使用 `pnpm --filter @piant/examples-devtools-demo build`，生产预览没有调试面板。

## 面板导航

界面借鉴 [Vue Devtools](https://devtools.vuejs.org/getting-started/features#components) 的树与详情分栏方式，保留 Piant 元素树与显式状态源的边界：

- **Elements**：按节点名称或 ID 搜索，折叠子树；选择后通过面包屑查看层级，在右侧检查 Layout、Style 与 Transform 分组。
- **State**：用带类型颜色的键值行读取 `getState` 快照；预览显式注册的 Store 历史，只有点击 Restore 才恢复可恢复记录，Clear 以当前状态重建历史。
- **Performance**：分别展示 CPU 布局耗时、布局更新次数和 Ticker 帧间隔，并查看有界布局事件列表。
- **Animations**：查看应用显式登记的动画状态、当前时间及观测统计；数值最多显示两位小数，没有额外播放控制。

四个功能页直接显示在同一工具栏，没有外层工作台或插件导航。搜索、树滚动和属性展开状态在自动采样时保持，避免查看过程中跳回初始位置。工具栏提供深色/浅色主题切换、刷新、收起与断开连接。

拖动面板顶边可以调整高度；聚焦该分隔条后，按 ↑ 增高、↓ 降低、Home 设为最小高度、End 设为最大高度。窗口尺寸变化时，高度会重新限制在可用范围内。面板仅在私有 `localStorage` 键 `piant-devtools-panel:v1` 下保存高度与主题；存储不可用或数据无效时使用默认值，不影响接入。展开状态不持久化，每次接入都遵循 `defaultOpen`。

## 开发环境接入

调试包的 Core peer 范围为 `^0.1.1 || ^0.2.0`。安装可使用 `pnpm add -D @piant/devtools`，也可创建项目时使用 `pnpm create piant my-app --template basic --devtools`（`router` 同样支持）。

推荐通过 `mount` 获取应用实例，将实例的 `root`、`app` 传给 `attachDevtools`。在根组件 owner 内同步注册 `onCleanup`，以便 `instance.destroy()` 同时清理调试会话；异步动态导入完成后检查 `instance.isDestroyed`，避免在已销毁实例上接入。完整示例见 [DevTools 快速开始](/devtools/quick-start#_2-在开发环境显式接入)。

将动态导入放在构建工具可静态替换的开发条件内部：Rsbuild 使用 `process.env.NODE_ENV === 'development'`，Vite 使用 `import.meta.env.DEV`。两者都需要构建工具将条件静态替换并消除不可达分支。`import type` 不产生运行时导入。发布前检查实际生产产物，确保没有 DevTools 动态 chunk；仅向 `enabled` 传入 `false` 不能代替生产依赖剔除。

脚手架使用 `defaultOpen: false`，先显示打开入口；该选择不改变 API 的 `defaultOpen` 默认值。入口将会话与根 owner 绑定，并通过 `mount` 的 `AbortSignal` 管理热更新时的挂载与清理。模板不自动注册业务状态、Store 历史或动画。

需要使用底层 `render` / `PRoot` 的宿主，应在渲染完成后接入，并在停止业务渲染、销毁根节点和 PixiJS Application 前调用 `tools?.detach()`。尺寸同步与底层资源所有权由宿主管理，见 [渲染 API](/reference/renderer)。

`attachDevtools` 只有在 `enabled === true` 时创建会话。未启用时返回 `null`，不会创建面板、订阅或启动采样。生产应用自身仍按正常路径初始化与渲染。

## API

```ts
const tools = attachDevtools({
  enabled: true,
  defaultOpen: true,
  root,
  app,
  getState: () => ({ count: count() }),
  sampleInterval: 100,
  maxEntries: 120,
  maxNodes: 2000,
  // mount: document.querySelector('#devtools-host')!,
});
```

| 选项             | 说明                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `enabled`        | 必须显式为 `true`；否则返回 `null`。                                                                                |
| `defaultOpen`    | 本次接入时是否默认展开，默认 `true`；不受保存设置影响。                                                             |
| `root`           | 要检查的 `PRoot`。                                                                                                  |
| `app`            | 对应的 PixiJS `Application`，用于画布坐标和 Ticker 统计。                                                           |
| `getState`       | 可选的只读快照提供函数；显式返回需要暴露的业务状态。不会自动捕获所有响应式状态。                                    |
| `stores`         | 可选的显式历史记录器列表（最多 20 个）；见 [Store 历史与恢复](/devtools/store-history)。                            |
| `animations`     | 可选的函数，返回 `{ id, node, animation }[]`，只观测应用明确登记的动画句柄。                                        |
| `sampleInterval` | 面板与快照采样间隔，默认 100ms，限制为 16–60000ms。                                                                 |
| `maxEntries`     | 布局时间线与每个 Store 历史展示的记录上限，默认 120，最大 1000。旧记录被移出。                                      |
| `maxNodes`       | 元素树遍历上限，默认 2000，最大 10000。超限时快照标记截断。                                                         |
| `mount`          | 可选的实际 DOM 宿主，默认 `document.body`。面板使用 fixed 定位；应选择没有 transform 祖先的容器，避免改变定位参照。 |

会话方法：

| 方法         | 行为                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `select(id)` | 按当前快照中的节点 ID 选中元素；传入 `null` 清除选择。节点卸载后选择会失效。 |
| `refresh()`  | 显式刷新观测数据；调试代码需要立即读取最新状态时调用。                       |
| `snapshot()` | 返回冻结、JSON 兼容的观测快照，不返回可修改的业务对象。                      |
| `detach()`   | 幂等卸载会话，清理面板、高亮、订阅与 Ticker 回调。                           |

`snapshot()` 的主要字段：

| 字段                       | 内容                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `elements` / `truncated`   | 有界元素列表（`id`、`parentId`、`depth`、`name`）及截断标记。                                      |
| `selectedId` / `selection` | 选中 ID 与复制的样式、布局、PixiJS 变换信息；未选中时为 `null`。                                   |
| `state` / `animations`     | 复制的业务状态和显式动画观测信息。                                                                 |
| `stores`                   | 手动注册的 Store 历史的只读检查副本；含记录、当前 ID、disposed 状态与来源名称。                    |
| `stats`                    | `frames`、`frameInterval`、`maxFrameInterval`、`layoutUpdates`、`layoutDuration`。时间单位为毫秒。 |
| `timeline`                 | 有界的 `{ time, duration }` 布局记录；`time` 来自 `performance.now()`，不是日期时间。              |

同一 document 只保留一个 Piant 调试会话；再次接入会先卸载旧会话。面板 DOM 同步创建，`snapshot()` 可以同步读取初始数据，`select()` 也可以立即调用。自动采样在微任务中激活；立即 `detach()` 会取消尚未激活的采样。

收起面板会移除 Piant Ticker，暂停业务状态、动画和布局时间线的自动采样，并清除选中与高亮；根节点销毁监听仍保留。应用拥有的历史记录器继续记录，只有面板对历史来源的订阅暂停。此时 `refresh()` 仍可显式刷新，`snapshot()` 返回最近一次快照。重新展开后刷新树并恢复采样，保留功能页、筛选与树折叠状态。在四个功能页之间切换不会暂停采样。

「Disconnect」、`detach()`、根节点销毁或应用 stage 销毁都会结束会话，清理 Piant 订阅、Ticker、高亮、Solid 根、面板 DOM 和交互监听。已保存的面板高度与主题保留。`detach()` 不销毁外部历史记录器；应用还需显式调用其 `dispose()`。业务应用销毁时仍推荐先显式 `detach()`，再停止业务动画、调用渲染 disposer、销毁根节点和 PixiJS 应用。异步动态导入期间若应用已经销毁，调用方应跳过 `attachDevtools`；示例演示了这一处理。

## 树、样式与高亮

面板展示底层元素及其父子关系、节点当前样式与布局信息。布局通知触发后，工具按采样间隔合并遍历；每帧仅累积帧统计并更新选中节点高亮，不持续高频扫描整棵树。节点 ID 仅用于当前会话，不应作为业务持久标识。

高亮位于独立 SVG overlay，遵循 PixiJS 父级变换，不修改 Yoga 业务布局，且使用 `pointer-events: none` 保留输入。支持画布的轴对齐 CSS 缩放和页面滚动；画布自身或其 DOM 祖先的 CSS 旋转、倾斜不在支持范围内。高亮是用于定位的包围区域，不表示遮罩裁剪后所有可见像素的精确轮廓。

### 从画布选择元素

点击工具栏品牌旁的「Select element from canvas」开启选择器，画布光标变为十字。移动到元素上预览高亮，点击确认后自动退出选择模式。按 Escape 或再次点击选择器按钮可取消，保留原先选中；收起面板或结束会话也会取消并清理选择器。

确认后面板切到 Elements，清除筛选并展开目标的祖先，将目标滚动到可见位置，同时更新右侧样式与布局。其他分支的折叠状态保留；自动采样不会反复滚动树。

选择器按布局盒检查当前观测树中的 PNode，优先选择显示在上方的最深匹配节点，包括没有业务事件的文字或装饰元素，不修改业务节点的 `eventMode`。选择期间会拦截画布主按键的 pointer、mouse 与 click 事件，避免确认目标时同时触发业务动作；退出后恢复普通交互。

命中计算支持画布的轴对齐 CSS 缩放、PixiJS 节点变换、普通显示层级与 `zIndex`，以及 Graphics 几何遮罩（含 Piant `overflow: hidden` 裁剪）。复杂透明度或反向遮罩、RenderLayer 跨树绘制、CSS 旋转与倾斜不保证逐像素精确命中。

## 状态快照边界

`getState` 是应用与检查器的显式边界。它应读取状态并返回小型普通对象，不应写状态或触发业务操作。工具复制返回值后递归冻结副本，不冻结或更改业务源对象。没有提供 `getState` 时，不会自动发现 Store 或其他全局状态。

快照保留 JSON 可表示的基本值、数组与对象；不保留原型和对象身份，不支持编辑或恢复这类快照。访问器属性与函数不会被执行，改用 `[Accessor]` 或 `[function]` 标记。循环引用、非 JSON 值及超出深度或数量限制的数据也使用标记表示。快照最多复制 6 层、约 1000 个值，每个对象最多 100 个可枚举属性，字符串最多保留 10000 个字符；非普通对象（例如 Date、Map 和类实例）不展开。该机制避免将无限对象图直接交给面板，但不意味着任意业务回调都无成本；调用方仍应让 `getState` 和 `animations` 保持轻量。

Store 历史与恢复使用独立的显式记录器和 `stores` 注册列表，不改变 `getState` 的只读边界，详见 [Store 历史与恢复](/devtools/store-history)。脚手架模板接入仍由 COD-140 跟踪。

## 时间线、统计与动画

布局时间线记录根节点布局更新的 CPU 耗时和更新时间；帧统计来自 PixiJS Ticker 的帧间隔与观测帧数。它们可辅助判断布局更新频率、帧节奏和长间隔，**不是 GPU 渲染耗时、浏览器最终呈现时间或完整性能追踪器**。时间线有保存上限，统计量为会话内累计值，收起面板时停止自动采样，重新展开后继续累计。

动画通过现有 `@piant/animation` 句柄读取 `playState`、`currentTime`，并在每帧读取上一次采样缓存的有界动画列表。`playState` 为 `running` 时，`observedFrames` 加一，`observedElapsed` 累加该帧 Ticker 的墙钟间隔；面板按采样间隔显示这些累计值与最新 `currentTime`。注册后首次采样前的帧不会计入，观测值不等同于动画引擎的实际执行耗时。工具不替换播放控制、不自动捕获所有动画，也不添加暂停、回放或时间旅行。

```ts
import type { PNode } from '@piant/core';
import { animate, type PNodeAnimation } from '@piant/animation';

let currentAnimation: PNodeAnimation | undefined;

function start(node: PNode) {
  currentAnimation?.cancel();
  currentAnimation = animate(node, [{ x: 0 }, { x: 120 }], { duration: 600 });
}

// 将 animations 作为 attachDevtools 的选项传入，cardNode 是业务节点。
const animations = () =>
  currentAnimation
    ? [{ id: 'moving-card', node: cardNode, animation: currentAnimation }]
    : [];
```

应用应维护有界的注册列表，替换动画时释放旧句柄，卸载业务元素时移除登记并按应用生命周期取消动画。示例只保留一个当前动画。一期支持范围为页面内嵌的 Piant 底部面板。本包不挂载 TanStack 工作台，也不创建插件导航、事件总线、独立窗口或远程传输连接。

TanStack 的分层关系见官方[概览](https://tanstack.com/devtools/latest/docs/overview)，共享 UI 组件见 [`@tanstack/devtools-ui` 源码](https://github.com/TanStack/devtools/tree/main/packages/devtools-ui)。本包使用 UI 基础组件并自行管理停靠与生命周期；其默认入口包含运行时实现，生产环境仍须按前文示例使用开发条件动态导入。
