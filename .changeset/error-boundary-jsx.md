---
'@piant/core': patch
---

Defer JSX ErrorBoundary children until its isolated error scope is installed. Dispose failed reactive subtrees and create fresh children on reset, while keeping sibling boundaries independent and forwarding fallback errors to the parent boundary.
