---
'@piant/core': patch
'@piant/animation': patch
---

Release Yoga nodes, owned Pixi graphics and containers, DOM inputs, and Text canvas textures on terminal subtree removal. Preserve resources during detach, reorder, cross-root moves, and pending exit transitions. Make node/root destroy recursively release the tree once, including after cleanup errors; low-level render disposers retain their existing owner-only behavior. Hosts should no longer manually free Yoga nodes after destroying a root.

Stop ScrollView's internal ticker on node destruction and expose an idempotent stop function from onTick. Keep animation helpers inert on destroyed nodes without reading released Pixi transforms.
