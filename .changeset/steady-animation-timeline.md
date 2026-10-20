---
'@piant/animation': patch
---

统一 currentTime 跳转与播放 tick 的本地时间轴，包含 delay 和 endDelay，并共享阶段求值及方向填充。跳回延迟或进入结束延迟时，未填充的属性恢复原值，且仅恢复本动画涉及的属性，避免无时间推进的帧发生跳变；保留 seek 不改变 playState 和 finished 的兼容行为，补充时间轴文档与回归测试。
