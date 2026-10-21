# DevTools 调试工具

`@piant/devtools` 基于 `@tanstack/devtools` 的 `TanStackDevtoolsCore`，将 Piant 检查器注册为插件。一期采用页面内嵌的底部停靠面板，用于检查 Piant **元素树**、选中高亮、基础样式和布局、只读业务状态、布局更新时间线与动画状态。它检查 `PRoot` 下的 `PNode`，没有追踪函数组件调用关系；`Show`、`For` 或业务组件不会因此成为可检查的组件实例。

## 运行示例

```bash
pnpm install
pnpm --filter @piant/examples-devtools-demo dev
```

示例位于 `examples/devtools-demo`。点击计数按钮观察状态快照，切换卡片观察元素树变化，点击「Start animation」观察显式注册的动画。面板选中元素后，画布上显示高亮；高亮不会阻止点击业务按钮。通过右下角 TanStack Devtools 入口打开或收起底部面板。收起时暂停 Piant 自动采样并清除选择与高亮；重新打开会刷新元素树并恢复采样。点击 Piant 插件内的「Disconnect」才会卸载整个调试会话；点击「Unmount application」则按顺序卸载会话和业务应用。

生产示例构建使用 `pnpm --filter @piant/examples-devtools-demo build`，生产预览没有调试面板。

## 面板导航

