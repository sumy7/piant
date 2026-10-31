# 受控状态与按压行为

`createControllableState` 统一管理受控与非受控值；`createPressable` 为已有 Piant 节点提供指针按压状态。它们从 `@piant/ui` 根入口导入，可用于组合控件。

<LiveExample example="uiPressable" title="按住、移出后移回，再释放" :height="420" />

## createControllableState

```ts
import { createControllableState } from '@piant/ui';

const [value, setValue] = createControllableState({
  defaultValue: 0,
  onChange: (next) => console.log(next),
});

setValue((previous) => previous + 1); // 返回请求值 1
value(); // 1
```

选项类型为 `ControllableStateOptions<T>`：

| 选项                            | 语义                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `value?: T`                     | 不为 `undefined` 时受控；`null`、`false`、`0` 都是有效受控值 |
| `defaultValue: T`               | 必填，只在创建时读取一次，包括最初处于受控模式的情况         |
| `onChange?: (value: T) => void` | 请求值与当前值不同后通知，使用调用 setter 时的最新回调       |

返回只读元组 `[Getter<T>, Setter<T>]`。Setter 的值读取、updater 与回调在 core `untrack` 边界内执行，不会给调用方的 effect 增加意外依赖。Setter 接受值或 `(previous) => next`，返回求值后的请求值。`Object.is(previous, next)` 相同时不更新、不通知；对象按引用比较，不做深比较，也不会为了存储而改变对象身份。

非受控模式先更新内部值，再调用 `onChange`。受控模式仅通知，由父级决定是否提交 `value`；setter 的返回值不表示父级已接受请求。父级直接改变 `value` 不会反向触发 `onChange`，因此不会产生用于同步 props 的重复通知。父级尚未提交时，下一次 updater 仍以当前受控值为输入。

把 `value` 改为 `undefined` 会切回非受控模式，恢复最后一次非受控内部值；若从未在非受控模式更新，则使用创建时的 `defaultValue`，不会复制最后一个受控值。

## 保留 props 的响应式读取

包装控件时，用 getter 映射外部契约。对象展开和提前解构会读取 getter 并保存快照，不适合传递需要持续更新的 props。

```ts
import { createControllableState } from '@piant/ui';

interface ValueProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function useValue(props: ValueProps) {
  return createControllableState({
    get value() {
      return props.value;
    },
    defaultValue: props.defaultValue ?? '',
    get onChange() {
      return props.onValueChange;
    },
  });
}
```

同一原语适配三组命名；下面是适配表达式，`props` 分别使用对应控件的属性类型：

| 外部属性                                     | 原语选项                                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `value / defaultValue / onValueChange`       | `get value() { return props.value; }`、`defaultValue: props.defaultValue ?? fallback`、`get onChange() { return props.onValueChange; }`    |
| `checked / defaultChecked / onCheckedChange` | `get value() { return props.checked; }`、`defaultValue: props.defaultChecked ?? false`、`get onChange() { return props.onCheckedChange; }` |
| `open / defaultOpen / onOpenChange`          | `get value() { return props.open; }`、`defaultValue: props.defaultOpen ?? false`、`get onChange() { return props.onOpenChange; }`          |

Setter 复用 core 的公共 `untrack`，不更改调用方 owner；共享工具不直接依赖 MobX。

Core 的公共 `mergeProps` 按属性描述符合并，能保留已有 getter，但返回类型为 `unknown`，使用时需在明确的类型边界收窄。这里只需显式 getter 适配，无需拆分 props 或导入 core 内部工具。

## createPressable

```ts
import type { PNode } from '@piant/core';
import { createPressable, type PressableOptions } from '@piant/ui';

function bindControl(node: PNode, props: PressableOptions) {
  return createPressable(node, {
    get disabled() {
      return props.disabled;
    },
    get onPress() {
      return props.onPress;
    },
  });
}
```

