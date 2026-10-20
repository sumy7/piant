---
'@piant/core': patch
---

Fix Image objectFit by fitting from unscaled source bounds on every layout, restoring Graphics dimensions after fit changes, and clipping cover images to the rounded layout box without changing child overflow. Release owned clipping resources while preserving borrowed sources and textures.
