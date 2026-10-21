# Design

## Source of truth

Status: Active. Date: 2026-10-22. Scope: the single-layer Piant page-embedded panel. User direction: use `@tanstack/devtools-ui` as the UI foundation, remove the TanStack workbench, retain the four Piant views, and add canvas element picking. Evidence: `packages/devtools/src/panel.ts`, `inspector.ts`, `picker.ts`, `types.ts`, behavior tests, and browser screenshots; [TanStack package overview](https://tanstack.com/devtools/latest/docs/overview) separates the shared Solid.js UI library from the full workbench; [Vue Devtools Components and Timeline](https://devtools.vuejs.org/getting-started/features#components) inspected in the official documentation. The existing inspector design and interactions remain the baseline; no new image assets are required.

## Brand

Precise, calm, technical. Piant identity remains distinct; borrow Vue Devtools' compact tree/detail structure and typed property presentation. Avoid oversized buttons, decorative gradients, raw JSON walls, and implying unsupported component tracking or editing.

## Product goals

Find an element from the tree or canvas, understand its place in the tree, inspect its geometry/style, and read application state or diagnostics without losing context. Success: useful content at a 400px dock height, clear selection/highlight, searchable/collapsible tree, readable values, and unchanged lifecycle/production exclusion. No state editing, component ownership tracking or remote inspection. Replace the workbench dependency with `@tanstack/devtools-ui` and its Solid.js runtime.

## Personas and jobs

Piant developers debugging a live Canvas application. They need to move between rendered elements, state and update metrics while the application keeps running.

## Information architecture

A compact toolbar with Piant identity, “Select element from canvas” toggle, Elements / State / Performance / Animations navigation, live connection status, theme, refresh, collapse and disconnect. The bottom-right “Open Piant DevTools” button opens the panel directly; no outer plugin navigation or second toolbar. Elements uses a searchable tree on the left and selected-node header, breadcrumb and grouped Layout / Style / Transform properties on the right. State uses typed read-only property rows. Performance shows labeled numeric metrics and bounded layout update history. Animations lists explicitly registered handles with playback status and observed statistics.

## Design principles

Show hierarchy before detail. Use progressive disclosure for nested values. Keep controls and selected context stable across samples. Use actual snapshot fields only. Label PNode element inspection clearly; no component ownership, source-file or editable-state affordances.

## Visual language

Neutral charcoal surfaces with a restrained emerald selection accent, 1px separators and 4–6px radii. Light theme uses matching light neutral surfaces and sufficient contrast. System sans-serif for navigation; monospace for node names, property keys and values. Compact 26–30px rows, 8–12px gaps and 12–13px type. Numbers, strings, booleans and null have distinct readable colors. Use small code-native SVG icons; no image assets or icon package. Motion is optional and subtle.

## Components

`@tanstack/devtools-ui` 0.7.1 provides shared Solid.js UI primitives and theme foundations. Piant owns the fixed bottom dock, launcher, resize handle and single inspector toolbar, plus search, tree rows, disclosure controls, breadcrumb, property groups, metric tiles, event rows and empty states. Inspector CSS tokens live in its Shadow DOM and follow the Piant theme control. Reuse the existing snapshot and callbacks rather than adding observation layers.

## Accessibility

Native buttons and search input, accessible labels, keyboard focus indicators, selected/tab semantics, and keyboard-operable disclosures. Color is reinforced with labels. Search has an explicit no-results state. Read-only values must remain selectable. Keyboard actions must not intercept unrelated application input. Honor reduced-motion preferences. The resize separator supports Arrow Up to increase height, Arrow Down to decrease it, Home for minimum height and End for maximum height. Give launcher, theme, picker and collapse controls explicit accessible names. Expose the picker toggle with `aria-pressed`; Escape cancels picking and preserves the previous selection.

## Responsive behavior

Desktop: two independently scrollable panes with approximately 35% tree / 65% details. Small widths: constrained columns and horizontal overflow only for inherently long values, with wrapping labels and readable controls. Piant owns one viewport-fixed bottom panel and does not resize the business layout. Drag its top edge to adjust height; clamp height again when the viewport resizes. `mount` is the actual DOM host, so use `document.body` or a container without transformed ancestors to preserve viewport positioning.

## Interaction states

Initial Elements view has a deliberate selection empty state. Starting the picker changes the canvas cursor to crosshair; hovering previews a highlight without changing selection. Clicking a candidate confirms the topmost/deepest matching PNode and exits picking. Confirming opens Elements, clears its filter, expands only the target’s ancestors and scrolls the target into view once. Other collapsed branches remain intact. Picker-mode primary canvas pointer/mouse/click events are consumed before reaching application interactions; normal input resumes outside the mode. Escape cancels and restores the previous selection highlight. Collapse and teardown cancel picking and release its cursor and listeners. Tree search retains matching ancestor context; collapse is persistent across sampling, while searching reveals matches. Missing selection after removal returns to the empty state. Empty state, timeline and animation data have helpful text. Snapshot error/unsupported/truncation markers remain visible. Collapse retains the inspector DOM, active view, filter and disclosures while pausing automatic sampling and clearing selection/highlight. Reopen refreshes data and resumes sampling. Persist only height and theme under the private `piant-devtools-panel:v1` storage key; malformed or unavailable storage falls back safely. `defaultOpen` applies on every attachment and is never overridden by saved open state. Disconnect, immediate detach, root destruction and app teardown remove Solid roots, DOM, listeners and observations. Initialization creates the DOM synchronously; sampling activates in a cancellable microtask, while initial snapshots and selection remain synchronously available.

## Content voice

Short developer-facing English labels, consistent with the current example and Piant panel. Explain actual units and boundaries close to metrics: CPU layout duration, Ticker frame interval and observed animation frames. State is explicitly read-only.

## Implementation constraints

TypeScript, native inspector DOM and Solid.js mounting for `@tanstack/devtools-ui`; no React/Vue adapter, full `@tanstack/devtools` workbench, event bus, remote transport or separate window. Keep the existing core observations and four views. Picker hit testing maps axis-aligned CSS canvas coordinates into Pixi local coordinates and tests Yoga layout boxes without changing business event modes, so text and decorative nodes remain inspectable. Respect ordinary Pixi display order, zIndex and Graphics geometry masks, including Piant overflow clipping. Do not promise pixel-accurate picking for alpha/inverse masks, cross-tree RenderLayer drawing or CSS rotation/skew. Preserve development-only dynamic imports: the package entry itself is not a production no-op. Avoid full tree rebuilding on every sample; preserve filter input focus, tree scroll and object disclosure state. Existing lifecycle tests must keep passing; add meaningful interaction tests for panel resizing, persistence, collapse/reopen and synchronous detach, alongside search, tabs, typed values, picker targeting, event interception and cancellation. Validate default/light themes and real-browser dock behavior, plus production stripping and existing builds.

## Open questions

No blocking questions. Retain English UI and the four existing views. Broader rendering/animation profiling remains tracked separately.
