# 文本布局排版

## 介绍

基于 pretext 的文本布局排版系统，通过 canvas 绘制，转为纹理进行渲染。支持文本样式、行距、字距、文本对齐等功能。

## pretext 1.0.0 升级说明

从 `0.0.7` 升级至 `1.0.0`（2026-10-14 发布），变更依据为上游
[Changelog](https://github.com/chenglou/pretext/blob/v1.0.0/CHANGELOG.md)。

- `0.0.8`、`0.0.9` 修复了长词、连字符和 Safari 软连字符断行；`1.0.0` 改用浏览器引擎的断行规则，富文本按整个段落分析，跨样式片段的单词和标点不再被随意拆开。
- 使用原生 `RichInlineBox`（`{ width }`）表示行内图片，删除 `\uFFFC`、微型字体与 `extraWidth` 占位方案。图片宽度不再额外包含占位字符的测量宽度，允许在图片前后断行。
- 将段落级 `whiteSpace: 'pre-wrap'`、`wordBreak: 'keep-all'` 交给 `prepareRichInline()`，分别支持保留空白/换行和中日韩文本保持词组；默认仍为普通空白折叠与断行。其他已有字符串值沿用默认断行行为。
- 保留的制表符单独交给 pretext 排版，绘制时按其制表位宽度前进，避免 Canvas 将制表符当作普通空格。拆分后的片段映射回原始内容项，保留样式和图片来源。
- 适配片段类型变化：本地截断与省略号使用只包含绘制信息的内部片段，不伪造 pretext 的 `sourceStart`/`sourceEnd` 或旧版 `start`/`end` 游标。省略号明确按文字绘制，即使被截断的行只有图片。布局游标仅交还 pretext，不解释其内部偏移。
- pretext 仍不提供行数截断、省略号、行高、基线或垂直对齐；这些逻辑以及 Canvas/Pixi 渲染继续由 Piant 负责。

上游兼容性事项：`1.0.0` 对无效字体和非有限字距抛出 `RangeError`，旧版 prepared handle 不能复用；本项目每个 Typesetter 都会重新 prepare，不持久化这些 handle。上游报告 rich-inline bundle 约为 44 KB gzip（`0.0.9` 约 16 KB），因此此次升级会增加打包体积。

上游也记录了独立零宽空格片段在超宽内容或行尾空白之后可能少占一行的限制，详见上述 Changelog 的 rich-inline 变更说明；本次保留已发布版本的行为。

## TODO

- [x] letter spacing
- [ ] break words
- [x] ellipsis（由 Piant 实现）
- [ ] decoration (underline, strikethrough)
