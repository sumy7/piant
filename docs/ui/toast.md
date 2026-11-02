# Toast 通知

`ToastProvider` 管理当前实例的有界通知队列，`useToast()` 创建、更新和关闭通知，`ToastViewport` 在应用指定的位置展示它们。通知默认持续显示，不抢焦点，也不阻断当前操作。

## 在线示例

<LiveExample example="uiToast" title="Toast：排队、更新、持久操作、定时反馈与重挂载" :height="1000" />

“加入 5 条 Toast”批量创建持续通知。示例最多保留 6 条、显示 3 条；再次批量加入时，超出容量的新通知被拒绝，已有通知不被挤掉。关闭可见通知后，队列按顺序补位。示例采用比默认值更小的总容量，便于观察排队与拒绝计数。

“创建或替换上传 Toast”重复使用同一个 ID，完整替换内容并保留队列位置；“局部更新上传 Toast”只修改说明。“加入持久操作 Toast”提供“恢复草稿”按钮，明确激活才增加恢复计数。“加入短暂 Toast”使用 4 秒时长，保存结果同时保留在示例文字中，通知消失后仍可查看。

可将指针移入通知、聚焦操作按钮、切换窗口或滚动裁剪来观察暂停；回到可见且未暂停的状态后继续剩余时间。卸载 Provider 会释放其通知与计时器，重新挂载从空队列开始。外观按钮切换明暗、密度和 200% 字号，外层滚动区用于在窄容器或较大字号下继续到达控件。

```tsx
import { View } from '@piant/core';
import {
  Button,
  ToastProvider,
  ToastViewport,
  UIProvider,
  useToast,
} from '@piant/ui';

function Content() {
  const toast = useToast();
  return (
    <View style={{ flexDirection: 'column', gap: 12 }}>
      <Button onPress={() => toast.show({ title: '草稿已保存' })}>保存</Button>
      <ToastViewport label="通知" dismissLabel="关闭" />
    </View>
  );
}

export function App() {
  return (
    <UIProvider>
      {() => <ToastProvider>{() => <Content />}</ToastProvider>}
    </UIProvider>
  );
}
```

## Provider 与控制器

每个 UI 焦点作用域安装一个 `ToastProvider`，每个 Provider 最多一个 `ToastViewport`。普通嵌套 UIProvider 继承焦点和通知上下文；需要独立通知实例时，使用隔离的 UIProvider 并在其中安装自己的 ToastProvider。`useToast()` 需在相应 Provider 的函数子树中调用，没有全局通知单例。

| `ToastProvider` 属性 | 默认值与行为                                                |
| -------------------- | ----------------------------------------------------------- |
| `maxVisible`         | `3`，FIFO 展示窗口的最大条目数                              |
| `maxToasts`          | `20`，包含当前窗口和排队通知的总容量                        |
| `duration`           | `0`，通知未指定时长时使用的默认毫秒数；`0` 持续显示         |
| `children`           | `() => ReturnType<typeof View>`，延迟创建通知消费者与展示区 |

Provider 的容量与默认时长在创建时读取一次。容量须为正整数且 `maxVisible <= maxToasts`。时长须为非负有限数。通知优先级控制播报通道，不改变 FIFO 顺序，也不绕过容量上限。

`useToast()` 返回稳定的 `ToastController`：

| 方法或读取          | 行为                                                          |
| ------------------- | ------------------------------------------------------------- |
| `items()`           | 当前全部 `readonly ToastRecord[]`，包含排队通知               |
| `visible()`         | FIFO 窗口内的只读条目，不表示每行当前都处于可见像素内         |
| `queuedCount()`     | 当前排队条目数                                                |
| `show(input)`       | 返回通知 ID；新 ID 超出容量时返回 `undefined`，不替换其他通知 |
| `update(id, patch)` | 存在时局部更新并返回 `true`；找不到 ID 时返回 `false`         |
| `dismiss(id)`       | 程序关闭指定通知，返回是否实际关闭                            |
| `dismissAll()`      | 程序关闭所有通知，包括排队条目                                |

读取结果用于展示状态；修改通知通过控制器方法完成，不直接修改返回记录或数组。

## 通知数据与更新

| `ToastInput` 属性 | 行为                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| `id`              | 可选 ID；省略时生成 ID，显式重复 ID 执行完整 upsert                             |
| `title`           | 必填非空文本，作为可见标题与通知组名称                                          |
| `description`     | 可选说明文本                                                                    |
| `duration`        | 可选非负有限毫秒数；`0` 持续显示，省略时使用 Provider 默认值                    |
| `priority`        | `'polite'` 默认、`'assertive'` 或 `'off'`，决定 live 播报方式                   |
| `action`          | 可选 `{ label: string, onAction(event: ButtonPressEvent): void }`，明确操作按钮 |
| `onDismiss`       | 可选关闭回调，接收 `ToastDismissReason`                                         |

