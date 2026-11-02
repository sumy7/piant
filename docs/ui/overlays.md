# 浮层底座与实例隔离

`OverlayHost`、`createOverlay` 与 `createOverlayAnchor` 为锚定面板、模态内容和嵌套浮层提供共同底座。浮层内容由现有 `Surface`、`Button`、`TextField` 等组件组成，调用方负责标题、内容、业务动作及产品需要的语义。

完整交互组件见 [Dialog 与 AlertDialog](./dialogs) 和 [Popover 与 Tooltip](./popovers)。

## 锚定、模态与嵌套

<LiveExample example="uiOverlay" title="浮层底座：祖先裁剪、原生输入、模态与嵌套" :height="400" />

点击“打开锚定浮层”，面板应越过按钮祖先的裁剪并覆盖背景输入；滚动页面时仍跟随锚点。点击实例内的外部区域或按 Escape 关闭它。模态示例默认阻止背景点击，在原生输入中编辑、使用 Tab / Shift+Tab 移动焦点，再打开嵌套浮层；Escape 先关闭嵌套，再关闭模态。关闭后恢复到可用触发器，触发器不可用时寻找当前实例的安全焦点。

```tsx
import { createState, View } from '@piant/core';
import {
  Button,
  createOverlay,
  createOverlayAnchor,
  type OverlayAnchor,
  OverlayHost,
  Surface,
  UIProvider,
} from '@piant/ui';

function Content() {
  const [anchor, setAnchor] = createState<OverlayAnchor>();
  const overlay = createOverlay({
    get anchor() {
      return anchor();
    },
    width: 280,
    height: 160,
    placement: 'bottom-start',
    children: (state) => (
      <Surface style={{ width: '100%', height: '100%' }}>
        <Button onPress={() => state.setOpen(false)}>关闭面板</Button>
      </Surface>
    ),
  });
  return (
    <View ref={(node) => setAnchor(createOverlayAnchor(node))}>
      <Button onPress={() => overlay.setOpen(true)}>打开面板</Button>
    </View>
  );
}

export function App() {
  return (
    <UIProvider>
      {() => <OverlayHost>{() => <Content />}</OverlayHost>}
    </UIProvider>
  );
}
```

在 core `mount` 创建的组件内，Host 自动使用 `useMountSurface()` 提供的目标。使用手动 `render` 时传入 `target`，它应与所属 Canvas 的 DOM 宿主一致。每个 target 与 UIProvider 焦点作用域只能安装一个 Host；独立 Canvas 使用独立根 UIProvider。Host 的 `target` 在创建时确定。

## 双 Canvas 与卸载

<LiveExample example="uiOverlayInstances" title="双实例：模态范围、独立输入与卸载重挂载" :height="720" />

两个小面板由独立 core `mount` 创建，各自拥有 UIProvider、Host 和浮层栈。左侧模态打开时，右侧的输入、计数和浮层仍可操作；Escape 只影响键盘焦点所属实例。右侧浮层打开后可卸载、重挂载该实例，旧面板和监听随实例释放。外层演示仅提供两个 DOM 挂载点及卸载按钮，不参与两个子实例的浮层栈。

模态的交互限制作用于所属挂载实例及其 UI 焦点注册项，背景遮罩覆盖该实例的目标矩形；它不是整个网页的模态对话框，不设置 `body` 的 `inert`，也不锁定页面滚动。页面上的其他 Canvas 或 DOM 应用仍保留自己的交互。需要整个页面阻塞时，应在应用层定义相应宿主范围。

## 打开状态与生命周期

`createOverlay(options)` 在 Host 子树中创建稳定状态对象。`open` 为 getter，配合 `onOpenChange` 使用受控模式；省略 `open` 时由 `defaultOpen` 初始化非受控值。`setOpen` 请求变化，受控最终值由父级提交。响应式属性通过 getter 转发，避免解构或对象展开产生快照。

