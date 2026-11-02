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

The checks use real Pixi renderers and native Inputs for ancestor clipping, Canvas/Input occlusion and hit testing, viewport edge positioning, CSS/Pixi scaling, Canvas and document scrolling, available height, focus traversal/restoration, nested dismissal, independent sibling lifetimes, overlapping foreign surfaces and external native popovers, instance isolation, rapid cancellation, reactive context and teardown. The IME check uses Chrome's `Input.imeSetComposition` protocol; it does not validate an operating system candidate window or VoiceOver.

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

## Dialog and AlertDialog

Start the docs server with `pnpm docs:dev --host 127.0.0.1` and the fixture server above, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/dialogVerify.mjs
```

`DIALOG_TEST_URL` defaults to `http://127.0.0.1:5173/ui/dialogs`, `DIALOG_FIXTURE_URL` to `http://127.0.0.1:4177/dialog.html`, and `DIALOG_EVIDENCE_DIR` to `/tmp/piant-cod166`. The script records screenshots, the Chrome AX tree, interaction checks and limitations. It covers native TextField initial focus/selection, keyboard and real Canvas pointer paths, nested restoration, rejected controlled requests, background blocking, safe trigger removal, Cancel/Confirm semantics, CDP composition, narrow/overflow layouts, theme/density/font scaling, reduced motion and teardown/remount. OS Chinese input method candidate windows and VoiceOver are separate follow-ups (COD-179/COD-180). Instance-only interaction blocking deliberately uses `aria-modal="false"`, rather than claiming document-wide modality.

After `pnpm --filter @piant/ui verify:package`, serve its reported `consumer/dist` directory with `python3 -m http.server 4188 --bind 127.0.0.1 --directory /path/to/consumer/dist`. Run `node packages/ui/browser-tests/dialogPackageVerify.mjs` with the same `PLAYWRIGHT_MODULE`. `DIALOG_PACKAGE_TEST_URL` defaults to `http://127.0.0.1:4188/dialogs.html`. This checks executable public exports, Dialog focus/Tab/restoration, AlertDialog safe initial focus and real Canvas confirmation, and live unmount from the production consumer. It writes `packed-browser-results.json` and a screenshot alongside the other evidence. It validates local tarballs, not an npm registry release.

## Popover and Tooltip

Start `pnpm docs:dev --host 127.0.0.1` and the fixture server above, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/popoverTooltipVerify.mjs
```

`FLOATING_DOCS_URL` defaults to `http://127.0.0.1:5173/ui/popovers`, `FLOATING_FIXTURE_URL` to `http://127.0.0.1:4177/popoverTooltip.html`, and `FLOATING_EVIDENCE_DIR` to `/tmp/piant-cod167`. The script records actual mouse/keyboard/touch paths, nonmodal Tab exits, nested Tooltip/Popover/Dialog routing, controlled refusal, scroll/CSS and Pixi scaling, viewport edges, content measurement, text editing/selection, timers and owner teardown/remount. Screenshots, Chrome AX trees, runtime errors, resource errors and a completion flag are saved. OS candidate windows and VoiceOver remain COD-179/COD-180; CDP composition and AX trees do not certify them.

After `pnpm --filter @piant/ui verify:package`, serve its reported `consumer/dist` directory on port 4188 and run `node packages/ui/browser-tests/popoverTooltipPackageVerify.mjs` with the same `PLAYWRIGHT_MODULE`. `FLOATING_PACKAGE_URL` defaults to `http://127.0.0.1:4188/popoverTooltip.html`. The production consumer checks public exports/types, actual Trigger toggling, Tab exits, Tooltip descriptions, ordinary Button actions and unmount. Local tarballs are not registry release verification.

## Menu and Select

Start the fixture server above, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/menuSelectVerify.mjs
```

For the two independent documentation examples, also start `pnpm docs:dev --host 127.0.0.1` and run `node packages/ui/browser-tests/menuSelectDocsVerify.mjs` with the same Playwright/output variables. `MENU_SELECT_DOCS_URL` defaults to `http://127.0.0.1:5173/ui/menu-select`; checks include committed AX values, rejected close focus, nested Menu and both examples at a 390px viewport with dark/compact/200% font scale. The log records the existing docs favicon 404 separately from component failures.

`MENU_SELECT_FIXTURE_URL` defaults to `http://127.0.0.1:4177/menuSelect.html`; `MENU_SELECT_EVIDENCE_DIR` defaults to `/tmp/piant-cod168`. The real Chrome fixture covers Canvas mouse/touch gestures, keyboard boundaries and typeahead, disabled items, controlled rejection and retained focus, an 80-option list with automatic reveal, keyed changes, 200% typography, empty data, nested Dialogs, instance isolation, initially open popups and four owner teardown/remount cycles. It saves screenshots, actual AX trees, runtime/resource errors and a completion flag. Composition-marked events and CDP are limited evidence; actual OS IME and VoiceOver remain COD-179/COD-180.

After `pnpm --filter @piant/ui verify:package`, serve its reported `consumer/dist` directory on port 4188 and run `node packages/ui/browser-tests/menuSelectPackageVerify.mjs` with the same `PLAYWRIGHT_MODULE`. `MENU_SELECT_PACKAGE_URL` defaults to `http://127.0.0.1:4188/menuSelect.html`. This checks the Menu/Select root exports and installed declarations, real production interactions, native roles/value relationships and live unmount. It validates local tarballs, not a registry release.
