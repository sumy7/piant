# Store 历史与恢复

`@piant/store` 提供显式的 `createStoreHistory` 记录器；`@piant/devtools` 接收记录器，在 **State** 页展示历史。业务 Store 不需要依赖调试包，普通 `getState` 快照仍然只读。

## 在线体验状态恢复

先点击「增加计数」生成几条记录，再点击一条旧记录，观察计数恢复。恢复后继续增加，会从该位置建立分支，替换后面的记录；示例最多保留 5 条，点击「清空历史」以当前计数重新开始。

<LiveExample example="storeHistory" title="记录、恢复与分支" :height="400" />

这里直接使用 Store 历史 API 展示状态变化，不包含调试面板；在 Devtools 的 State 页点击 Restore 时使用相同的恢复能力。

## 显式启用并注册

已有 Store 应用需安装 `@piant/store` 和它的 MobX peer；调试面板单独安装：

```bash
pnpm add @piant/store "mobx@^6.16.1"
pnpm add -D @piant/devtools
```

以下完整示例定义计数 Store，并将开发期的历史记录器注册到已有 `root` / `app`：

```ts
import type { PRoot } from '@piant/core';
import { createStore } from '@piant/store';
import type { Application } from 'pixi.js';

interface CounterState {
  count: number;
  increment: () => void;
}

export const useCounterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

export async function connectCounterDevtools(root: PRoot, app: Application) {
  if (process.env.NODE_ENV !== 'development') return () => {};

  const { createStoreHistory } = await import('@piant/store');
  const { attachDevtools } = await import('@piant/devtools');
  const history = createStoreHistory(useCounterStore, {
    enabled: true,
    name: 'Counter',
    maxEntries: 100,
  });
  const tools = attachDevtools({
    enabled: true,
    root,
    app,
    stores: history ? [history] : [],
  });

  return () => {
    tools?.detach();
    history?.dispose();
  };
}
```

Vite 使用 `import.meta.env.DEV` 作为开发条件。等待接入完成并保存清理函数，在应用销毁前调用；异步导入期间可能卸载的应用还需在导入后检查存活状态。

创建 Store 本身不记录历史。`createStoreHistory` 只有在 `enabled === true` 时读取初始状态并订阅变化，否则返回 `null`，不读取或订阅 Store。它按实际 MobX 结构变化记录，不是 action 函数调用日志。

## 在 State 页操作

1. 选择已注册的 Store，再选择一条历史记录，查看其数据和可恢复状态。
2. 预览只改变面板选择，不写业务状态。点击 **Restore** 才恢复可恢复记录；不可恢复记录展示原因并禁止恢复。
3. 点击 **Clear** 移除旧历史，以当前实际状态建立新的初始记录。

`createStoreHistory` 的 `maxEntries` 默认 100，限制在 2–1000。记录 ID 单调递增，Clear 不复用旧 ID。Devtools 的 `maxEntries` 默认 120、最大 1000，另行限制每个来源在面板展示的最近记录；需要更多历史时同时考虑两处上限。最多显式注册 20 个记录器，不自动发现 Store。

## 恢复规则与限制

- 快照只保存数据，排除顶层 action 函数。恢复保留 action 与 observable 根对象身份，支持普通 JSON 对象、数组及属性的增删。
- 特殊对象、循环引用、嵌套函数及超限等无法无损恢复的数据会标记为 `restorable: false` 并提供 `reason`。面板可展示标记，但不会将标记恢复到业务 Store。
- Restore 本身不追加历史。恢复后若发生新的业务更新，会从恢复点建立分支并丢弃原来的后续历史。
- 只恢复 Store 数据，不撤销网络请求、外部 I/O、动画或其他副作用。

可与 `combine`、`persist` 组合。初始记录包含创建记录器时已完成 hydration 的状态。恢复沿用 Store 的更新与持久化管道，会写入持久化存储，仍遵循 `partialize` 和自定义 `serialize`；恢复前应考虑这一业务影响。

## 生命周期

收起面板仅暂停 Devtools 采样与界面订阅，应用拥有的记录器继续记录。`detach()` 只解除面板订阅，不自动 `dispose()` 记录器；应用销毁时应先 `tools?.detach()`，再 `history?.dispose()`。

`dispose()` 幂等，停止记录、恢复和通知；此后 `restore()` 返回 `false`。API 详情见 [Store API](/store/api#createstorehistory)。