`createPressable(node, options?)` 接受已有 `PNode`，可在组件的 `ref` 中调用。`PressableOptions` 包含 `disabled?: boolean` 与 `onPress`；成功释放时回调收到 `(event, node)`，其中事件是 Pixi `pointerup` 事件。它读取释放时的最新回调。

返回 `PressableState`：

- `hovered()`：未禁用、未销毁时鼠标或笔位于控件内；触摸不产生 hover。
- `pressed()`：有效手势尚未结束且对应指针位于控件内。
- `disabled()`：当前禁用状态；销毁绑定后也为 `true`。
- `dispose()`：幂等地取消手势并释放本绑定的监听、响应式观察与交互占用。

这些 accessor 可用于响应式样式读取。在 JSX 中由 `ref` 创建绑定时，使用 `createState<PressableState>()` 保存返回句柄，并在样式中读取 `press()?.pressed()` 等 accessor（见在线示例源码）。这让 ref 初始化完成后样式重新读取，避免 getter 在节点创建前求值时访问尚未赋值的变量。原语只提供指针行为，不绘制 Button，也不安装键盘、焦点或辅助技术语义；应用不能仅凭按压可用就宣称完整可访问性。

## 手势规则

只有主指针的主按钮按下才能开始手势。一次绑定只接受一个活动 `pointerId`，其他手指或设备不能接管。主按钮包括鼠标主键、触摸接触和笔尖；`isPrimary` 与按钮编号是不同概念，多个设备类型可各自拥有主指针。[W3C 指针按钮与主指针](https://www.w3.org/TR/pointerevents3/#button-states)

| 操作                         | 结果                                 |
| ---------------------------- | ------------------------------------ |
| 有效按下                     | `pressed()` 为 `true`                |
| 同一指针移出控件             | `pressed()` 为 `false`，保留手势     |
| 按住后移回控件               | `pressed()` 恢复为 `true`            |
| 同一指针在控件内释放主按钮   | 先清空按压状态，再触发一次 `onPress` |
| 控件外释放、取消、禁用或销毁 | 清空手势，不触发动作                 |

禁用期间 `hovered()` 与 `pressed()` 均为 `false`。禁用会永久取消当前手势；重新启用不能让旧手势继续触发。若鼠标或笔仍在控件内，重新启用可恢复 hover。

Pixi 的 `pointerenter` / `pointerleave` 不冒泡，适合跟踪整个控件；`pointerup` 后还会生成 `pointertap`。本原语只从有效 `pointerup` 激活，不再监听 tap/click 作为第二条激活路径。[Pixi 事件指南](https://pixijs.com/8.x/guides/components/events)、[v8.22.0 释放事件顺序](https://github.com/pixijs/pixijs/blob/5b41ee37fd36c61e089113345a8f12cf1c3323cf/src/events/EventBoundary.ts#L956)

## 取消与资源清理

PixiJS v8.22.0 的原生 `pointercancel` 监听仍被注释，不能只依赖同名 Pixi 事件。[对应源码](https://github.com/pixijs/pixijs/blob/5b41ee37fd36c61e089113345a8f12cf1c3323cf/src/events/EventSystem.ts#L843)

原语在手势活动期间监听原生取消、窗口失焦、页面隐藏，以及鼠标/笔主按钮丢失。原生 `pointerup` 兜底通过微任务等待 Pixi 的命中判定：若手势仍未结束，只取消，不补发动作。这避免画布外释放或事件中断留下卡住的按压状态。手势结束或绑定销毁后移除这些监听。

绑定同时归所属响应式 owner 与节点生命周期管理，任一销毁都会释放。禁用状态观察有独立可销毁的响应式 root；清理仅移除本绑定注册的函数并释放其交互占用，保留节点上的其他事件监听与其他交互占用。手动管理节点时，也可以调用 `dispose()` 提前结束绑定。

仓库 `examples/ui-smoke` 的 `/pressable.html` 提供消费验证场景；开发命令见[UI 简介](/ui/introduction)。
