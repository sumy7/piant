---
'@piant/ui': minor
'@piant/core': minor
---

Add instance-scoped OverlayHost, retained overlay state, viewport positioning and Canvas anchor bindings. Overlay surfaces preserve their creation context, escape ancestor clipping through the browser Popover API, and coordinate dismissal, modal input restrictions and focus restoration within their own mount.

Expose owner binding and mounted-surface context from core for independently mounted visual surfaces, with explicit lifecycle ownership.