`ToastRecord` 提供只读 `id`、`title`、`description`、归一化后的 `duration` / `priority`、可选 `action`。公共类型从 `@piant/ui` 根入口导出。

显式 ID 的 `show` 是完整替换：省略字段重新使用默认值或清除该字段，不继承旧动作、说明与回调；队列位置保持。`update` 接受 `ToastUpdate`，只修改指定字段，`action: null` 可移除动作。两种更新都重置该条通知的完整计时时长，旧计时器不能关闭更新后的内容。

```tsx
const id = toast.show({
  id: 'upload',
  title: '上传中',
  description: '准备文件',
  duration: 0,
});
if (id) {
  toast.update(id, { description: '上传完成', action: null });
}
```

只更新消息、时长或主题时保留已有动作按钮及焦点；替换动作标签或回调时取消尚未释放的按键或指针手势，新的动作需要重新激活。

动作回调中的 `event.preventDefault()` 可保留当前通知；回调同步更新或移除同一条通知后，不会再由旧动作关闭新内容。动作回调只在明确激活按钮时执行；创建、更新、超时、普通关闭或卸载不会代为执行动作。关闭原因区分：

| `ToastDismissReason` | 来源                                |
| -------------------- | ----------------------------------- |
| `'timeout'`          | 可运行计时耗尽                      |
| `'close'`            | 关闭按钮或通知控件中的本地 Escape   |
| `'action'`           | 明确激活动作后的关闭                |
| `'programmatic'`     | `dismiss` / `dismissAll` 等程序关闭 |

关闭事件适合更新界面反馈，不应被当作确认业务意图。重要操作宜保持 `duration: 0`，并在通知以外提供长期可达的入口。

## 展示位置、交互与计时

`ToastViewport` 接受 `label` 默认 `Notifications`、`dismissLabel` 默认 `Dismiss`、`style` 与 `ref`，默认宽 `360`、高 `320`，使用滚动内容容纳通知。应用可覆盖尺寸和布局，并把它放在自己的 PNode 树中。它不向 `body` 挂载 portal，也不会越过祖先裁剪或父模态的交互限制；需要跨布局的通知位置，应在应用层安排相应树位置。

Viewport 的真实 DOM 区域使用 `role="region"` 与 `label`；每条通知使用以标题命名的组。动作按钮名称组合动作标签和通知标题，关闭按钮名称组合 `dismissLabel` 和通知标题，避免多个通知的“关闭”含义不清。

只有进入展示窗口且 Viewport 已挂载的条目才运行计时，排队期间不会先耗尽时长。指针悬停、通知控件持有焦点、窗口失焦、文档隐藏，以及 Viewport 或通知行隐藏或完全被裁剪，都会暂停相应计时；解除暂停后使用剩余时间，而不是重新从头计时。内容更新则明确重置完整时间。持续通知没有自动计时。

Toast 不自动聚焦。键盘使用普通 Tab / Shift+Tab 到达可见操作和关闭控件；聚焦行被关闭后，由既有焦点服务恢复实例中的安全焦点。本地 Escape 只处理焦点位于通知控件的情况，不安装全局 Toast Escape；Dialog、Menu 等浮层的 Escape capture 策略优先，避免越层关闭通知。

Provider、Viewport 或相关 owner 销毁会清理其资源；Provider 重挂载创建独立的新队列。Provider 销毁只清理资源，不伪造动作或关闭回调；旧控制器的修改方法安全返回空值或 `false`。主题、密度和字号使用所属 UIProvider，不因外观变化重新创建通知或抢走当前焦点。生命周期不依赖动画。

## 播报与支持边界

展示区预先创建稳定、空的 polite `status` 与 assertive `alert` live 通道，并与通知按钮分开。只有当前展示通知进入相应通道，排队通知不提前播报；`priority="off"` 保留视觉内容而不加入 live 播报。普通反馈使用 polite，assertive 用于确实需要及时注意的重要状态，避免频繁打断。

[WAI-ARIA status](https://www.w3.org/TR/wai-aria-1.2/#status)定义礼貌的状态反馈语义，[alert](https://www.w3.org/TR/wai-aria-1.2/#alert)定义紧急的动态消息语义；[APG Alert 指导](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)强调通知不改变键盘焦点，并提醒避免过快消失或频繁中断。持续显示的默认值为用户保留阅读和操作时间。

自动关闭只适用于在其他位置仍可获得的非关键反馈。悬停、焦点和隐藏暂停并不能自动证明满足 [WCAG Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)；业务本身有时间限制时，应用仍需提供关闭、调整或延长时间等适当方式。

DOM/AX 检查可以验证名称、角色与 live 关系，模拟时钟和事件可以验证计时状态；它们不证明 VoiceOver 的实际朗读顺序、重复消息处理或触摸读屏结果。真实浏览器交互、辅助技术验收和构建/单元测试应分别记录。当前 Toast 不提供页面级模态、操作系统通知或通知持久化服务。
