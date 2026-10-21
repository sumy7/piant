# 异步 action 与错误恢复

`createStore` 已支持把 `async` 函数定义为 action。本节使用现有 `createStore`、`set`、`get` 组织请求状态，不增加公共 API、middleware 或依赖。

## 状态与恢复规则

| 时机 | `loading` | `error` | `data` |
| --- | --- | --- | --- |
| 初始状态 | `false` | `null` | `null` |
| 发起请求 / 重试 | `true` | 清空 | 保留上次成功数据 |
| 最新请求成功 | `false` | 清空 | 替换为新数据 |
| 最新请求失败 | `false` | 保存错误消息 | 保留上次成功数据 |
| 取消 | `false` | 清空 | 保留上次成功数据 |
| 已被替代 / 取消的请求完成 | 不更新 | 不更新 | 不更新 |

`data` 表示**上次成功结果**，刷新期间可能属于另一位用户。页面同时展示 `requestedId` 和 `data.id`，避免把旧数据当作新请求结果。若业务要求请求开始即隐藏旧数据，可在开始的 `set` 中额外设置 `data: null`。

## 可复用的应用层 Store

下面是在线示例与 Store 回归测试共同使用的实际实现；可复制到应用的 `userStore.ts`。`loadUser` 由应用注入，负责网络请求和响应校验。

<<< ../examples/storeAsyncModel.ts

每次 `await` 后的状态提交都调用 `set`。`set` 内部通过 MobX `runInAction` 浅合并状态，让 `data`、`loading` 和 `error` 在同一次提交中通知订阅者。不要依赖 async 函数在第一次 `await` 前的 action 边界，也不要在异步延续中直接修改 `get().data` 等 observable 属性。`get()` 用于在重试时读取最新的请求参数。

这里把请求失败转换为显式的 `LoadResult`，并写入 `error` 供视图展示；没有悄悄忽略错误，也不会产生未处理的请求 rejection。业务调用方可按结果进行提示或后续操作：

```ts
const result = await useUserStore.getState().load(1);
if (result.status === 'error') {
  console.error(result.error); // 在应用中也可显示通知或记录日志
} else if (result.status === 'success') {
  console.log(result.data);
}
// ignored 表示被新请求替代或主动取消，不应触发旧请求的后续业务操作。
```

若应用选择抛出错误的 action 合约，应在写入失败状态后重新抛出，并由所有调用处 `try/catch` 处理；不要把它与本示例的结果返回合约混用。

## 并发：只接纳最新发起的请求

每次 `load` 都递增请求序号；只有序号仍为最新的请求可以提交状态。先请求用户 1，再请求用户 2，即使用户 1 最后才返回，也不会覆盖用户 2。旧失败同样不能覆盖新成功，旧请求也不能提前清掉新请求的 `loading`。最新请求失败时保留最新错误，不会回退接纳旧成功。

`AbortController` 用于尽早释放旧请求资源，**序号检查仍然必需**：loader 可能忽略取消，或请求完成与取消交错。`cancel()` 先让序号失效，再发出取消信号并恢复状态；它可以重复调用，取消后仍能 `load` 或 `retry`。本策略适用于搜索、详情等“最新选择优先”的读取操作。支付、提交表单等写操作需另行设计幂等或排队策略，取消请求不能撤销服务端副作用。

接入真实请求时，可用以下 loader 替换模拟实现（类型与 `createUserStore` 从上面的应用模块导入）：

```ts
const loadUser: LoadUser = async (id, signal) => {
  const response = await fetch(`/api/users/${id}`, { signal });
  if (!response.ok) throw new Error(`加载失败：HTTP ${response.status}`);
  const value: unknown = await response.json();
  if (
    typeof value !== 'object' || value === null ||
    !('id' in value) || value.id !== id ||
    !('name' in value) || typeof value.name !== 'string'
  ) throw new Error('用户数据格式错误');
  return { id, name: value.name };
};
const useUserStore = createUserStore(loadUser);
```

真实网络可能长时间没有响应；需要超时时可在 loader 中实施超时并拒绝 Promise，或者允许用户调用 `cancel()`。本模式不提供自动重试、缓存或超时框架。

## 在线体验与运行

先点击「加载用户1」观察加载与失败，再点击「重试」恢复成功，之后仍可再次加载。每位用户的第一次模拟请求失败，后续成功；用户 1 延迟 900ms，用户 2 延迟 300ms。连续切换用户可以体验新请求替代旧请求；「取消」立即结束加载。被取消的尝试也计入模拟次数。「重新运行代码」会重建 Store 与模拟器。

<LiveExample example="storeAsync" title="异步加载、失败、重试与取消" :height="340" />

「展示代码」显示组件源码；上面的完整模型源码是其导入的 `storeAsyncModel.ts`。组件为每次示例运行创建独立 Store，并通过 `onCleanup(store.cancel)` 取消未完成请求和定时器。共享单例 Store 应由拥有它的页面或应用决定何时取消，避免一个组件卸载影响其他消费者。

从仓库根目录执行 `pnpm install`、`pnpm docs:dev`，打开 `/store/async-actions` 即可运行本页。无需 API 服务。单次回归验证：

```bash
pnpm --filter @piant/store test:run
pnpm --filter @piant/monorepo-docs typecheck
pnpm docs:build
```

`packages/store/tests/asyncActions.test.ts` 直接导入本页示例模型，并通过测试别名使用 Store 源码；使用可控 Promise 验证成功、失败重试、await 后通知、旧成功/旧失败晚到、新请求仍在加载以及取消后的恢复。模拟 loader 的定时器使用 fake timers 验证，不依赖网络或真实等待。
