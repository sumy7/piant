---
'@piant/animation': patch
---

修复 backgroundColor 的 ColorSource 动画插值：通过 Pixi Color 统一解析数值、字符串、数组、颜色对象及 Color 实例，支持混合输入和透明度，复制输入避免修改调用者状态，并在创建动画时明确拒绝无效颜色。
