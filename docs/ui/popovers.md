# Popover 与 Tooltip

`Popover` 是锚定触发器的非模态交互面板，可放置表单、按钮及嵌套内容。`Tooltip` 提供与触发器关联的简短纯文字说明，不承载操作。两者均需在 `UIProvider` 与 `OverlayHost` 的函数子树中创建，复用[浮层底座](/ui/overlays)的定位、顶层渲染与实例生命周期。

## Popover

<LiveExample example="uiPopover" title="Popover：原生输入、非模态导航、嵌套与受控关闭" :height="380" />

点击“编辑 Popover 备注”后焦点进入输入。背景输入和按钮仍可操作；外部点击请求关闭，并继续执行原本的背景操作。Escape 先关闭当前顶层，关闭后尝试恢复触发器。勾选“拒绝 Popover 关闭请求”后，父级只记录请求而不提交新状态；取消勾选后可正常关闭。

在内容的第一个可用控件按 Shift+Tab 返回触发器，在最后一个可用控件按 Tab 前往触发器后的同作用域控件，同时请求关闭面板。Popover 不设置模态焦点锁。打开嵌套面板再关闭，焦点回到父面板中的触发器。移除触发器会释放失去锚点的视觉面，即使受控值尚未改为 `false`；应用应同步状态，再恢复触发器。

```tsx
import { View } from '@piant/core';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  TextField,
} from '@piant/ui';

<Popover>
  {() => (
    <View>
      <PopoverTrigger>编辑备注</PopoverTrigger>
      <PopoverContent
        name="编辑项目备注"
        placement="bottom-start"
        actions={() => <PopoverClose>完成</PopoverClose>}
      >
        {() => <TextField aria-label="备注" defaultValue="Piant" />}
      </PopoverContent>
    </View>
  )}
</Popover>;
```

### Popover API

| 组件或属性                                         | 类型与行为                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Popover`                                          | `open?: boolean`、`defaultOpen?: boolean`、`onOpenChange?: (open: boolean) => void`、`children: () => unknown`，以及根 View 的 `style` / `ref`    |
| `PopoverTrigger`                                   | 复用 `ButtonProps`，激活切换打开状态，提供 `aria-haspopup="dialog"`、展开状态与内容 ID 关联                                                       |
| `PopoverContent.name`                              | 必填非空 `string`，为实际 `role="dialog"` 内容提供可访问名称                                                                                      |
| `width` / `height`                                 | 正有限 CSS 像素，默认 `320` / `240`；按可用 viewport 空间缩小                                                                                     |
| `placement` / `gap` / `padding` / `flip` / `shift` | 复用 `OverlayPositionOptions`，默认分别为 `'bottom-start'` / `4` / `8` / `true` / `true`；定位方向及计算见[浮层底座](/ui/overlays#坐标尺寸与更新) |
| `initialFocus`                                     | `() => HTMLElement \| undefined`，内容准备完成时只解析一次；未提供时选择首个可用控件，指定目标不可用时聚焦内容容器                                |
| `dismissOnEscape`                                  | 默认 `true`，Escape 请求关闭当前顶层；输入合成期间不误关闭                                                                                        |
| `dismissOnOutsidePointer`                          | 默认 `true`，所属实例内外部主指针请求关闭，保留背景手势                                                                                           |
| `dismissOnFocusOutside`                            | 默认 `true`，所属实例内焦点离开触发器及内容时请求关闭                                                                                             |
| `children` / `actions`                             | 正文工厂 `() => unknown` 必填；操作区工厂可选。正文可滚动，操作区独立换行                                                                         |
| `scrollLabel`                                      | 正文滚动区域的可访问名称，默认 `Scrollable popover content`，可用于长内容的键盘导航                                                               |
| `style` / `ref` / `onError`                        | 视觉内容样式、core View 引用，以及初始化/渲染失败回调                                                                                             |
| `PopoverClose`                                     | 复用 `ButtonProps`，执行自己的 `onPress` 后请求关闭；`event.preventDefault()` 可阻止该请求                                                        |

`open` 为 `undefined` 时使用 `defaultOpen` 初始化非受控状态，默认关闭。传入 `open` 时用户操作只请求变化，最终值由父级提交。Trigger 与 Close 的 `onPress` 均可通过 `event.preventDefault()` 阻止默认状态请求。不要将关闭状态变化解释为保存或确认意图；业务动作由明确的按钮操作执行。

内容使用 `role="dialog"`、必填名称与 `aria-modal="false"`。可见标题由应用自行排版，Popover 不提供独立 Title / Description 部件。触发器名称应描述操作目的，内容名称应说明面板用途。

## Tooltip

<LiveExample example="uiTooltip" title="Tooltip：悬停、键盘焦点、继续阅读与普通按钮动作" :height="340" />

鼠标或笔悬停触发器约 500ms 后显示；键盘或程序聚焦立即显示。指针可移入提示继续阅读，离开触发器和提示后保留约 200ms 的移动宽限。只要仍在悬停或聚焦，没有自动阅读倒计时。Escape 关闭提示，并抑制当前悬停/焦点会话内的立即重开；新的进入或焦点会话可以再次显示。

“保存带提示的草稿”仍是普通按钮，Enter / Space 或点击执行保存计数，提示的显示与关闭不会代替按钮动作。在触发器上按下指针或激活触发按钮会关闭并抑制当前提示，按钮动作继续执行。触摸进入不触发悬停提示，触摸按下后的焦点也不会立即重开；触摸按钮仍执行正常操作。这个触摸策略是组件的产品选择，不是 WCAG 规定的统一手势。

```tsx
import { View } from '@piant/core';
import { Tooltip, TooltipTrigger, TooltipContent } from '@piant/ui';

