# Design

## Source of truth

Status: Active. Date: 2026-10-21. Scope: the Piant inspector inside the TanStack Devtools page dock, not the application canvas or upstream shell. User direction: improve the interface using Vue Devtools as a reference. Evidence: current `packages/devtools/src/panel.ts`, `types.ts`, behavior tests, and browser screenshots; [Vue Devtools Components and Timeline](https://devtools.vuejs.org/getting-started/features#components) inspected in the official documentation. No earlier design contract or inspector-specific assets exist.

## Brand

Precise, calm, technical. Piant identity remains distinct; borrow Vue Devtools' compact tree/detail structure and typed property presentation. Avoid oversized buttons, decorative gradients, raw JSON walls, and implying unsupported component tracking or editing.

## Product goals

Find an element quickly, understand its place in the tree, inspect its geometry/style, and read application state or diagnostics without losing context. Success: useful content at a 400px dock height, clear selection/highlight, searchable/collapsible tree, readable values, and unchanged lifecycle/production exclusion. No new runtime capabilities, editing, remote inspection, or dependencies.

## Personas and jobs

Piant developers debugging a live Canvas application. They need to move between rendered elements, state and update metrics while the application keeps running.

## Information architecture

A compact toolbar with Piant identity, Elements / State / Performance / Animations navigation, live connection status, refresh and disconnect. Elements uses a searchable tree on the left and selected-node header, breadcrumb and grouped Layout / Style / Transform properties on the right. State uses typed read-only property rows. Performance shows labeled numeric metrics and bounded layout update history. Animations lists explicitly registered handles with playback status and observed statistics.

## Design principles

Show hierarchy before detail. Use progressive disclosure for nested values. Keep controls and selected context stable across samples. Use actual snapshot fields only. Label PNode element inspection clearly; no component ownership, source-file or editable-state affordances.

## Visual language

Neutral charcoal surfaces with a restrained emerald selection accent, 1px separators and 4–6px radii. Light theme uses matching light neutral surfaces and sufficient contrast. System sans-serif for navigation; monospace for node names, property keys and values. Compact 26–30px rows, 8–12px gaps and 12–13px type. Numbers, strings, booleans and null have distinct readable colors. Use small code-native SVG icons; no image assets or icon package. Motion is optional and subtle.

## Components

TanStack owns the outer dock/launcher. Piant owns tabs, search, tree rows, disclosure controls, breadcrumb, property groups, metric tiles, event rows and empty states. Inspector CSS tokens live in its Shadow DOM and follow `data-theme` from TanStack. Reuse the existing snapshot and callbacks rather than adding observation layers.

## Accessibility

Native buttons and search input, accessible labels, keyboard focus indicators, selected/tab semantics, and keyboard-operable disclosures. Color is reinforced with labels. Search has an explicit no-results state. Read-only values must remain selectable. Keyboard actions must not intercept unrelated application input. Honor reduced-motion preferences.

## Responsive behavior

Desktop: two independently scrollable panes with approximately 35% tree / 65% details. Small widths: constrained columns and horizontal overflow only for inherently long values, with wrapping labels and readable controls. The inspector fills available dock space; do not set a competing fixed panel or resize the business layout.

## Interaction states

Initial Elements view has a deliberate selection empty state. Tree search retains matching ancestor context; collapse is persistent across sampling, while searching reveals matches. Missing selection after removal returns to the empty state. Empty state, timeline and animation data have helpful text. Snapshot error/unsupported/truncation markers remain visible. Collapse, reopen, plugin destroy, immediate detach and app teardown preserve existing behavior.

## Content voice

Short developer-facing English labels, consistent with the current example and upstream shell. Explain actual units and boundaries close to metrics: CPU layout duration, Ticker frame interval and observed animation frames. State is explicitly read-only.

## Implementation constraints

TypeScript and DOM inside the framework-independent TanStack plugin; no React/Vue adapter or additional dependencies. No core or sampling behavior changes for this visual iteration. Avoid full tree rebuilding on every sample; preserve filter input focus, tree scroll and object disclosure state. Existing lifecycle tests must keep passing; add meaningful interaction tests for new search, collapse, tabs and typed values. Validate default/light themes and real-browser dock behavior, plus production stripping and existing builds.

## Open questions

No blocking questions. Assumption: retain English UI and the existing TanStack dock configuration. Broader rendering/animation profiling remains tracked outside this visual iteration.
