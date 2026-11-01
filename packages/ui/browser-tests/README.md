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

## Slider

The same fixture server provides `/slider.html`. Run its checks with:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/sliderVerify.mjs
```

`SLIDER_TEST_URL` defaults to `http://127.0.0.1:4177/slider.html`; `SLIDER_EVIDENCE_DIR` defaults to `/tmp/piant-cod163`. Screenshots and a JSON log cover actual mouse track/drag interactions, decimal steps and boundaries, thumb grab offset, outside-Canvas release, combined CSS scaling and nested Pixi scale/rotation/skew, controlled rejection, keyboard/RTL/vertical semantics, disabled/blur/modal cancellation, independent instances and unmount during drag. The native `pointercancel` signal and window blur are dispatched in the browser to verify cleanup; they do not simulate every hardware interruption. OS input method and assistive technology tests are separate.

## Tabs, Collapsible and Accordion

Start the documentation examples with `pnpm docs:dev --host 127.0.0.1`, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/containersVerify.mjs
```

`CONTAINERS_TEST_URL` defaults to `http://127.0.0.1:5173/ui/containers`; `CONTAINERS_EVIDENCE_DIR` defaults to `/tmp/piant-cod164`. Checks cover native Tab/Shift+Tab paths, automatic/manual activation, keyed reorder/removal, disabled headers, single/multiple expansion, retained and recreated inputs, hidden focus rejection, input hit positions and example teardown/remount. The script saves screenshots, a JSON check log and the actual Chrome accessibility tree. AX inspection does not establish VoiceOver reading or navigation results.
