export const inspectorStyles = `
:host {
  --bg: #151719;
  --surface: #1b1e21;
  --raised: #222629;
  --hover: #292e32;
  --line: #30363a;
  --text: #e2e6e9;
  --muted: #929da5;
  --accent: #63d6a0;
  --accent-bg: #223d33;
  --string: #b4ce97;
  --number: #a6baf9;
  --boolean: #dfaaed;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  display: block;
  height: 100%;
  min-height: 0;
  color: var(--text);
  background: var(--bg);
  font: 12px/1.5 var(--font);
  color-scheme: dark;
}
:host([data-theme='light']) {
  --bg: #ffffff;
  --surface: #f7f8f9;
  --raised: #edf0f2;
  --hover: #e8edf0;
  --line: #dce1e5;
  --text: #263038;
  --muted: #66747e;
  --accent: #16784d;
  --accent-bg: #e3f3e9;
  --string: #47711f;
  --number: #4a5fc0;
  --boolean: #954caa;
  color-scheme: light;
}
* { box-sizing: border-box; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
button, input { font: inherit; }
button { color: inherit; cursor: pointer; }
button, input { -webkit-tap-highlight-color: transparent; }
button:focus-visible, input:focus-visible, summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
button { border: 0; background: none; }
button:hover { background: var(--hover); }
svg { width: 15px; height: 15px; flex: none; vertical-align: middle; }
[hidden] { display: none !important; }
.inspector { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.toolbar { min-height: 45px; display: flex; align-items: center; gap: 18px; padding: 0 14px; border-bottom: 1px solid var(--line); flex: none; }
.brand { display: flex; gap: 8px; align-items: center; white-space: nowrap; font-weight: 650; font-size: 13px; letter-spacing: -.2px; }
.brand-mark { display: grid; place-items: center; color: var(--accent); width: 22px; height: 22px; background: var(--accent-bg); border-radius: 6px; }
.brand-mark svg { width: 16px; height: 16px; }
.brand-subtitle { font-weight: 400; color: var(--muted); }
.tabs { display: flex; align-self: stretch; gap: 3px; }
.tab { display: flex; align-items: center; gap: 6px; padding: 0 10px; position: relative; color: var(--muted); white-space: nowrap; font-size: 12px; }
.tab[aria-selected='true'] { color: var(--accent); }
.tab[aria-selected='true']::after { content: ''; position: absolute; bottom: -1px; left: 8px; right: 8px; height: 2px; background: var(--accent); }
.toolbar-actions { margin-left: auto; display: flex; align-items: center; gap: 5px; }
.live { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); padding: 0 8px; font-size: 11px; white-space: nowrap; }
.live::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
.icon-button { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 4px; color: var(--muted); }
.icon-button:hover { color: var(--text); }
.pick-button[aria-pressed="true"] { color: var(--accent); background: var(--accent-bg); }
.collapse-button svg { transform: rotate(90deg); }
.action-divider { width: 1px; height: 16px; background: var(--line); margin: 0 3px; }
.workspace { flex: 1; min-height: 0; }
.tab-panel { height: 100%; min-height: 0; overflow: auto; }
.elements-panel { display: grid; grid-template-columns: minmax(190px, 31%) minmax(0, 1fr); overflow: hidden; }
.tree-pane { display: flex; flex-direction: column; min-width: 0; min-height: 0; border-right: 1px solid var(--line); }
.search-wrap { display: flex; align-items: center; gap: 7px; flex: none; margin: 10px; padding: 4px 7px; height: 29px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--muted); }
.search-wrap:focus-within { border-color: var(--accent); }
.search-wrap svg { width: 13px; height: 13px; }
.search { width: 100%; min-width: 0; color: var(--text); background: transparent; border: 0; outline: none; font-size: 11px; }
.search::placeholder { color: var(--muted); }
.search:focus-visible { outline: none; }
.pane-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 12px 7px; gap: 8px; color: var(--muted); font-size: 10px; font-weight: 600; letter-spacing: .65px; text-transform: uppercase; }
.count { color: var(--muted); font: 10px var(--mono); background: var(--raised); border-radius: 4px; padding: 1px 5px; letter-spacing: 0; }
.tree { flex: 1; overflow: auto; padding: 0 5px 8px; min-height: 0; }
.tree-row { display: flex; align-items: center; min-height: 27px; padding-left: calc(min(var(--depth), 20) * 13px); border-radius: 4px; }
.tree-row:hover { background: var(--hover); }
.tree-row.selected { background: var(--accent-bg); }
.tree-row.selected .node-select { color: var(--accent); }
.tree-toggle, .tree-spacer { flex: 0 0 22px; width: 22px; height: 26px; display: grid; place-items: center; padding: 0; color: var(--muted); }
.tree-toggle svg { width: 12px; height: 12px; transition: transform .1s ease; }
.tree-toggle[aria-expanded='true'] svg { transform: rotate(90deg); }
.node-select { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; padding: 4px 6px 4px 0; text-align: left; white-space: nowrap; background: transparent !important; font: 11px/19px var(--mono); }
.node-name { overflow: hidden; text-overflow: ellipsis; }
.node-id { color: var(--muted); font-size: 10px; flex: none; }
.tree-footer { margin: 0; padding: 6px 12px; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; }
.tree-empty { padding: 18px 10px; color: var(--muted); text-align: center; font-size: 11px; }
.selection-pane { overflow: auto; min-width: 0; }
.selection-header { position: sticky; top: 0; z-index: 1; padding: 12px 16px 10px; background: var(--bg); border-bottom: 1px solid var(--line); }
.selection-title { display: flex; align-items: center; gap: 8px; margin: 0; font: 600 13px/1.5 var(--mono); }
.element-symbol { color: var(--accent); }
.selection-id { font-size: 10px; color: var(--muted); font-weight: 400; border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
.breadcrumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 3px; margin-top: 4px; color: var(--muted); font: 10px/1.6 var(--mono); }
.breadcrumb { padding: 0 3px; border-radius: 3px; color: var(--muted); }
.breadcrumb:last-child { color: var(--text); }
.breadcrumb-separator { opacity: .5; }
.selection-content { padding: 12px 16px 20px; }
.section-heading { margin: 0; color: var(--text); font-size: 11px; font-weight: 600; }
.section-caption { color: var(--muted); font-size: 10px; font-weight: 400; }
.layout-overview { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr); gap: 12px; margin: 8px 0 15px; }
.geometry { position: relative; display: grid; place-items: center; min-height: 87px; border: 1px dashed var(--line); background: var(--surface); border-radius: 4px; padding: 21px 12px 9px; }
.geometry-origin { position: absolute; top: 5px; left: 8px; color: var(--muted); font: 9px var(--mono); }
.geometry-box { display: grid; place-items: center; min-width: 85px; min-height: 37px; border: 1px solid var(--accent); background: var(--accent-bg); border-radius: 2px; padding: 8px; color: var(--accent); font: 11px var(--mono); }
.layout-values { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-content: center; }
.layout-value { display: flex; flex-direction: column; gap: 1px; padding: 3px 5px; }
.layout-value span:first-child { font-size: 10px; color: var(--muted); }
.layout-value span:last-child { font: 11px var(--mono); }
.property-group { margin: 0 0 10px; border: 1px solid var(--line); border-radius: 5px; overflow: hidden; }
.property-group > summary { display: flex; align-items: center; gap: 7px; padding: 6px 9px; background: var(--surface); cursor: pointer; font-size: 11px; font-weight: 600; list-style: none; }
.property-group > summary::before, .object-row > summary::before { content: ''; border: 4px solid transparent; border-left-color: var(--muted); width: 0; height: 0; flex: none; transform-origin: 2px center; }
.property-group[open] > summary::before, .object-row[open] > summary::before { transform: rotate(90deg); }
summary::-webkit-details-marker { display: none; }
.property-body { padding: 4px 9px; }
.property-row, .object-row > summary { display: flex; align-items: baseline; gap: 8px; min-height: 24px; padding: 3px 0; font: 11px/18px var(--mono); }
.property-key { color: var(--muted); flex: none; overflow-wrap: anywhere; max-width: 48%; }
.property-row > .property-key::after { content: ':'; color: var(--muted); }
.property-value { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; user-select: text; }
.value-string { color: var(--string); }
.value-number { color: var(--number); }
.value-boolean { color: var(--boolean); }
.value-null, .object-preview { color: var(--muted); }
.object-row > summary { cursor: pointer; list-style: none; gap: 7px; }
.object-row > summary .property-key::after { content: ':'; }
.object-children { margin-left: 3px; padding-left: 13px; border-left: 1px solid var(--line); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; height: 100%; padding: 28px 20px; text-align: center; }
.empty-icon { display: grid; place-items: center; width: 38px; height: 38px; color: var(--muted); background: var(--surface); border: 1px solid var(--line); border-radius: 10px; margin-bottom: 12px; }
.empty-icon svg { width: 19px; height: 19px; }
.empty-state h2 { margin: 0 0 5px; font-size: 12px; font-weight: 600; }
.empty-state p { max-width: 300px; margin: 0; font-size: 11px; color: var(--muted); }
.view-content { padding: 15px 18px 24px; max-width: 1200px; margin: auto; }
.view-heading { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.view-heading h2 { font-size: 12px; font-weight: 600; margin: 0; }
.badge { font-size: 9px; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
.view-description { margin: -6px 0 13px; color: var(--muted); font-size: 11px; }
.state-content { padding: 7px 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-bottom: 16px; }
.metric { border: 1px solid var(--line); background: var(--surface); border-radius: 5px; padding: 9px 11px; }
.metric-label { color: var(--muted); font-size: 10px; }
.metric-value { margin-top: 3px; font: 19px/1.3 var(--mono); letter-spacing: -.5px; }
.metric-unit { font-size: 10px; letter-spacing: 0; color: var(--muted); margin-left: 3px; }
.metric-note { margin-top: 3px; font-size: 9px; color: var(--muted); }
.timeline-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 7px; }
.timeline { border: 1px solid var(--line); border-radius: 5px; overflow: hidden; }
.timeline-row { display: grid; grid-template-columns: 115px minmax(30px, 1fr) 70px; gap: 10px; align-items: center; min-height: 27px; padding: 3px 10px; border-bottom: 1px solid var(--line); font: 10px var(--mono); }
.timeline-row:last-child { border-bottom: 0; }
.timeline-time { color: var(--muted); }
.timeline-track { height: 5px; background: var(--surface); border-radius: 2px; overflow: hidden; }
.timeline-bar { height: 100%; min-width: 2px; background: var(--accent); border-radius: 2px; }
.timeline-duration { text-align: right; color: var(--text); }
.timeline-empty { padding: 18px; color: var(--muted); text-align: center; font-size: 11px; }
.animation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
.animation-card { border: 1px solid var(--line); border-radius: 5px; overflow: hidden; }
.animation-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 11px; background: var(--surface); border-bottom: 1px solid var(--line); }
.animation-title { font: 600 11px var(--mono); overflow-wrap: anywhere; }
.play-state { color: var(--accent); background: var(--accent-bg); border-radius: 4px; padding: 1px 6px; font: 10px var(--mono); }
.animation-body { padding: 4px 11px; }
@media (max-width: 760px) {
  .toolbar { gap: 8px; padding: 0 8px; }
  .brand-subtitle { display: none; }
  .tab { padding: 0 7px; }
  .tab svg { display: none; }
  .live { padding: 0 3px; }
  .elements-panel { grid-template-columns: minmax(160px, 35%) minmax(0, 1fr); }
  .selection-header { padding: 10px 12px 8px; }
  .selection-content { padding: 10px 12px 16px; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .toolbar { flex-wrap: wrap; gap: 0; padding-top: 5px; }
  .brand { order: 0; }
  .toolbar-actions { order: 1; }
  .tabs { order: 2; width: 100%; height: 32px; }
  .tab { flex: 1; justify-content: center; padding: 0 3px; font-size: 11px; }
  .elements-panel { grid-template-columns: minmax(135px, 38%) minmax(0, 1fr); }
  .layout-overview { grid-template-columns: 1fr; gap: 5px; }
  .geometry { min-height: 65px; }
  .layout-values { grid-template-columns: repeat(2, 1fr); }
  .pane-heading { font-size: 9px; padding-left: 9px; }
  .search-wrap { margin: 8px; }
  .tree-footer { padding: 6px 8px; }
  .view-content { padding: 12px; }
  .view-heading { flex-wrap: wrap; }
  .timeline-row { grid-template-columns: 78px minmax(20px, 1fr) 58px; gap: 6px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
`;
