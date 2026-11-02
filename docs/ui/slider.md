# Slider

`Slider` 在 Canvas 中呈现可拖动的单值滑块，组合主题、焦点与范围语义。支持受控和非受控值、横向与纵向、横向 RTL、方向键、Home / End；从 `@piant/ui` 根入口导入，并在 `UIProvider` 的延迟子树中创建。

<LiveExample example="uiSlider" title="Slider：小数步长、RTL、纵向非受控与禁用" :height="620" />

拖动第一个轨道观察受控值与通知次数；切换 RTL 后横向左右方向反转。纵向滑块的上方向代表增大，下方向代表减小。“修改纵向初值”改变 `defaultValue`，当前非受控值保持原样；“父级设为零”直接提交受控值，不生成用户变更通知。

```tsx
import { createState } from '@piant/core';
import { Slider, UIProvider } from '@piant/ui';

function Content() {
  const [volume, setVolume] = createState(40);
  return (
    <Slider
      name="音量"
      min={0}
      max={100}
      step={5}
      value={volume()}
      onValueChange={setVolume}
      valueText={(value) => `${value}%`}
    />
  );
}

export function App() {
  return <UIProvider>{() => <Content />}</UIProvider>;
}
```

## 属性

| 属性            | 类型与默认值                                 | 行为                                                |
| --------------- | -------------------------------------------- | --------------------------------------------------- |
| `name`          | 必填非空 `string`                            | 滑块的可访问名称，与可见业务标签对应                |
| `description`   | 可选 `string`                                | 语义代理的说明                                      |
| `value`         | 可选 `number`                                | 提供时受控，由父级决定最终值                        |
| `defaultValue`  | 可选 `number`                                | 非受控初始值，只读取一次；省略时从范围起点开始      |
| `onValueChange` | `(value: number) => void`                    | 用户操作请求一个不同的合法值时通知                  |
| `min`、`max`    | `number`，`0` / `100`                        | 有限数范围，要求 `min <= max`                       |
| `step`          | `number`，`1`                                | 正有限步长，从 `min` 建立刻度                       |
| `orientation`   | `'horizontal' \| 'vertical'`，`'horizontal'` | 轨道方向；纵向从下到上增大                          |
| `dir`           | `'ltr' \| 'rtl'`，`'ltr'`                    | 横向数值方向；纵向不受影响                          |
| `disabled`      | `boolean`，`false`                           | 禁止拖动与键盘改变，不参与 Tab                      |
| `valueText`     | 可选 `(value: number) => string`             | 为当前数值生成单位或业务解释，写入 `aria-valuetext` |
| `style`         | core `StyleValue<ViewStyles>`                | 覆盖外层布局样式                                    |
| `ref`           | core `CustomView` 的 `ref`                   | 取得绘制和交互所用节点                              |

`name` 不代替 Canvas 中的可见标签；应用按页面需要组合 `Text`、布局与说明。`valueText` 只补充语义值，不自动绘制文本。组件通过单个焦点代理表达 `role="slider"`、名称、当前值、范围、方向和说明，Canvas 绘制轨道、拇指与焦点状态。

## 数值与步长

合法值位于 `min + n * step` 的刻度上，先限制到范围再对齐。`max` 不在刻度上时，最大可选值是小于等于 `max` 的最后一个合法刻度。例如 `min=2, max=11, step=4` 的合法值为 `2`、`6`、`10`，End 到达 `10`。小数步长按同一规则处理。

`min`、`max`、输入值必须是有限数，范围不能倒置，`step` 必须为正有限数；无效配置抛出错误，不静默猜测业务范围。从 `min` 起的步进次数不能超过 `Number.MAX_SAFE_INTEGER`；步长过小、在该数值量级无法区分相邻刻度时也会拒绝该范围。`min === max` 时值固定在该点，可以聚焦但操作不会改变值或发送通知。

组件将当前输入值归一化到合法范围与刻度。受控模式的操作只请求新值，调用方可以接受、转换或拒绝；调用方未提交前，视觉与语义继续表达已提交值。非受控模式由内部持有最后一次值；后续修改 `defaultValue` 不会覆盖用户操作。挂载、范围变化及程序化 props 更新不发送 `onValueChange`。

响应式转发 `value`、范围、禁用等属性时保留 getter，避免解构或对象展开产生快照。事件回调接收数值，应用可按自己的业务时机持久化；组件不区分预览与提交两组回调。

## 指针与键盘

主指针在轨道按下后开始改变值，沿轨道拖动时持续请求合法值，移到轨道或 Canvas 外仍按边缘限制。指针释放、取消、失焦、禁用或节点销毁终止拖动并释放临时监听；取消保留最近值，不回滚到按下前的值。只在拖动期间安装拖动所需的全局监听，静止或禁用状态不持续跟踪指针。

Tab / Shift+Tab 进入或离开可用滑块；聚焦后使用下列按键：

| 按键                       | 行为                                       |
| -------------------------- | ------------------------------------------ |
| `ArrowRight` / `ArrowLeft` | LTR 中增大 / 减小一个步长；横向 RTL 时反转 |
| `ArrowUp` / `ArrowDown`    | 增大 / 减小一个步长，与横纵方向无关        |
| `Home`                     | 到达 `min`                                 |
| `End`                      | 到达最大合法刻度                           |

修饰键组合及输入法合成期间不处理数值快捷键，禁用时不改变值。键盘连续按键可逐步调整数值；到达边缘后重复操作不通知相同值。Slider 不使用 Enter / Space 激活按钮的行为。

指针坐标通过 Pixi 的逆世界变换转换为轨道局部坐标，支持嵌套 Pixi 缩放、旋转和倾斜，以及 Canvas 宿主轴对齐的 CSS 缩放。Canvas DOM 本身的 CSS 旋转/倾斜不在现有 Pixi 坐标映射的支持范围内；拖出 Canvas 后的持续移动也以同一网页 Document 为界，不承诺跨 iframe 或浏览器窗口外追踪。

## 主题与验证边界

轨道、已选范围、拇指、禁用外观和焦点状态复用 UI 主题 tokens。布局尺寸可通过 `style` 设置，纵向滑块应提供足够高度；自定义尺寸与颜色后检查触控目标、焦点环和对比度。组件不提供多拇指范围、标记刻度、数字编辑框或业务标签布局。

浏览器指针与键盘测试、DOM 范围属性检查只能证明相应交互和语义桥接。VoiceOver 等辅助技术的朗读、触屏探索、平台输入法及目标设备体验需单独验收，不能从构建成功或合成事件单测推断。焦点作用域与辅助技术边界见[焦点与语义桥接](/ui/focus)。
