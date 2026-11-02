---
'@piant/core': patch
---

Release component style reactions when their retained node is destroyed, while keeping unrelated owner reactions alive. This prevents parent cleanup from applying reactive styles to already-freed Yoga nodes during nested UI teardown.
