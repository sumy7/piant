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

## Toast

Start the fixture server above, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/toastVerify.mjs
```

Start `pnpm docs:dev --host 127.0.0.1` and run `node packages/ui/browser-tests/toastDocsVerify.mjs` with the same Playwright/output variables to verify the online example; `TOAST_DOCS_URL` defaults to `http://127.0.0.1:5173/ui/toast`. It covers bounded queues, upsert, real keyboard action/dismiss, narrow 200% layouts and Provider remount.

`TOAST_FIXTURE_URL` defaults to `http://127.0.0.1:4177/toast.html`; `TOAST_EVIDENCE_DIR` defaults to `/tmp/piant-cod169`. The real Chrome checks cover input focus/selection, stable status/alert channels and AX, FIFO limits and upsert, action/dismiss pointer and keyboard paths, action replacement during a held gesture, hover/focus timeout pauses, keyboard scrolling at 200% font scale, viewport/provider teardown, parent Dialog routing and independent instances. Timed notifications are explicitly enabled; the default is persistent. The viewport lives in its retained Canvas tree and respects ancestor clipping and modal inertness. Chrome AX and simulated events do not certify VoiceOver or system IME (COD-179/COD-180).

After `pnpm --filter @piant/ui verify:package`, serve its reported `consumer/dist` directory on port 4188 and run `node packages/ui/browser-tests/toastPackageVerify.mjs` with the same Playwright/output variables. `TOAST_PACKAGE_URL` defaults to `http://127.0.0.1:4188/toast.html`. This validates locally packed public API/types and production interactions, not an npm registry release.

## Composed overlay workflow and release checks

Build core/UI first, then run `pnpm --filter @piant/examples-ui-gallery dev --host 127.0.0.1 --port 4190`. The `/workflow` entry and the documentation `/ui/workflow` share `examples/ui-gallery/src/OverlayWorkflow.tsx`. Do not rebuild dependency `dist` directories during a live browser run; restart the development server after a dependency rebuild if its resolver cached missing outputs.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/workflowVerify.mjs
```

`WORKFLOW_URL` defaults to `http://127.0.0.1:4190/workflow`; `WORKFLOW_EVIDENCE_DIR` defaults to `/tmp/piant-cod170/workflow`. The same script runs against the standalone production `workflow.html` and the isolated tarball consumer's `workflow.html`. It covers document/Popover native editing, Menu/Select commit and disabled states, safe AlertDialog cancellation and confirmation, Toast undo, background gesture consumption, two instance modals, native hit geometry during page/CSS scaling, narrow 200% keyboard scrolling and repeated live teardown.

After `pnpm docs:build`, serve `docs/.vitepress/dist` on port 5173 and run `node packages/ui/browser-tests/workflowDocsVerify.mjs` with `PLAYWRIGHT_MODULE`. `WORKFLOW_DOCS_URL` defaults to `http://127.0.0.1:5173/ui/workflow.html`, and `WORKFLOW_DOCS_EVIDENCE_DIR` to `/tmp/piant-cod170/docs`. It checks the actual online example's nested keyboard flow, save/undo, appearance changes and scene unmount/remount.

After `verify:package`, serve the reported `consumer/dist` on port 4188 and set `WORKFLOW_URL=http://127.0.0.1:4188/workflow.html` to validate the composed workflow against installed tarballs. The verification script checks the original shared TSX against installed declarations and precompiles its executable JavaScript before copying; consumers still load executable UI JavaScript without compiling dependency JSX. Public imports, core/MobX identity and tree-shaking are checked separately.

Serve the same consumer's `dist-tree` directory on port 4189 and run `node packages/ui/browser-tests/unusedUiVerify.mjs` with `PLAYWRIGHT_MODULE`; `UNUSED_UI_URL` defaults to `http://127.0.0.1:4189/`, and `UNUSED_UI_EVIDENCE_DIR` to `/tmp/piant-cod170/unused-ui`. This checks the production core-only consumer for absent UI DOM/keyboard interception and intact external native editing. Core retains its own initialization semantics.

The mandatory Tooltip regression can also be run alone with `pnpm --filter @piant/ui exec vitest run tests/tooltip.test.ts -t "four instances"`. It disposes four simultaneously open Dialog/Tooltip trees using the GPU-free fixture. Core style bindings stop on node destruction as well as owner cleanup, preventing parent focus/pressed cleanup from writing into already-freed child Yoga nodes. The core lifecycle test intercepts invalid writes in its failing pre-fix case so it does not corrupt the test process. Diagnostic archives and baseline provenance belong in the issue/MR evidence, alongside fresh isolated and combined results.

Actual OS IME candidate windows and VoiceOver remain COD-179/COD-180. CDP composition, Unicode input and Chrome AX inspection are recorded separately and do not establish either native acceptance result. Instance-scoped modals use `aria-modal="false"` and do not block other Canvas instances or external page DOM.

## SearchField, NumberField, SplitPane and Combobox

Use Node matching the repository engines (for example `volta run --node 24.12.0 pnpm ...`). Run the fixture server above and then:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node packages/ui/browser-tests/toolsVerify.mjs
```

`TOOLS_URL` defaults to `http://127.0.0.1:4177/tools.html`; `TOOLS_EVIDENCE_DIR` defaults to `/tmp/piant-cod171/browser`. The two tool panels share `examples/ui-gallery/src/ToolPanel.ts` with the online docs. Checks cover Chinese CDP composition and Enter/Escape protection, explicit search clear/focus, temporary numerical strings and commit/blur/decimal steps/ranges/null, real mouse/touch divider drags, scaled coordinates, outside release/cancel, keyboard constraints and container resize restoration, editable filtering/selection/cancellation/empty candidates, active descendant/AX associations, dark/compact/200% typography, narrow containers, instance isolation and live teardown/remount. JSON logs, screenshots and Chrome's AX tree are saved under the evidence directory. `pointercancel` is dispatched; mouse/touch movement uses actual Chrome input.

After `pnpm docs:build`, serve `docs/.vitepress/dist` on port4192 and run `toolsDocsVerify.mjs` with `PLAYWRIGHT_MODULE`. Override `TOOLS_DOCS_URL` and `TOOLS_DOCS_EVIDENCE_DIR` as needed. This executes all four independent production examples and the composed online tool panel, including dynamic empty options and remount.

After `pnpm --filter @piant/ui verify:package`, serve the reported `consumer/dist` on port4193 and run the same `toolsVerify.mjs` with `TOOLS_URL=http://127.0.0.1:4193/tools.html` and a separate `TOOLS_EVIDENCE_DIR`. The tool panel is typechecked and compiled against isolated, strictly installed local tarballs; public runtime exports, one core/MobX installation and unused component elimination are checked by the package verifier. This is local release-preview evidence, not an npm registry release.

CDP composition and Chrome AX do not establish actual operating system Chinese candidate-window behavior or VoiceOver reading/navigation. Those remain separate platform acceptance checks. Numerical parsing supports decimal-point notation; split sizes are logical pixels; Combobox is local single selection without virtualization or remote candidates. See each component's API page for precise contracts.
