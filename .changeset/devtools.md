---
'@piant/core': patch
'@piant/devtools': minor
---

Add opt-in development tools in a single-layer Piant page dock built on `@tanstack/devtools-ui`, with a searchable element inspector, transform-aware selection highlight, typed read-only state, bounded layout/frame diagnostics, and explicit animation observations. Retain the Elements, State, Performance and Animations views.

Piant manages the launcher, resizing, theme and lifecycle without the TanStack workbench or event bus. Collapsing preserves browsing state, pauses sampling and clears selection/highlights. Persist only height and theme; honor `defaultOpen` on each attachment. Disconnecting removes Solid roots and panel resources.

Expose root layout lifecycle observations and document development-only dynamic imports and cleanup.
