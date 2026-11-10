# macOS 原生 IME / VoiceOver 验收记录

状态：部分 IME 已实测；用户现场确认听到了测试页控件的真实 VoiceOver 朗读，逐项输出与导航/激活仍待补验。两项均未整体通过。

- 提交：72276d3ece660cffc5a8a6e314f1e38d732f3376；PR https://github.com/sumy7/piant/pull/47。
- 系统：macOS 27.3，26C5035r。
- 浏览器：原生 Google Chrome 156.0.8078.81。
- 输入法：Apple 简体拼音 com.apple.inputmethod.SCIM.ITABC；SCIM.app 版本 104。
- VoiceOver：10。
- 产物：该提交重新执行 pnpm pages:build，通过；本机 http://127.0.0.1:4179。
- 操作与观察者：Codex 通过受支持的 CUA 原生 App 按键/鼠标与 AX 状态观察。未用 CDP composition、粘贴中文、AppleScript、配置写入或其他事件注入模拟候选。
- 本轮临时 QA 包装页以 iframe 加载生产页面，仅记录原生事件及显式快照。原始事件 JSON 保存在 [COD-179 的 Resources](https://linear.app/codepuppies/issue/COD-179)，不随公开文档站发布。

复现时执行 `pnpm pages:build`，再运行 `python3 -m http.server 4179 --bind 127.0.0.1 --directory docs/.vitepress/dist`。原生 Chrome 使用 `/examples/ui-smoke/textFields.html`、`/examples/ui-smoke/focus.html` 与 `/examples/ui-gallery/`，按以下输入序列操作。测试页已有事件与业务计数输出。

## 已观察的真实 IME 用例

1. TextField 受控“显示名称”输入 c/e/s/h/i，实际发生 compositionstart/update，输入值为 ce shi。按 Return 后 compositionend.data=ceshi，业务 submits 仍为 0。Apple 拼音本次 Return 确认拉丁拼音文本。合成结束后再按 Return，submits 才变为 1。
2. 受控字段输入 n/i/h/a/o，实际发生合成；按空格后 compositionend.data=你好，最终值“你好”，submits 仍为 1。
3. 在“你好”后输入 z/h/o/n/g，按 Escape 后 compositionend.data 为空，值回到“你好”，submits 仍为 1。
4. 再输入 z/h/o/n/g/w/e/n，在合成期间点击 Theme、Density、Text 200%。节点创建次数 creations=1、字段工厂 factories=2、retained=true，字段仍保持焦点。该平台鼠标外观操作结束了合成，提交了 zhong wen 原文；之后数字 1 是普通文本，不能记作候选选择。未声称候选窗跨外观操作持续显示。
5. 非受控“昵称”输入 z/h/o/n/g/w/e/n 后按 2，compositionend.data=中文版，字段值 Piant中文版；点击 Change default 后保持此编辑值。
6. 实际受控 input 事件 27 次，对应 fixture inputEvents=27 与 valueEvents=27；合成 start/end 各 4 次。唯一业务提交对应合成结束后的独立 Return。原始逐事件数据见 COD-179 Resources 中的 `ime-events-72276d3.json`；其中昵称合成另记录。

候选选择已得到中文，但当前 App 截图未捕获独立系统候选窗口，候选窗口实际外观与位置仍待人工观察或受支持的截图入口。普通字段的原生按键结果与真实 composition 序列已记录，不以这些结果代替未观察的候选窗口外观。

## VoiceOver 尝试与具体限制

- 通过系统设置的旁白开关与首次启动界面启用了真实 VoiceOver；观察到 VoiceOver.app 进程运行。
- 原生工具进入旁白教程后关闭教程，返回 Chrome focus 测试页。
- 尝试 Control+Option+Right 导航、Control+Option+Shift+C 复制刚朗读短语。随后粘贴到仅在本机的记录文本框，仍为预置 VO-COPY-NOT-OBSERVED，没有取得实际 VoiceOver 短语；未据 AX 树判断读屏通过。
- 用户现场明确确认“听到了测试页控件的朗读”，因此实际发声已有人工听觉证据，详见下方补充。自动化没有提取短语不表示没有朗读。
- 后续用 Tab 将焦点移到 Canvas action A，发送 VO+Space 后业务计数仍为 0。此次工具操作未验证辅助技术激活，尚不足以归因于控件；单次激活继续待补验。
- 受支持的 CUA 对 VoiceOver 本体、TextInputMenuAgent、ControlCenter 的窗口入口尝试超时；这些是工具观察/控制限制，不是控件或 macOS 权限拒绝结论。
- 退出原生 VoiceOver 尝试时，通过系统设置确认开关恢复 off；未修改用户字幕、语音或安全设置。
- 启停后 Chrome 输入为英文直输；TextField 普通字段与模态字段均无合成。对照不支持归因于模态组件。当前入口不接受单独 Shift（返回 keyPressIncludedNoNonModifierKeys），Ctrl+Space 未恢复中文；已请用户实际切回简体拼音并进行一次 VoiceOver 原生操作。

## 待补验，不能勾选完成

- 候选窗口实际显示、位置与选择过程的人类/系统窗口证据。
- Core Input 受控接受/拒绝、完整只读/禁用边界，实际系统候选覆盖。
- Gallery A/B 中文编辑、明确保存及卸载/重挂载的系统输入法覆盖。
- 同 Canvas 模态输入中的真实候选、Enter/Escape 隔离与关闭恢复。
- VoiceOver role/name/description、checked/mixed、expanded、范围与值文本的实际读出。
- Field 必填/错误/说明、组内导航、辅助技术单次激活、状态/进度、动态禁用/移除及卸载。

后续人工步骤已在聊天请求：真实键盘在显示名称输入 nihao+空格并确认候选；启用 VoiceOver，在 focus.html 上导航到 Canvas action A，VO+Space 一次，记录原文朗读与 activations。

官方步骤参考：

- https://support.apple.com/guide/voiceover/turn-voiceover-on-or-off-vo2682/10/mac/27
- https://support.apple.com/guide/voiceover/repeat-copy-or-save-the-last-spoken-phrase-vo2725/10/mac/27

## 用户现场听觉确认补充

用户明确反馈“刚才你操作的时候都已经听到了”，并进一步确认“听到了测试页控件的朗读”。观察者：本机用户；同一提交与环境。因此真实测试页控件朗读已有人工听觉证据。自动化未能复制短语仅为取证限制，不表示未发声。尚未提供逐控件原文或激活次数，继续补验。
