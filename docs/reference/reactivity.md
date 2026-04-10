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

在组件首次挂载后执行一次。

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

如果后续版本对外导出该能力，再补充完整的函数签名与使用示例。
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
