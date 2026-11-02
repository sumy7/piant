---
'@piant/ui': minor
'@piant/core': patch
---

Add Dialog and AlertDialog composition APIs with controlled and uncontrolled state, linked title and description semantics, explicit close/cancel/confirm actions, one-time initial focus and instance-scoped overlay lifecycles. Include independent live examples and document modal scope, input composition and assistive technology verification boundaries.

Keep renderer teardown safe when a Canvas pointer handler synchronously unmounts its application, so Pixi cannot update a detached event target cursor after a dialog action.
