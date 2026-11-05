# ColorPicker

用色板、滑块或十六进制输入为图层、边框等对象选择颜色。把 ColorPicker 放在 [UIProvider](./theme) 的 [OverlayHost](./overlays) 中。

<LiveExample example="uiColorPicker" title="ColorPicker：色域、通道、透明度与 Hex 草稿" :height="760" hide-source />

打开填充色，拖动色板或输入 `#f80`，按 Enter 应用颜色。

## 基本用法

```tsx
import { createState } from '@piant/core';
import { ColorPicker } from '@piant/ui';

function LayerColor() {
  const [fill, setFill] = createState('#3366ffff');
  return <ColorPicker label="填充色" value={fill()} onValueChange={setFill} />;
}
```

## 颜色格式与受控值

支持 `#rgb`、`#rgba`、`#rrggbb` 和 `#rrggbbaa`。输出为小写八位 Hex，设置 `alpha={false}` 后输出六位 Hex。命名色与 RGB/HSL 函数不在输入格式内。

用 `defaultValue` 设置初始颜色，默认 `'#3366ffff'`。应用保存颜色时，传入 `value` 并在 `onValueChange` 中更新。色板与滑块即时改变颜色，关闭面板会保留已接受的值。

## Hex 与数字草稿

Enter 或失焦提交有效的 Hex 或数字。无效输入恢复为当前值。在 Hex 草稿中按 Escape 先恢复原值，再按一次关闭面板。色板支持方向键调整饱和度与亮度，也可直接编辑数值字段。

## 属性

| 属性                                    | 用法                                       |
| --------------------------------------- | ------------------------------------------ |
| `label`                                 | 必填，为颜色按钮和通道提供名称。           |
| `alpha`                                 | 默认 `true`，允许调整透明度。              |
| `readOnly` / `disabled`                 | 只读时可以打开并复制颜色，禁用时不能打开。 |
| `open` / `defaultOpen` / `onOpenChange` | 控制或监听面板展开，默认关闭。             |
| `popupWidth` / `popupHeight`            | 默认 360 / 520，受可视空间约束。           |
