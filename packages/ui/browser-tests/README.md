# Overlay browser regression

Use a Node version matching the repository engines. Build core and UI, then start the fixture:

```sh
pnpm --filter @piant/core build
pnpm --filter @piant/ui build
pnpm --dir docs exec vite --config ../packages/ui/browser-tests/vite.config.mjs
```

With an already installed Playwright module and Chrome available, run in another terminal:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/verify.mjs
```

`PLAYWRIGHT_MODULE` defaults to `playwright`; `OVERLAY_TEST_URL` defaults to `http://127.0.0.1:4177`. Screenshots and the JSON check log are written to `OVERLAY_EVIDENCE_DIR` (default `/tmp/piant-cod165`). The fixture also supports manual inspection in a browser.

The checks use real Pixi renderers and native Inputs for ancestor clipping, Canvas/Input occlusion and hit testing, viewport edge positioning, CSS/Pixi scaling, Canvas and document scrolling, available height, focus traversal/restoration, nested dismissal, instance isolation, rapid cancellation, reactive context and teardown. The IME check uses Chrome's `Input.imeSetComposition` protocol; it does not validate an operating system candidate window or VoiceOver.