| 状态与方法         | 行为                                                         |
| ------------------ | ------------------------------------------------------------ |
| `open()`           | 当前受控或非受控逻辑打开值                                   |
| `ready()`          | 视觉 Canvas 已完成异步挂载                                   |
| `error()`          | 最近一次初始化或渲染失败；下一次打开清除                     |
| `position()`       | 当前 viewport 坐标、最终方向及可用宽高；关闭后为 `undefined` |
| `element()`        | 当前视觉面的 DOM 宿主；关闭后为 `undefined`                  |
| `setOpen(boolean)` | 请求打开或关闭                                               |
| `updatePosition()` | 显式重新读取几何并应用定位                                   |
| `dispose()`        | 幂等释放状态所属效果与当前视觉资源                           |

`children(state)` 在每次打开时执行一次，使用独立、显式释放的响应式 owner，继承创建浮层处的主题、焦点、状态及其他 context。内容内部的响应式读取继续更新；关闭、父层关闭或销毁会释放该次内容，不复用过期节点。Host 只改变视觉挂载位置，不将内容重新放入另一个 UIProvider。

视觉 Canvas 初始化是异步过程。快速打开后关闭、卸载及初始化失败均需通过该生命周期释放；应用可用 `ready()` 显示准备状态，用 `error()` 或 `onError` 呈现失败。不要把 `open()` 视作浏览器已经完成绘制。锚点移除或不再可见时，请求 `anchor-removed` 关闭并释放视觉面，即使受控调用方尚未提交 `open=false`，也不会保留失效的画面；调用方应同步逻辑状态。

## 坐标、尺寸与更新

`createOverlayAnchor(node)` 返回 `OverlayAnchor`，通过 core 公共 DOM 绑定读取 Canvas 节点在 viewport 中的矩形。它提供 `element`、`available`、`observe(listener)` 和 `dispose()`，随节点或 owner 清理。也可直接将属于该实例的真实 `HTMLElement` 作为 `anchor`；省略锚点时，视觉面在所属实例目标矩形附近居中并受可见 viewport 限制。

| 定位选项          | 默认值与行为                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `width`、`height` | 必填正有限数，viewport CSS 像素；内容绘制范围按可用空间缩小                                 |
| `placement`       | `'bottom-start'`；支持 `top` / `bottom` / `left` / `right` 及 `-start` / `-center` / `-end` |
| `gap`             | `4`，锚点与面板的 CSS 像素间隔                                                              |
| `padding`         | `8`，viewport 边缘留白                                                                      |
| `flip`            | `true`；当前侧溢出且对侧空间更大时翻转                                                      |
| `shift`           | `true`；沿边缘平移以减少溢出                                                                |

`computeOverlayPosition(anchor, contentSize, bounds, options)` 是纯计算函数。矩形使用 `{ x, y, width, height }`，全部是同一 viewport CSS 像素坐标系，不能直接传入 Yoga 局部坐标、Pixi 世界坐标或 Canvas buffer 像素。返回 `{ x, y, placement, availableWidth, availableHeight }`；独立使用此函数时，调用方需应用可用尺寸并重新计算最终位置。

Host 读取 DOM 矩形完成 Canvas 与宿主缩放后的坐标转换。内容尺寸保持 CSS 像素，不随来源 Canvas 的 CSS 缩放倍增。空间不足时仅缩小视觉面的绘制范围，不自动给任意内容添加滚动容器；需要滚动内容时由调用方组合 core `ScrollView`。

打开期间每个 Host 共享一组滚动、窗口、visual viewport 与尺寸监听，并共享一个几何采样帧，用于覆盖没有布局事件的 Pixi 位移和 CSS 动画。几何签名不变时不重复定位或调整 Canvas 大小；关闭最后一个浮层后停止采样并释放监听。关闭状态不会持续注册全局 tick。

## 关闭与事件策略

只对符合策略的栈顶浮层处理关闭，不穿过栈顶继续关闭下层。

浮层的生命周期由创建它的内容 owner 决定：关闭父浮层会清理其内容中创建的子浮层；同一 Host 中独立创建的浮层不会因打开顺序而被连带关闭。关闭未持有焦点的下层浮层会保留当前上层焦点。

