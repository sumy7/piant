# Dialog 与 AlertDialog

`Dialog` 用于需要暂时集中操作的表单或说明，`AlertDialog` 用于需要明确取消或确认的简短决策。它们复用 [OverlayHost](/ui/overlays) 的实例浮层栈、焦点约束及资源生命周期，需在 `UIProvider` 和 `OverlayHost` 的延迟子树中创建。

## Dialog

<LiveExample example="uiDialog" title="Dialog：原生输入、嵌套、受控拒绝与焦点恢复" :height="340" />

打开后焦点进入姓名输入。Tab / Shift+Tab 在当前弹窗内循环；Escape、遮罩和关闭按钮请求关闭。关闭嵌套弹窗后回到父弹窗的触发器。勾选“拒绝关闭请求”后，调用方收到请求但不提交新值，当前内容继续保留。取消勾选后可正常关闭。

“移除 Dialog 触发器”不会关闭居中弹窗；随后关闭时焦点回退到实例内的可用控件。“保存并关闭”只演示关闭，不连接保存服务。内容关闭后释放，再打开从默认草稿创建。

```tsx
import { View } from '@piant/core';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TextField,
} from '@piant/ui';

<Dialog>
  {() => (
    <View>
      <DialogTrigger>编辑项目</DialogTrigger>
      <DialogContent actions={() => <DialogClose>完成</DialogClose>}>
        {() => (
          <View style={{ flexDirection: 'column', gap: 12 }}>
            <DialogTitle>项目名称</DialogTitle>
            <DialogDescription>输入名称后关闭本次编辑。</DialogDescription>
            <TextField aria-label="项目名称" defaultValue="Piant" />
          </View>
        )}
      </DialogContent>
    </View>
  )}
</Dialog>;
```

## AlertDialog

<LiveExample example="uiAlertDialog" title="AlertDialog：取消优先、中文输入与明确确认" :height="280" />

打开后默认聚焦“取消删除”。遮罩点击被阻止并保持打开；Escape 只请求关闭，不执行取消或确认按钮的业务回调。在输入框内按 Enter 不会隐式确认。输入“删除”后，明确激活确认按钮才增加计数；未匹配时按钮回调调用 `event.preventDefault()`，保留弹窗。

```tsx
<AlertDialog>
  {() => (
    <View>
      <AlertDialogTrigger variant="danger">删除项目</AlertDialogTrigger>
      <AlertDialogContent
        actions={() => (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AlertDialogCancel variant="secondary">取消</AlertDialogCancel>
            <AlertDialogConfirm variant="danger" onPress={deleteProject}>
              确认删除
            </AlertDialogConfirm>
          </View>
        )}
      >
        {() => (
          <View style={{ flexDirection: 'column', gap: 12 }}>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复。</AlertDialogDescription>
          </View>
        )}
      </AlertDialogContent>
    </View>
  )}
</AlertDialog>
```

`onOpenChange(false)` 表示关闭请求，不是确认意图。业务动作放在 `AlertDialogConfirm` 的 `onPress` 中；不要在打开状态变化或卸载回调中执行确认。异步业务可先阻止关闭，待应用完成处理后提交受控 `open=false`。受控父级拒绝关闭时，已由按钮显式发出的业务回调不会自动撤销，应用应自行防止重复提交。

## 组合 API

所有组件和属性类型从 `@piant/ui` 根入口导出，不使用深度导入。每个根组件最多创建一个 Content；Title 与 Description 各最多一个，AlertDialogCancel 也最多一个。组合部件必须在对应根组件的函数子树内创建，弹窗内容和操作区也使用工厂函数，避免在打开前创建或重复使用同一个交互节点。

