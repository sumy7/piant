---
'@piant/core': patch
---

Flush pending element and layout changes before Pixi draws so switching content does not produce a blank frame when application and layout tickers run independently.
