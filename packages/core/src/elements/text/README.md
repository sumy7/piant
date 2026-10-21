# 文本布局排版

## 介绍

基于 pretext 的文本布局排版系统，通过 canvas 绘制，转为纹理进行渲染。支持文本样式、行距、字距、文本对齐等功能。

## 排版实现与边界

- pretext 按整个段落分析断行，跨样式片段的单词和标点参与同一次布局。
- 使用 `RichInlineBox`（`{ width }`）表示行内图片，按图片实际宽度参与布局，允许在图片前后断行。
- 将段落级 `whiteSpace: 'pre-wrap'`、`wordBreak: 'keep-all'` 交给 `prepareRichInline()`，分别支持保留空白/换行和中日韩文本保持词组；默认使用普通空白折叠与断行。
- 保留的制表符单独交给 pretext 排版，绘制时按其制表位宽度前进，避免 Canvas 将制表符当作普通空格。拆分后的片段映射回原始内容项，保留样式和图片来源。
- 本地截断与省略号使用只包含绘制信息的内部片段。省略号按文字绘制，即使被截断的行只有图片。布局游标仅交还 pretext，不解释其内部偏移。
- 行数截断、省略号、行高、基线、垂直对齐以及 Canvas/Pixi 渲染由 Piant 负责。

pretext 对 Canvas 无法识别的字体字符串和非有限字距抛出 `RangeError`。每个 Typesetter 独立 prepare 文本，不持久化 prepared handle。

布局限制：独立零宽空格片段在超宽内容或行尾空白之后可能少占一行。

## TODO

- [x] letter spacing
- [x] 基础自动断行与 `keep-all`（`normal` / 兼容值 `break-word` 使用默认断行）
- [x] ellipsis（由 Piant 实现）
- [ ] decoration (underline, strikethrough)，见 [COD-132](https://linear.app/codepuppies/issue/COD-132)

断行范围：段落级 `wordBreak` 仅将 `keep-all` 作为独立模式，其余字符串（包括 `break-all`）均回退到 pretext 的 `normal`；尚未提供独立 CSS `break-all` / `break-word` 语义。`whiteSpace` 支持 `normal` / `pre-wrap`。样式类型接受字符串不代表实现了对应 CSS 模式。

依据：[Typesetter](./index.ts)、[断行回归测试](../../../tests/typesetter.test.ts)、[绘制回归测试](../../../tests/typesetter.renderTo.test.ts)。用法与限制见 [Text 指南](../../../../../docs/guide/components/text.md)；[Roadmap](../../../../../TODO.md) 中的视觉验收仍待执行。