| 组件                                                     | 属性与行为                                                                                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog`、`AlertDialog`                                  | `open?: boolean`、`defaultOpen?: boolean`、`onOpenChange?: (open: boolean) => void`、`children: () => unknown`、外层 `style` / `ref`                                                        |
| `DialogTrigger`、`AlertDialogTrigger`                    | 复用 `ButtonProps`，激活后请求打开，提供展开状态及内容 ID 关联                                                                                                                              |
| `DialogContent`、`AlertDialogContent`                    | `width?: number` 默认 `440`、`height?: number` 默认 `320`，均为正有限 CSS 像素；`children: () => unknown`；`actions?: () => unknown`；`style` / `ref`；`onError?: (error: unknown) => void` |
| `name`                                                   | Content 的非空可访问名称入口；没有可见 Title 时必须提供                                                                                                                                     |
| `scrollLabel`                                            | 正文溢出时键盘滚动区域的可访问名称，默认 `Scrollable dialog content`                                                                                                                        |
| `initialFocus`                                           | Content 的 `() => HTMLElement \| undefined`，每次内容准备完成后只解析一次；目标不可用时聚焦内容容器                                                                                         |
| `dismissOnEscape`                                        | Content 默认 `true`；设为 `false` 时不关闭当前或父弹窗                                                                                                                                      |
| `dismissOnOutsidePointer`                                | 仅 DialogContent，默认 `true`；设为 `false` 时阻止背景指针但不关闭。AlertDialog 始终阻止遮罩关闭                                                                                            |
| `DialogTitle`、`AlertDialogTitle`                        | 必填非空文本 `children: string`，可选 core Text `style`；为 Content 提供标题 ID 与名称                                                                                                      |
| `DialogDescription`、`AlertDialogDescription`            | 必填非空文本 `children: string`，可选 core Text `style`；提供描述 ID 关联                                                                                                                   |
| `DialogClose`、`AlertDialogCancel`、`AlertDialogConfirm` | 复用 `ButtonProps`；先执行自身 `onPress`，事件未 `preventDefault()` 时请求关闭                                                                                                              |

`open` 为 `undefined` 时使用非受控状态，`defaultOpen` 只初始化一次；传入 `open` 时只有父级提交的值会改变视觉和语义。转发响应式 props 时保留 getter，不用解构或展开把值变成快照。确认、取消和关闭按钮支持 Button 的禁用、加载、文字样式、图标及键盘规则；禁用或加载时不激活。

## 焦点、输入与生命周期

Dialog 默认选择当前内容中第一个可用控件；AlertDialog 默认选择可用 Cancel，没有可用 Cancel 时聚焦内容容器。可用 `initialFocus` 指向 TextField 的 `ref` 所提供的 `node.element`，也可指向带 `tabindex="-1"` 的静态文本目标。不要把初始焦点默认指向危险确认动作。应提供可见的关闭或取消按钮，让使用者无需依赖 Escape 或遮罩。

初始焦点仅在每次打开的视觉内容准备完成后设置，主题、字号、内容更新不会重新执行。Tab / Shift+Tab 约束和 Escape 处理由 Host 统一完成。关闭后尝试恢复打开前的可用焦点；触发器隐藏或移除时，优先回到仍打开的父弹窗，否则寻找实例内安全焦点。嵌套弹窗只对当前顶层应用关闭规则。

原生 TextField 仍由 core 处理编辑、选区与输入合成。合成期间及合成结束边界的 Escape 不关闭；确认按钮沿用 Button 的 IME 激活保护。输入框 Enter 不自动调用确认。真实系统输入法候选窗口、平台特有事件顺序仍需另行实测。

每次打开创建内容 owner、视觉 Canvas 和原生输入；关闭立即释放，不提供 `keepMounted`。需要跨次打开保留草稿时，将值存放在根组件外并作为受控值传给 TextField。父 owner、节点或 Host 销毁会释放所属内容及嵌套弹窗；独立根弹窗按各自生命周期管理。异步初始化、快速开关和失败处理沿用 Host；可通过 Content 的 `onError` 观察初始化或渲染错误。

内容保持创建处的主题和 context。默认使用主题的颜色、间距、圆角、字体与缩放，不内置开关动画，生命周期不依赖动画或 reducedMotion。尺寸按可见 viewport 缩小；正文位于 ScrollView，`actions` 为独立换行操作区，窄空间下优先让操作可达。自定义样式、极小视口或过多操作仍须检查实际布局。

正文超过可见高度时，会在 Tab 顺序末尾增加“Scrollable dialog content”滚动区域；可用 `scrollLabel` 提供本地化名称。聚焦该区域后用 Page Up / Page Down、上下箭头、Home / End 滚动，再按 Tab 进入当前可见的正文控件；非溢出状态不增加停靠点。操作区仍在正文外，保持可达。

Title / Description 为空，或没有 Title 与 `name`，属于配置错误。Content 会释放视觉资源和焦点约束，并通过 `onError` 报告一次；修正配置后需重挂载该 Content。关闭及销毁过程中的正常标题清理不会报告错误。

## 语义与支持边界

Content 的真实 DOM 宿主使用 `role="dialog"` 或 `role="alertdialog"`。Title / Description 同步提供真实 DOM 文本，通过 `aria-labelledby` / `aria-describedby` 关联；无可见 Title 时使用 Content 的 `name` 对应 `aria-label`。复杂结构化正文不宜整段作为 Description，AlertDialog 应使用简短明确的告警描述。

模态限制作用于所属 Canvas 实例及其注册的 UI 控件，其他 Canvas 和页面 DOM 保持可操作。它不锁定 `body` 或页面滚动，不构成整个 Document 的模态。为准确表达这个范围，组件使用 `aria-modal="false"`；ARIA 没有按 UIProvider 限定 `aria-modal="true"` 的机制。它因而不声称完整实现页面级 [APG Modal Dialog 模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)；需要页面级模态的应用应采用具有实际页面阻塞能力的宿主或独立文档边界。[WAI-ARIA 对 aria-modal 的定义](https://www.w3.org/TR/wai-aria-1.2/#aria-modal)要求阻止使用页面其他内容，不能仅为读屏提示而设置为 `true`。

浏览器要求、manual popover 顶层顺序、自定义未注册 DOM 控件和双实例边界见[浮层底座](/ui/overlays)。Chrome 可访问性树检查只能证明相应角色、名称和描述已暴露，不能证明 VoiceOver 的实际朗读与导航。自动化 composition / CDP IME 检查也不能代替操作系统中文候选窗口验收。应分别记录构建、浏览器交互、AX 检查、系统输入法与辅助技术测试的结果。