| 选项                        | 默认值与行为                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `modal`                     | `false`；为 `true` 时限制实例背景指针与焦点，Tab / Shift+Tab 在许可浮层内循环                                          |
| `dismissOnEscape`           | `true`；在所属实例内处理栈顶 Escape，消费已处理事件                                                                    |
| `outsidePointer`            | 普通浮层 `'dismiss'`，模态 `'block'`；定义实例内视觉面之外的指针策略                                                   |
| `autoFocus`                 | 模态默认 `true`，普通默认 `false`；准备完成后进入当前浮层                                                              |
| `initialFocus`              | 可选目标解析函数，每次视觉面就绪时执行一次；不可用或属于其他浮层时聚焦视觉面本身                                       |
| `noninteractive`            | 默认 `false`；描述层不接收焦点，也不遮蔽下层的外部指针、焦点及 Tab 策略；描述内容内部的指针仍属于浮层                  |
| `dismissOnFocusOutside`     | 默认 `false`；焦点移到当前交互面之外时请求关闭，不抢回已移出的非模态焦点                                               |
| `tabAnchor`                 | 可选语义触发器元素；将正文边界 Tab 接到触发器及其逻辑后继，供非模态组件使用                                            |
| `escapeScope`               | 默认 `'instance'`；`'document'` 用于无焦点的描述层，观察 Escape 而不消费其他实例的事件；每次分发仅处理一次             |
| `restoreFocus`              | `true`；关闭时尝试返回先前可用焦点，必要时回退                                                                         |
| `onDismiss(reason, event?)` | `reason` 为 `'escape'` / `'outside-pointer'` / `'anchor-removed'` / `'focus-outside'`；返回 `false` 可否决逻辑关闭请求 |
| `onError(error)`            | 通知异步初始化或渲染失败，同时可从 `error()` 读取                                                                      |

`outsidePointer='dismiss'` 在实例内主指针按下时请求关闭；普通浮层允许背景手势继续，模态仍消费背景手势，避免点击穿透。`'block'` 消费外部手势但不请求关闭；`'ignore'` 不请求关闭，模态的背景限制仍然有效。属于其他 Canvas 或网页应用的事件不会被当作此实例的外部点击。打开触发事件不会被新浮层当成外部点击而立即关闭。

合成输入期间 Escape 不关闭浮层，合成结束边界沿用 core `isComposingInput` 契约。焦点约束覆盖 UI 注册的 Canvas 语义代理和原生 TextField，背景代理同时不可用；不注册到 UI 焦点服务的自定义 DOM 控件需由应用纳入自己的交互约束。中文输入法候选窗口和操作系统事件顺序应在目标平台上另行验证，合成事件单测不能证明系统输入法表现。

实例内模态约束也覆盖容器的标题、tablist 和面板语义区域。关闭后的内部焦点恢复不会再次请求 Tabs 自动选择。

## 视觉宿主与支持范围

Host 要求浏览器支持 HTML Popover API，使用 `popover="manual"` 提升视觉宿主到顶层，并在每个打开的视觉面内创建独立 Canvas。该面自己的原生输入 DOM 层与 Canvas 位于同一个顶层宿主，避免只提高 Pixi `zIndex` 时仍被背景 DOM Input 覆盖。祖先的 `overflow` 裁剪与变换不会成为视觉面的定位包含块；manual 模式的关闭、模态和焦点由实例栈管理。浏览器未提供该 API 时，通过 `error()` / `onError` 明确失败，没有降级到普通 `zIndex` 容器。[Popover 规范](https://html.spec.whatwg.org/multipage/popover.html#the-popover-attribute)、[顶层布局规则](https://drafts.csswg.org/css-position-4/#top-layer)。

每个打开视觉面持有独立渲染资源，关闭即销毁。适合少量交互浮层；大量持续显示的装饰内容应优先在原 Canvas 内绘制。浏览器顶层顺序属于整个 Document，后来打开的外部 dialog 或 popover 可能覆盖这些浮层。该底座不提供完整 Dialog、Menu、Select 等组件的角色、项目导航或业务交互语义，也不将构建通过视为视觉、系统输入法或辅助技术验收。
