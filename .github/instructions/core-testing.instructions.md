---
description: 'Use when editing @piant/core runtime, components, reactivity, renderer, stylesheet, or tests. Enforces core test workflow and prefers one-shot Vitest validation before finishing changes.'
name: 'Core Testing Workflow'
applyTo: 'packages/core/**'
---

# Core Testing Workflow

- 修改 packages/core 下任何实现或测试后，优先使用单次测试命令进行验证：pnpm --filter @piant/core exec vitest run。
- 不要把 pnpm --filter @piant/core test 作为默认验证命令，因为该命令是 watch 模式，仅在用户明确要求持续监听时使用。
- 如果改动范围集中在某个测试文件，可先做定向单测：pnpm --filter @piant/core exec vitest run tests/<file>.test.ts；再根据改动风险决定是否追加全量单次测试。
- 变更了公共 API、核心行为（components/reactivity/renderer/styleSheet）或修复回归时，应补充或更新对应 Vitest 用例。
- 结束任务前，汇报已执行的测试命令和结果；若无法运行测试，明确说明阻塞原因与建议下一步。