界面借鉴 [Vue Devtools](https://devtools.vuejs.org/getting-started/features#components) 的树与详情分栏方式，保留 Piant 元素树和只读观测的边界：

- **Elements**：按节点名称或 ID 搜索，折叠子树；选择后通过面包屑查看层级，在右侧检查 Layout、Style 与 Transform 分组。
- **State**：用带类型颜色的键值行读取业务快照，展开嵌套对象；状态仍然只读。
- **Performance**：分别展示 CPU 布局耗时、布局更新次数和 Ticker 帧间隔，并查看有界布局事件列表。
- **Animations**：查看应用显式登记的动画状态、当前时间及观测统计；数值最多显示两位小数，没有额外播放控制。

搜索、树滚动和属性展开状态在自动采样时保持，避免查看过程中跳回初始位置。面板跟随 TanStack 的深色/浅色主题。

## 开发环境接入

发布包需要 `@piant/core ^0.1.1`（包含 `PRoot.observe` 与 `isDestroyed`）；本仓库通过 workspace 使用同一份核心实现。安装调试包可使用 `pnpm add -D @piant/devtools`。

在应用已经初始化、`PRoot` 已创建并完成 `render` 后接入。将动态导入放在构建工具可静态替换的开发条件内部；仅向 `enabled` 传入 `false` 不能代替生产依赖剔除。

```ts
import { PRoot, render } from '@piant/core';
import type { DevtoolsSession } from '@piant/devtools';

// app 是已初始化的 PixiJS Application。
const root = new PRoot(app.stage, {
  width: app.screen.width,
  height: app.screen.height,
});
const dispose = render(App, root);
let tools: DevtoolsSession | null = null;

if (process.env.NODE_ENV === 'development') {
  const { attachDevtools } = await import('@piant/devtools');
  tools = attachDevtools({
    enabled: true,
    defaultOpen: true,
    root,
    app,
    getState: () => ({ count: count() }),
  });
}

function destroy() {
  tools?.detach();
  dispose();
  root.destroy();
  app.destroy(true);
}
```

上例的 `App`、`app` 和 `count` 来自业务应用。Vite 应使用 `import.meta.env.DEV`；Rsbuild 示例使用 `process.env.NODE_ENV === 'development'`。两者都需要构建工具将条件静态替换并消除不可达分支。`import type` 不产生运行时导入。发布前检查实际生产产物，确保没有 DevTools 动态 chunk；如果先在顶层导入再判断开发环境，不能据此声称完全剔除。

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

| 选项             | 说明                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `enabled`        | 必须显式为 `true`；否则返回 `null`。                                                                            |
| `defaultOpen`    | 首次挂载时是否默认展开，默认 `true`。TanStack 已保存的用户设置优先。                                            |
| `root`           | 要检查的 `PRoot`。                                                                                              |
| `app`            | 对应的 PixiJS `Application`，用于画布坐标和 Ticker 统计。                                                       |
| `getState`       | 可选的只读快照提供函数；显式返回需要暴露的业务状态。不会自动捕获所有响应式状态。                                |
| `animations`     | 可选的函数，返回 `{ id, node, animation }[]`，只观测应用明确登记的动画句柄。                                    |
| `sampleInterval` | 面板与快照采样间隔，默认 100ms，限制为 16–60000ms。                                                             |
| `maxEntries`     | 时间线保存上限，默认 120，最大 1000。旧记录被移出。                                                             |
| `maxNodes`       | 元素树遍历上限，默认 2000，最大 10000。超限时快照标记截断。                                                     |
| `mount`          | 可选的 TanStack 挂载生命周期宿主，默认 `document.body`；面板通过 Portal 显示到 body，不是在宿主内参与局部布局。 |

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
| `stats`                    | `frames`、`frameInterval`、`maxFrameInterval`、`layoutUpdates`、`layoutDuration`。时间单位为毫秒。 |
| `timeline`                 | 有界的 `{ time, duration }` 布局记录；`time` 来自 `performance.now()`，不是日期时间。              |

同一 document 只保留一个 Piant 调试会话；再次接入会先卸载旧会话。TanStack 挂载为异步过程，插件准备好前不会启动 Piant Ticker；`snapshot()` 可以同步读取初始数据。

收起面板会移除 Piant Ticker，暂停业务状态、动画和布局时间线的自动采样，并清除选中与高亮；根节点销毁监听仍保留。此时 `refresh()` 仍可显式刷新，`snapshot()` 返回最近一次快照。重新展开后刷新树并恢复采样。采样开关跟随 TanStack 的 `devtoolsOpen`：切换到 Settings 或其他插件不等于收起面板，Piant 仍继续采样。

「Disconnect」、`detach()`、根节点销毁或应用 stage 销毁都会结束会话，清理 Piant 订阅、Ticker、高亮以及 TanStack 外壳和本地事件总线。工具不会删除 TanStack 持久化的用户设置。业务应用销毁时仍推荐先显式 `detach()`，再停止业务动画、调用渲染 disposer、销毁根节点和 PixiJS 应用。异步动态导入期间若应用已经销毁，调用方应跳过 `attachDevtools`；示例演示了这一处理。

## 树、样式与高亮

面板展示底层元素及其父子关系、节点当前样式与布局信息。布局通知触发后，工具按采样间隔合并遍历；每帧仅累积帧统计并更新选中节点高亮，不持续高频扫描整棵树。节点 ID 仅用于当前会话，不应作为业务持久标识。

高亮位于独立 SVG overlay，遵循 PixiJS 父级变换，不修改 Yoga 业务布局，且使用 `pointer-events: none` 保留输入。支持画布的轴对齐 CSS 缩放和页面滚动；画布自身或其 DOM 祖先的 CSS 旋转、倾斜不在支持范围内。高亮是用于定位的包围区域，不表示遮罩裁剪后所有可见像素的精确轮廓。

## 状态快照边界

`getState` 是应用与检查器的显式边界。它应读取状态并返回小型普通对象，不应写状态或触发业务操作。工具复制返回值后递归冻结副本，不冻结或更改业务源对象。没有提供 `getState` 时，不会自动发现 Store 或其他全局状态。

快照保留 JSON 可表示的基本值、数组与对象；不保留原型和对象身份，不支持编辑、恢复状态或 Store 时间旅行。访问器属性与函数不会被执行，改用 `[Accessor]` 或 `[function]` 标记。循环引用、非 JSON 值及超出深度或数量限制的数据也使用标记表示。快照最多复制 6 层、约 1000 个值，每个对象最多 100 个可枚举属性，字符串最多保留 10000 个字符；非普通对象（例如 Date、Map 和类实例）不展开。该机制避免将无限对象图直接交给面板，但不意味着任意业务回调都无成本；调用方仍应让 `getState` 和 `animations` 保持轻量。

Store 时间旅行由独立问题 COD-134 跟踪，脚手架模板接入由 COD-140 跟踪。

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

应用应维护有界的注册列表，替换动画时释放旧句柄，卸载业务元素时移除登记并按应用生命周期取消动画。示例只保留一个当前动画。一期支持和验收范围为页面内嵌的 TanStack 停靠面板。本包没有提供独立窗口 API、浏览器扩展或远程传输协议，也没有接入 TanStack 服务端事件总线、Vite 插件或 WebSocket；使用 `connectToServerBus: false`，保留上游本地事件总线。当前 TanStack Devtools 0.15 自带分离窗口按钮且未提供禁用配置；该上游入口不代表 Piant 已完成独立窗口模式验收。

TanStack 的底座与插件生命周期可参考官方[安装指南](https://tanstack.com/devtools/latest/docs/installation)、[插件生命周期](https://tanstack.com/devtools/latest/docs/plugin-lifecycle)与[配置](https://tanstack.com/devtools/latest/docs/configuration)。其[生产环境指南](https://tanstack.com/devtools/latest/docs/production)中的适配器行为不能代替本包的开发条件动态导入：本包默认入口包含运行时实现，仍须按前文示例剔除。
