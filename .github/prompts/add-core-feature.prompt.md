---
description: 'Use when adding or changing a @piant/core feature with a repeatable flow: implement change, add/update tests, and update docs in one pass.'
name: 'Add Core Feature'
argument-hint: '功能目标 + 涉及模块 + 验收标准（可选：风险点）'
agent: 'agent'
---

你正在为 `@piant/core` 执行一次“改功能 → 补测试 → 更新文档”的完整交付流程。

## 输入参数

用户会提供：$ARGUMENTS
请先从参数中提取以下信息；若缺失则先做最小合理假设并在结果中声明：

- 功能目标（要改什么）
- 影响范围（如 components / reactivity / renderer / styleSheet）
- 验收标准（行为、边界条件、兼容性）
- 风险点（可选）

## 执行要求

1. 先阅读并遵循以下约束文件：

- [AGENTS.md](../../AGENTS.md)
- [core-testing.instructions.md](../instructions/core-testing.instructions.md)

2. 代码改动阶段：

- 仅做与目标相关的最小改动，避免无关重构。
- 保持现有 TypeScript 风格与命名约定。
- 涉及 PixiJS API 时，优先参考 https://pixijs.com/llms.txt。

3. 测试阶段（必须）：

- 为变更补充或更新 Vitest 用例，优先放在 packages/core/tests 下对应领域。
- 默认使用单次测试命令进行验证，不以 watch 命令作为收尾：
  - 推荐：pnpm --filter @piant/core exec vitest run
- 若范围较小，可先定向单测，再按风险决定是否补全量单次测试。

4. 文档阶段（按影响更新）：

- 若改动影响公开 API、行为语义或示例用法，更新 docs 中对应文档。
- 优先更新：
  - docs/reference/components.md
  - docs/reference/reactivity.md
  - docs/reference/renderer.md
  - docs/reference/stylesheet.md
  - docs/guide/components/\*.md
  - docs/guide/reactivity.md
- 文档采用“Link, don’t embed”原则，避免复制大段已有说明。

## 输出格式

请按以下结构输出：

1. 变更摘要：本次实现了什么，行为如何变化。
2. 代码改动清单：按文件列出关键改动点。
3. 测试改动与结果：

- 新增/更新了哪些用例
- 执行了哪些测试命令
- 测试结果（通过/失败；若失败写明原因）

4. 文档改动清单：更新了哪些文档及原因。
5. 风险与后续建议：可选的补充验证项。

## 质量门槛

- 没有测试更新且改动涉及行为变化时，不应直接结束。
- 没有说明测试命令与结果时，不应给出“完成”结论。
- 如无法运行测试，必须明确阻塞原因与建议下一步。