<Tooltip>
  {() => (
    <View>
      <TooltipTrigger onPress={saveDraft}>保存草稿</TooltipTrigger>
      <TooltipContent>保存当前草稿，不会发布项目。</TooltipContent>
    </View>
  )}
</Tooltip>;
```

### Tooltip API

| 组件或属性                                         | 类型与行为                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tooltip`                                          | `open?: boolean`、`defaultOpen?: boolean`、`onOpenChange?: (open: boolean) => void`、`children: () => unknown`，以及根 View 的 `style` / `ref` |
| `openDelay` / `closeDelay`                         | 默认 `500` / `200` 毫秒，均须为非负有限数，分别用于悬停打开与离开宽限；键盘聚焦不等待打开延迟。这些值为产品默认值，不是规范常量                |
| `TooltipTrigger`                                   | 复用 `ButtonProps`，保留普通按钮的动作、禁用、加载和键盘规则；不附加展开状态或 `aria-haspopup`                                                 |
| `TooltipContent.children`                          | 必填非空 `string`，只允许非交互纯文字，不接受链接、输入框或按钮                                                                                |
| `width`                                            | 正有限 CSS 像素，默认 `260`，文字高度按内容测量                                                                                                |
| `placement` / `gap` / `padding` / `flip` / `shift` | 与浮层定位选项一致，Tooltip 默认方向为 `'top'`                                                                                                 |
| `style` / `textStyle`                              | 内容 View 与文字的样式覆盖                                                                                                                     |
| `ref` / `onError`                                  | 内容 View 引用及初始化/渲染失败回调                                                                                                            |

Tooltip 自身使用 `role="tooltip"`，通过实际内容 ID 合并到触发器已有的 `aria-describedby`，保留原有描述关系。提示不获取或恢复焦点，不参与 Tab 导航，不提供模态遮罩。Escape 可关闭当前悬停提示，即使键盘焦点在页面其他位置；它不会把其他实例的键盘事件当作自身事件消费。

必要信息不应只藏在 Tooltip。触摸、读屏或其他无法悬停的使用者应能从直接可见文字或可点击帮助入口获得同样信息；需要交互时使用 Popover。禁用按钮不能依赖键盘聚焦获得提示。

## 内容、焦点与资源生命周期

根组件、内容及可选操作区通过工厂函数延迟创建。每个根组件最多一个 Trigger 与一个 Content，只使用自己的对应部件，避免复用已经创建的节点。响应式 props 应保留 getter；主题或内容更新不会通过重新打开抢走输入焦点与选区。

Popover 与 Tooltip 都以触发器为锚点。触发器隐藏、销毁或离开可用场景时，失效的视觉内容被释放；父 owner、组件节点或 Host 卸载也会清理内容、监听和计时器。关闭后销毁本次内容，下次打开重新创建。需要跨次保留的表单草稿由应用提升到外层受控状态。

Popover 使用同一实例的焦点服务连接内容与触发器前后顺序，覆盖注册的 Canvas 语义代理和原生 TextField。自定义 DOM 控件需自行纳入相应交互约束。外部指针、焦点与 Tab 导航可以请求关闭，受控调用方拒绝请求时仍以其提交值为准；不能把某次请求当作已经完成卸载。

Popover 名称为空，或 Tooltip 内容为空、不是字符串时，Content 会释放视觉资源，并通过 `onError` 报告配置错误；修正后需重挂载该 Content。

Tooltip 的打开/关闭计时器随当前会话和资源清理取消。它不以固定显示时间猜测阅读完成，不因文字或主题变化重新注册一套浮层管理器。两类组件均复用主题颜色、密度、字体缩放与间距，不内置依赖动画的生命周期。

## 支持与验证边界

Popover 是非模态面板，背景 Canvas、原生输入和其他页面应用仍可操作。嵌套 Popover 可放在 Dialog 内，仍需遵守已有模态栈的许可范围。它不提供 Menu / Select 的项目导航、选择语义或表单提交约定。

[WCAG 1.4.13 对悬停或聚焦内容的说明](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)涵盖可关闭、可移入与持续显示；Tooltip 的 Escape、移入宽限和无阅读倒计时围绕这些目标实现。[APG Tooltip 模式](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)仍标为进行中的指导，不能把具体延迟或触摸策略描述为其强制规则。

浏览器要求、顶层顺序、祖先裁剪、坐标缩放和双实例范围见[浮层底座](/ui/overlays)。自动化 DOM/AX 检查可证明相应关系被暴露，不能证明 VoiceOver 的实际朗读、提示时机与导航。合成事件或 CDP composition 检查也不能证明系统中文候选窗口流程已验收；操作系统输入法与辅助技术需要分别在目标平台验证。构建通过、浏览器运行、AX 检查与人工辅助技术验收应单独记录。
