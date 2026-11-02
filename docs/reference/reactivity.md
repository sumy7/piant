# 响应式 API

## createState

创建响应式状态，返回 `[getter, setter]` 元组。

```ts
function createState<T>(initialValue: T): readonly [Getter<T>, Setter<T>];
function createState<T = undefined>(): readonly [Getter<T | undefined>, Setter<T | undefined>];
```

**示例：**
```ts
const [count, setCount] = createState(0);
count();          // 读取：0
setCount(1);      // 设置为 1
setCount(n => n + 1); // 基于上一个值更新
```

详见：[响应式系统文档](/guide/reactivity#createstate)

---

## createEffect

创建响应式副作用，依赖变化时自动重新执行。

```ts
function createEffect<T>(fn: (prev: T | undefined) => T): void;
function createEffect<T>(fn: (prev: T) => T, initialValue: T): void;
```

**示例：**
```ts
createEffect(() => {
  document.title = `Count: ${count()}`;
});
```

详见：[响应式系统文档](/guide/reactivity#createeffect)

---

## untrack

同步执行回调，回调中的响应式读取不成为外层 effect 或 memo 的依赖。保留当前 owner，不创建新的生命周期作用域；返回回调结果并传播其异常。

```ts
function untrack<T>(callback: () => T): T;
```

```ts
import { untrack } from '@piant/core';

const snapshot = untrack(() => count());
```

---

## createMemo

创建派生的计算值，结果被缓存，只在依赖变化时重新计算。

```ts
function createMemo<T>(fn: () => T): Getter<T>;
function createMemo<T>(
  fn: (prev: T) => T,
  initialValue: T,
  options?: MemoOptions<T>
): Getter<T>;

interface MemoOptions<Prev, Next = Prev> {
  equals?: false | ((prev: Prev, next: Next) => boolean);
}
```

**示例：**
```ts
const fullName = createMemo(() => `${firstName()} ${lastName()}`);
fullName(); // 读取计算值
```

详见：[响应式系统文档](/guide/reactivity#creatememo)

---

## createContext

创建 Context 对象，用于跨组件树传值。

```ts
function createContext<T>(defaultValue?: T): Context<T>;

interface Context<T> {
  id: symbol;
  Provider: (props: { value: T; children: any }) => any;
  defaultValue?: T;
}
```

**示例：**
```ts
const ThemeContext = createContext<'light' | 'dark'>('light');
```

---

## useContext

从当前 owner 树中读取 context 值。

```ts
function useContext<T>(context: Context<T>): T;
```

**示例：**
```ts
const theme = useContext(ThemeContext);
```

详见：[响应式系统文档](/guide/reactivity#createcontext--usecontext)

---

## getOwner 与 runWithOwner

低层宿主可保存当前响应式 owner，在延迟创建内容时恢复其 context、错误处理和清理注册位置。视觉挂载位置不会改变这些逻辑上下文。

```ts
function getOwner(): ContextOwner | null;
function runWithOwner<T>(owner: ContextOwner | null, callback: () => T): T;
```

`ContextOwner` 是应当原样传回的句柄，不应修改其内部字段。`getOwner()` 在作用域外返回 `null`。`runWithOwner` 同步执行回调并返回结果，结束或抛错后恢复原 owner；错误交给所选 owner 的 `onError` 处理，没有处理器时继续抛出。处理器接受错误时返回 `undefined`。

它不创建作用域，不隔离响应式依赖，也不会跨 `await` 保留 owner。需要独立销毁内容时，先在所属 context 内创建 `root`，保存其 owner，并将 disposer 注册到父级 `onCleanup`。`root` 的 disposer 不会自动加入父级。关闭内容时调用该 disposer，并取消或忽略尚未执行的异步回调；不要在清理后的 owner 下创建新内容。

```ts
import { getOwner, onCleanup, root, runWithOwner } from '@piant/core';

let contentOwner: ReturnType<typeof getOwner> = null;
let closed = false;
const disposeContent = root(dispose => {
  contentOwner = getOwner();
  return dispose;
});
const close = () => {
  closed = true;
  disposeContent();
};
onCleanup(close);

queueMicrotask(() => {
  if (!closed) runWithOwner(contentOwner, () => {
    // 此处创建的 effect 和 onCleanup 归 disposeContent 管理。
  });
});
```

---

## createSelector

创建高效的选择器，用于列表中选中状态的细粒度更新。

```ts
function createSelector<T, U extends T>(
  source: Getter<T>,
  fn?: (a: U, b: T) => boolean
): (key: U) => boolean;
```

**示例：**
```ts
const isSelected = createSelector(selectedId);
// 在列表项中：
isSelected(item.id) // true/false，只在选中状态变化时更新
```

详见：[响应式系统文档](/guide/reactivity#createselector)

---

## onMount

在当前同步渲染结束后的微任务中执行一次，节点创建、`ref` 赋值和节点树插入容器均已完成。回调不追踪依赖，并保留所属 owner 的上下文、错误处理与清理能力；owner 提前清理时取消执行。不保证下一帧绘制或布局已完成。

```ts
function onMount(fn: () => void): void;
```

---

## onCleanup

注册清理函数，在 effect 重新执行或组件卸载时调用。

```ts
function onCleanup(fn: () => void): void;
```

---

## onError

注册错误处理函数，捕获当前 owner 范围内的错误。

```ts
function onError(fn: (error: any) => void): void;
```

---

## splitProps

`splitProps` 用于按指定 key 将 props 对象分割为多个部分，常见于组件内部实现中对样式、事件和其余属性的拆分。

> 当前 `splitProps` 仅作为内部工具使用，**不是** `@piant/core` 对外导出的公共 API。
> 因此，应用代码不应将其视为稳定可用的参考接口。

---

## 类型定义

```ts
type Getter<T> = () => T;

type Setter<T> = {
  (value: T): T;
  (update: (prev: T) => T): T;
};

type EffectFn<Prev, Next extends Prev = Prev> = (v: Prev) => Next;

interface MemoOptions<Prev, Next extends Prev = Prev> {
  equals?: false | ((prev: Prev, next: Next) => boolean);
}
```
