---
'@piant/core': patch
'@piant/devtools': minor
---

Add opt-in development tools hosted as a TanStack Devtools plugin in an in-page dock, with an element inspector, transform-aware selection highlight, read-only state snapshots, bounded layout/frame diagnostics, and explicit animation observations. Expose root layout lifecycle observations and document development-only integration and cleanup. Pause automatic Piant sampling and clear highlights while the dock is collapsed; disconnecting removes the session and TanStack shell.
