import { inspectorStyles } from './inspectorStyles';
import type { SnapshotValue } from './snapshot';
import type {
  DevtoolsSnapshot,
  ElementInspection,
  StoreInspection,
} from './types';

const icons = {
  logo: '<path d="m3 4 5 3 5-3v8l-5 3-5-3Z"/><path d="M8 7v8M3 4l5-3 5 3"/>',
  elements: '<path d="m5 4-4 4 4 4m6-8 4 4-4 4M9 2 7 14"/>',
  state: '<path d="M5 2H3v5L1 8l2 1v5h2m6-12h2v5l2 1-2 1v5h-2M7 6h2M7 10h2"/>',
  performance: '<path d="M1 9h3l2-6 4 11 2-7h3"/>',
  animations: '<path d="m6 3 7 5-7 5ZM2 3v10"/>',
  search: '<circle cx="6.5" cy="6.5" r="4.5"/><path d="m10 10 4 4"/>',
  refresh: '<path d="M13 6a5.5 5.5 0 1 0 .2 4M13 2v4H9"/>',
  close: '<path d="m4 4 8 8m0-8-8 8"/>',
  theme:
    '<circle cx="8" cy="8" r="5.5"/><path d="M8 2.5v11"/><path d="M8 3a5 5 0 0 1 0 10Z" fill="currentColor" stroke="none"/>',
  chevron: '<path d="m6 4 4 4-4 4"/>',
  select: '<path d="M6 2H2v4m8-4h4v4M2 10v4h4m8-4v4h-4M5 5h6v6H5Z"/>',
} as const;

type Tab = 'Elements' | 'State' | 'Performance' | 'Animations';
type ValueRow = {
  element: HTMLElement;
  value: HTMLElement;
  kind: 'object' | 'primitive';
  children?: Map<string, ValueRow>;
  body?: HTMLElement;
};

/** The read-only Piant inspector, embedded in its own page dock. */
export function createInspector(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  close: () => void,
  controls?: {
    collapse: () => void;
    toggleTheme: () => void;
    togglePicking?: () => void;
    restoreStore?: (storeId: number, entryId: number) => void;
    clearStore?: (storeId: number) => void;
  },
) {
  const doc = mount.ownerDocument;
  let removed = false;
  const selectNode = (id: number) => {
    if (!removed) select(id);
  };
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = '',
    content?: string,
  ): HTMLElementTagNameMap[K] => {
    const element = doc.createElement(tag);
    element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const icon = (name: keyof typeof icons) => {
    const wrapper = el('span');
    wrapper.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
    return wrapper.firstElementChild!;
  };
  const button = (className: string, label: string) => {
    const element = el('button', className);
    element.type = 'button';
    element.setAttribute('aria-label', label);
    return element;
  };
  const host = el('aside');
  host.dataset.piantDevtools = '';
  host.setAttribute('aria-label', 'Piant Devtools');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(el('style', '', inspectorStyles));
  const inspector = el('div', 'inspector');
  shadow.append(inspector);

  const toolbar = el('header', 'toolbar');
  const brand = el('div', 'brand');
  const mark = el('span', 'brand-mark');
  mark.append(icon('logo'));
  brand.append(mark, el('span', '', 'Piant Devtools'));
  const tabs = el('div', 'tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Inspector views');
  const actions = el('div', 'toolbar-actions');
  const refreshButton = button('icon-button', 'Refresh snapshot');
  refreshButton.id = 'refresh';
  refreshButton.title = 'Refresh snapshot';
  refreshButton.append(icon('refresh'), el('span', 'sr-only', 'Refresh'));
  const closeButton = button('icon-button', 'Disconnect Piant Devtools');
  closeButton.id = 'close';
  closeButton.title = 'Disconnect Piant Devtools';
  closeButton.append(icon('close'), el('span', 'sr-only', 'Disconnect'));
  const divider = el('span', 'action-divider');
  divider.setAttribute('aria-hidden', 'true');
  actions.append(el('span', 'live', 'Live'), refreshButton);
  const pickButton = controls?.togglePicking
    ? button('icon-button pick-button', 'Select element from canvas')
    : undefined;
  const togglePicking = () => {
    if (!removed) controls?.togglePicking?.();
  };
  if (pickButton) {
    pickButton.id = 'pick';
    pickButton.title =
      'Select an element from the canvas · click to confirm · Escape to cancel';
    pickButton.setAttribute('aria-pressed', 'false');
    pickButton.append(icon('select'));
    pickButton.addEventListener('click', togglePicking);
  }
  const dockControls: HTMLButtonElement[] = [];
  if (controls) {
    const themeButton = button('icon-button', 'Toggle color theme');
    themeButton.id = 'theme';
    themeButton.title = 'Toggle color theme';
    themeButton.append(icon('theme'));
    themeButton.addEventListener('click', controls.toggleTheme);
    const collapseButton = button('icon-button', 'Collapse Piant Devtools');
    collapseButton.id = 'collapse';
    collapseButton.title = 'Collapse Piant Devtools';
    collapseButton.append(icon('chevron'));
    collapseButton.classList.add('collapse-button');
    collapseButton.addEventListener('click', controls.collapse);
    dockControls.push(themeButton, collapseButton);
    actions.append(...dockControls);
  }
  actions.append(divider, closeButton);
  toolbar.append(brand);
  if (pickButton) toolbar.append(pickButton);
  toolbar.append(tabs, actions);
  const workspace = el('main', 'workspace');
  inspector.append(toolbar, workspace);
  const tabButtons = new Map<Tab, HTMLButtonElement>();
  const panels = new Map<Tab, HTMLElement>();
  let activeTab: Tab = 'Elements';
  const tabNames: Tab[] = ['Elements', 'State', 'Performance', 'Animations'];
  function activateTab(name: Tab) {
    activeTab = name;
    for (const [tabName, tabButton] of tabButtons) {
      tabButton.setAttribute('aria-selected', String(name === tabName));
      tabButton.tabIndex = name === tabName ? 0 : -1;
      panels.get(tabName)!.hidden = name !== tabName;
    }
  }
  for (const name of tabNames) {
    const tabButton = button('tab', name);
    tabButton.id = `tab-${name.toLowerCase()}`;
    tabButton.setAttribute('role', 'tab');
    tabButton.setAttribute('aria-controls', `panel-${name.toLowerCase()}`);
    tabButton.append(
      icon(name.toLowerCase() as 'elements'),
      el('span', '', name),
    );
    tabButton.addEventListener('click', () => activateTab(name));
    const panel = el('section', 'tab-panel');
    panel.id = `panel-${name.toLowerCase()}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', name);
    panel.setAttribute('aria-labelledby', tabButton.id);
    tabButtons.set(name, tabButton);
    panels.set(name, panel);
    tabs.append(tabButton);
    workspace.append(panel);
  }
  tabs.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = tabNames.indexOf(activeTab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 3
          : (current + (event.key === 'ArrowRight' ? 1 : 3)) % 4;
    activateTab(tabNames[next]);
    tabButtons.get(tabNames[next])!.focus();
  });
  activateTab('Elements');
  refreshButton.addEventListener('click', refresh);
  closeButton.addEventListener('click', close);

  // Value rows are reconciled by property key. Sampling preserves disclosure DOM,
  // text selection, focus and scroll, even when primitive values change frequently.
  function valueTree(
    container: HTMLElement,
    formatNumber: (value: number) => string = String,
  ) {
    const rows = new Map<string, ValueRow>();
    const emptyValue = el('div', 'object-preview');
    function reconcile(
      parent: HTMLElement,
      entries: [string, SnapshotValue][],
      existing: Map<string, ValueRow>,
    ) {
      const retained = new Set(entries.map(([key]) => key));
      for (const [key, row] of existing) {
        if (!retained.has(key)) {
          row.element.remove();
          existing.delete(key);
        }
      }
      let previous: HTMLElement | null = null;
      for (const [key, value] of entries) {
        const kind =
          value !== null && typeof value === 'object' ? 'object' : 'primitive';
        let row = existing.get(key);
        if (row && row.kind !== kind) {
          row.element.remove();
          existing.delete(key);
          row = undefined;
        }
        if (!row) {
          const element = el(
            kind === 'object' ? 'details' : 'div',
            kind === 'object' ? 'object-row' : 'property-row',
          );
          const label = el('span', 'property-key', key);
          const valueElement = el('span', 'property-value');
          row = { element, value: valueElement, kind };
          if (kind === 'object') {
            const summary = el('summary');
            summary.append(label, valueElement);
            row.body = el('div', 'object-children');
            row.children = new Map();
            element.append(summary, row.body);
          } else element.append(label, valueElement);
          existing.set(key, row);
        }
        const expected: Element | null = previous
          ? previous.nextElementSibling
          : parent.firstElementChild;
        if (expected !== row.element)
          parent.insertBefore(row.element, expected);
        previous = row.element;
        if (kind === 'object') {
          const entries = Object.entries(value!);
          row.value.className = 'object-preview';
          const preview = Array.isArray(value)
            ? `Array [${entries.length}]`
            : `Object {${entries.length}}`;
          if (row.value.textContent !== preview)
            row.value.textContent = preview;
          reconcile(row.body!, entries, row.children!);
        } else {
          row.value.className = `property-value value-${value === null ? 'null' : typeof value}`;
          const text =
            typeof value === 'string'
              ? JSON.stringify(value)
              : typeof value === 'number'
                ? formatNumber(value)
                : String(value);
          if (row.value.textContent !== text) row.value.textContent = text;
        }
      }
    }
    return (value: SnapshotValue) => {
      const containerValue = value !== null && typeof value === 'object';
      const entries: [string, SnapshotValue][] = containerValue
        ? Object.entries(value)
        : [['value', value]];
      reconcile(container, entries, rows);
      if (containerValue && entries.length === 0) {
        emptyValue.textContent = Array.isArray(value)
          ? 'Array [0]'
          : 'Object {0}';
        container.append(emptyValue);
      } else emptyValue.remove();
    };
  }

  function emptyState(
    title: string,
    description: string,
    iconName: keyof typeof icons,
  ) {
    const empty = el('div', 'empty-state');
    const image = el('span', 'empty-icon');
    image.append(icon(iconName));
    empty.append(image, el('h2', '', title), el('p', '', description));
    return empty;
  }
  function viewHeader(
    panel: HTMLElement,
    title: string,
    description: string,
    badge?: string,
  ) {
    const content = el('div', 'view-content');
    const heading = el('div', 'view-heading');
    heading.append(el('h2', '', title));
    if (badge) heading.append(el('span', 'badge', badge));
    content.append(heading, el('p', 'view-description', description));
    panel.append(content);
    return content;
  }
  function group(parent: HTMLElement, name: string) {
    const details = el('details', 'property-group');
    details.open = true;
    const summary = el('summary', '', name);
    const body = el('div', 'property-body');
    details.append(summary, body);
    parent.append(details);
    return valueTree(body);
  }
  const elementsPanel = panels.get('Elements')!;
  elementsPanel.classList.add('elements-panel');
  const treePane = el('div', 'tree-pane');
  const searchWrap = el('div', 'search-wrap');
  const search = el('input', 'search');
  search.type = 'search';
  search.placeholder = 'Filter elements…';
  search.setAttribute('aria-label', 'Filter elements');
  searchWrap.append(icon('search'), search);
  const treeHeading = el('div', 'pane-heading');
  const count = el('span', 'count', '0');
  treeHeading.append(el('span', '', 'PNode elements'), count);
  const nav = el('nav', 'tree');
  nav.setAttribute('aria-label', 'PNode element tree');
  const limit = el('p', 'tree-footer', 'Rendered elements · read-only');
  limit.id = 'limit';
  treePane.append(searchWrap, treeHeading, nav, limit);
  const selectionPane = el('div', 'selection-pane');
  const selectionEmpty = emptyState(
    'Inspect an element',
    'Select a PNode in the tree to highlight it on the canvas and inspect its properties.',
    'select',
  );
  const selectionDetails = el('div');
  selectionDetails.id = 'selection';
  const selectionHeader = el('div', 'selection-header');
  const selectionTitle = el('h2', 'selection-title');
  const selectionName = el('span');
  const selectionId = el('span', 'selection-id');
  selectionTitle.append(
    el('span', 'element-symbol', '◇'),
    selectionName,
    selectionId,
  );
  const breadcrumbs = el('div', 'breadcrumbs');
  breadcrumbs.setAttribute('aria-label', 'Selected element ancestry');
  selectionHeader.append(selectionTitle, breadcrumbs);
  const selectionContent = el('div', 'selection-content');
  const layoutHeading = el('h3', 'section-heading', 'Layout');
  layoutHeading.append(el('span', 'section-caption', ' · computed pixels'));
  const layout = el('div', 'layout-overview');
  const geometry = el('div', 'geometry');
  const origin = el('span', 'geometry-origin');
  const box = el('div', 'geometry-box');
  geometry.append(origin, box);
  const layoutValues = el('div', 'layout-values');
  const geometryValues = new Map<string, HTMLElement>();
  for (const key of ['left', 'top', 'width', 'height']) {
    const item = el('div', 'layout-value');
    const value = el('span');
    geometryValues.set(key, value);
    item.append(el('span', '', key), value);
    layoutValues.append(item);
  }
  layout.append(geometry, layoutValues);
  selectionContent.append(layoutHeading, layout);
  const renderStyle = group(selectionContent, 'Style');
  const renderTransform = group(selectionContent, 'Transform');
  selectionDetails.append(selectionHeader, selectionContent);
  selectionPane.append(selectionEmpty, selectionDetails);
  elementsPanel.append(treePane, selectionPane);
  selectionDetails.hidden = true;

  const stateContent = viewHeader(
    panels.get('State')!,
    'Application state',
    'Snapshot supplied by getState(). Values are copied safely and cannot be edited.',
    'Read-only',
  );
  const state = el('div', 'state-content');
  state.id = 'state';
  stateContent.append(state);
  const renderState = valueTree(state);

  const historyContent = viewHeader(
    panels.get('State')!,
    'Store history',
    'Preview recorded snapshots. Restore explicitly to apply a snapshot to the registered store.',
  );
  const historyHint = el(
    'p',
    'view-description',
    'Register stores with the stores option to inspect and restore their history.',
  );
  const historyStores = el('div', 'history-stores');
  historyContent.append(historyHint, historyStores);
  type HistoryCard = {
    element: HTMLElement;
    source?: StoreInspection;
    selectedId: number | null;
    entries: Map<number, HTMLButtonElement>;
    list: HTMLElement;
    title: HTMLElement;
    status: HTMLElement;
    previewTitle: HTMLElement;
    reason: HTMLElement;
    restore: HTMLButtonElement;
    clear: HTMLButtonElement;
    renderValue: (value: SnapshotValue) => void;
  };
  const historyCards = new Map<number, HistoryCard>();
  function updateHistoryCard(card: HistoryCard, store: StoreInspection) {
    card.source = store;
    card.title.textContent = store.name;
    card.clear.setAttribute('aria-label', `Clear ${store.name} history`);
    card.restore.setAttribute('aria-label', `Restore ${store.name} snapshot`);
    card.list.setAttribute('aria-label', `${store.name} snapshots`);
    card.status.textContent = store.error
      ? 'Unavailable'
      : store.disposed
        ? 'Disposed'
        : `${store.entries.length} snapshots`;
    card.clear.disabled =
      store.disposed ||
      !!store.error ||
      !controls?.clearStore ||
      store.entries.length === 0;
    if (!store.entries.some((entry) => entry.id === card.selectedId)) {
      card.selectedId =
        store.entries.find((entry) => entry.id === store.currentId)?.id ??
        store.entries.at(-1)?.id ??
        null;
    }
    const retained = new Set(store.entries.map((entry) => entry.id));
    for (const [id, row] of card.entries) {
      if (!retained.has(id)) {
        row.remove();
        card.entries.delete(id);
      }
    }
    let previous: HTMLElement | null = null;
    for (const entry of store.entries) {
      let row = card.entries.get(entry.id);
      if (!row) {
        row = button(
          'history-entry',
          `Preview ${store.name} snapshot #${entry.id}`,
        );
        row.addEventListener('click', () => {
          if (removed || !card.source) return;
          card.selectedId = entry.id;
          updateHistoryCard(card, card.source);
        });
        card.entries.set(entry.id, row);
      }
      row.textContent = `#${entry.id} · ${Number.isFinite(entry.timestamp) ? new Date(entry.timestamp).toLocaleTimeString() : 'Unknown time'}${entry.id === store.currentId ? ' · Current' : ''}`;
      row.setAttribute(
        'aria-label',
        `Preview ${store.name} snapshot #${entry.id}`,
      );
      row.setAttribute('aria-pressed', String(entry.id === card.selectedId));
      row.dataset.current = String(entry.id === store.currentId);
      const expected: Element | null = previous
        ? previous.nextElementSibling
        : card.list.firstElementChild;
      if (expected !== row) card.list.insertBefore(row, expected);
      previous = row;
    }
    const selected = store.entries.find(
      (entry) => entry.id === card.selectedId,
    );
    card.previewTitle.textContent = selected
      ? `Snapshot #${selected.id}${selected.id === store.currentId ? ' · Current' : ' · Preview'}`
      : 'No recorded snapshots';
    card.restore.disabled =
      !selected?.restorable ||
      store.disposed ||
      !!store.error ||
      !controls?.restoreStore;
    card.reason.textContent =
      store.error ??
      (store.disposed
        ? 'This store has been disposed. Recorded snapshots remain available for preview.'
        : selected && !selected.restorable
          ? (selected.reason ?? 'This snapshot cannot be restored.')
          : '');
    card.reason.hidden = !card.reason.textContent;
    card.renderValue(selected?.state ?? null);
  }
  function renderHistory(stores: DevtoolsSnapshot['stores']) {
    historyHint.hidden = !!stores?.length;
    const retained = new Set(stores?.map((store) => store.id));
    for (const [id, card] of historyCards) {
      if (!retained.has(id)) {
        card.element.remove();
        historyCards.delete(id);
      }
    }
    for (const store of stores ?? []) {
      let card = historyCards.get(store.id);
      if (!card) {
        const element = el('article', 'history-card');
        element.dataset.storeId = String(store.id);
        const header = el('div', 'history-header');
        const title = el('h3', 'section-heading');
        const status = el('span', 'badge');
        const clear = button('history-action', `Clear ${store.name} history`);
        clear.textContent = 'Clear history';
        header.append(title, status, clear);
        const body = el('div', 'history-body');
        const list = el('nav', 'history-list');
        list.setAttribute('aria-label', `${store.name} snapshots`);
        const preview = el('div', 'history-preview');
        const previewHeader = el('div', 'history-preview-header');
        const previewTitle = el('span', 'section-heading');
        const restore = button(
          'history-action',
          `Restore ${store.name} snapshot`,
        );
        restore.textContent = 'Restore';
        previewHeader.append(previewTitle, restore);
        const reason = el('p', 'history-reason');
        const value = el('div', 'history-value');
        preview.append(previewHeader, reason, value);
        body.append(list, preview);
        element.append(header, body);
        card = {
          element,
          selectedId: null,
          entries: new Map(),
          list,
          title,
          status,
          previewTitle,
          reason,
          restore,
          clear,
          renderValue: valueTree(value),
        };
        const record = card;
        clear.addEventListener('click', () => {
          if (!removed && !record.clear.disabled)
            controls?.clearStore?.(store.id);
        });
        restore.addEventListener('click', () => {
          if (
            !removed &&
            !record.restore.disabled &&
            record.selectedId !== null
          )
            controls?.restoreStore?.(store.id, record.selectedId);
        });
        historyCards.set(store.id, card);
        historyStores.append(element);
      }
      if (card.source !== store) updateHistoryCard(card, store);
    }
  }

  const performance = viewHeader(
    panels.get('Performance')!,
    'Performance',
    'CPU layout duration and Ticker frame intervals observed while this panel is open.',
    'Live observation',
  );
  const metrics = el('div', 'metrics');
  const metricValues: HTMLElement[] = [];
  const metricNotes: HTMLElement[] = [];
  for (const [label, unit, note] of [
    ['Layout updates', '', 'Completed layout passes'],
    ['CPU layout', 'ms', 'Cumulative observed layout time'],
    ['Ticker interval', 'ms', 'Time between observed frames'],
    ['Observed frames', '', 'While the panel is open'],
  ]) {
    const metric = el('div', 'metric');
    const value = el('div', 'metric-value');
    const number = el('span', '', '0');
    value.append(number, el('span', 'metric-unit', unit));
    const caption = el('div', 'metric-note', note);
    metric.append(el('div', 'metric-label', label), value, caption);
    metrics.append(metric);
    metricValues.push(number);
    metricNotes.push(caption);
  }
  const timelineHeading = el('div', 'timeline-heading');
  timelineHeading.append(
    el('h3', 'section-heading', 'Layout timeline'),
    el('span', 'section-caption', 'Recent 20 updates · relative duration'),
  );
  const timeline = el('div', 'timeline');
  timeline.id = 'timeline';
  const timelineEmpty = el(
    'div',
    'timeline-empty',
    'No layout updates yet. Interact with your application to see activity.',
  );
  timeline.append(timelineEmpty);
  performance.append(metrics, timelineHeading, timeline);
  const timelineRows: {
    element: HTMLElement;
    time: HTMLElement;
    bar: HTMLElement;
    duration: HTMLElement;
  }[] = [];

  const animationsContent = viewHeader(
    panels.get('Animations')!,
    'Registered animations',
    'Playback state from registered handles. Times are in milliseconds; frame counts and elapsed time reflect observation only.',
    'Read-only',
  );
  const animationGrid = el('div', 'animation-grid');
  animationGrid.id = 'animations';
  const animationEmpty = emptyState(
    'No registered animations',
    'Pass animation handles through the animations option to inspect their playback state here.',
    'animations',
  );
  animationsContent.append(animationGrid, animationEmpty);
  const animationCards = new Map<
    string,
    {
      card: HTMLElement;
      status: HTMLElement;
      render: (value: SnapshotValue) => void;
    }
  >();
  const animationError = el('p', 'view-description');
  animationsContent.append(animationError);

  let current: DevtoolsSnapshot | undefined;
  let renderedElements: DevtoolsSnapshot['elements'] | undefined;
  let renderedQuery = '';
  let collapseRevision = 0;
  let renderedCollapseRevision = -1;
  let renderedSelection: number | null | undefined;
  let breadcrumbElements: DevtoolsSnapshot['elements'] | undefined;
  let breadcrumbSelection: number | null | undefined;
  const collapsed = new Set<number>();
  const treeRows = new Map<
    number,
    {
      row: HTMLElement;
      select: HTMLButtonElement;
      disclosure?: HTMLButtonElement;
    }
  >();
  const noResults = el('div', 'tree-empty', 'No matching elements.');
  function renderTree(snapshot: DevtoolsSnapshot) {
    const query = search.value.trim().toLowerCase();
    const changed =
      snapshot.elements !== renderedElements ||
      query !== renderedQuery ||
      collapseRevision !== renderedCollapseRevision;
    if (changed) {
      renderedElements = snapshot.elements;
      renderedQuery = query;
      renderedCollapseRevision = collapseRevision;
      const byId = new Map(snapshot.elements.map((node) => [node.id, node]));
      for (const id of collapsed) if (!byId.has(id)) collapsed.delete(id);
      const parents = new Set(snapshot.elements.map((node) => node.parentId));
      const visible = new Set<number>();
      if (query) {
        for (const node of snapshot.elements) {
          if (!`${node.name} #${node.id}`.toLowerCase().includes(query))
            continue;
          let ancestor: ElementInspection | undefined = node;
          while (ancestor && !visible.has(ancestor.id)) {
            visible.add(ancestor.id);
            ancestor =
              ancestor.parentId === null
                ? undefined
                : byId.get(ancestor.parentId);
          }
        }
      }
      const retained = new Set<number>();
      const hidden = new Set<number>();
      let previous: HTMLElement | null = null;
      for (const node of snapshot.elements) {
        if (
          !query &&
          node.parentId !== null &&
          (collapsed.has(node.parentId) || hidden.has(node.parentId))
        ) {
          hidden.add(node.id);
          continue;
        }
        if (query && !visible.has(node.id)) continue;
        retained.add(node.id);
        const hasChildren = parents.has(node.id);
        let record = treeRows.get(node.id);
        if (!record || Boolean(record.disclosure) !== hasChildren) {
          record?.row.remove();
          const row = el('div', 'tree-row');
          const selectButton = button(
            'node-select',
            `${node.name} #${node.id}`,
          );
          selectButton.append(
            el('span', 'node-name', node.name),
            el('span', 'node-id', `#${node.id}`),
          );
          selectButton.addEventListener('click', () => selectNode(node.id));
          record = { row, select: selectButton };
          if (hasChildren) {
            const disclosure = button('tree-toggle', '');
            disclosure.append(icon('chevron'));
            disclosure.addEventListener('click', () => {
              if (collapsed.has(node.id)) collapsed.delete(node.id);
              else collapsed.add(node.id);
              collapseRevision++;
              if (current) renderTree(current);
            });
            record.disclosure = disclosure;
            row.append(disclosure);
          } else row.append(el('span', 'tree-spacer'));
          row.append(selectButton);
          treeRows.set(node.id, record);
        }
        const name = record.select.querySelector('.node-name')!;
        if (name.textContent !== node.name) name.textContent = node.name;
        record.select.setAttribute('aria-label', `${node.name} #${node.id}`);
        record.row.style.setProperty('--depth', String(node.depth));
        if (record.disclosure) {
          const expanded = Boolean(query) || !collapsed.has(node.id);
          record.disclosure.disabled = Boolean(query);
          record.disclosure.title = query
            ? 'Matching branches are expanded while filtering'
            : '';
          record.disclosure.setAttribute('aria-expanded', String(expanded));
          record.disclosure.setAttribute(
            'aria-label',
            `${expanded ? 'Collapse' : 'Expand'} ${node.name} #${node.id}`,
          );
        }
        const expected: Element | null = previous
          ? previous.nextElementSibling
          : nav.firstElementChild;
        if (expected !== record.row) nav.insertBefore(record.row, expected);
        previous = record.row;
      }
      for (const [id, record] of treeRows) {
        if (!retained.has(id)) {
          record.row.remove();
          treeRows.delete(id);
        }
      }
      if (retained.size === 0) {
        noResults.textContent = query
          ? 'No matching elements.'
          : 'No rendered elements.';
        nav.append(noResults);
      } else noResults.remove();
      count.textContent = String(snapshot.elements.length);
    }
    limit.textContent = snapshot.truncated
      ? 'Tree truncated at maxNodes.'
      : 'Rendered elements · not component ownership';
    if (changed || renderedSelection !== snapshot.selectedId) {
      renderedSelection = snapshot.selectedId;
      for (const [id, record] of treeRows) {
        const selected = id === snapshot.selectedId;
        record.select.setAttribute('aria-pressed', String(selected));
        record.row.classList.toggle('selected', selected);
      }
    }
  }
  search.addEventListener('input', () => {
    if (current) renderTree(current);
  });
  function object(
    value: SnapshotValue | undefined,
  ): Record<string, SnapshotValue> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, SnapshotValue>)
      : {};
  }
  const numberText = (value: SnapshotValue | undefined) =>
    typeof value === 'number' ? Number(value.toFixed(2)).toString() : '—';
  function render(snapshot: DevtoolsSnapshot) {
    if (removed) return;
    current = snapshot;
    renderTree(snapshot);
    const selection = object(snapshot.selection);
    const hasSelection =
      snapshot.selectedId !== null && snapshot.selection !== null;
    selectionEmpty.hidden = hasSelection;
    selectionDetails.hidden = !hasSelection;
    if (hasSelection) {
      selectionName.textContent = String(selection.name ?? 'Element');
      selectionId.textContent = `#${snapshot.selectedId}`;
      const layout = object(selection.layout);
      origin.textContent = `x ${numberText(layout.left)} · y ${numberText(layout.top)}`;
      box.textContent = `${numberText(layout.width)} × ${numberText(layout.height)}`;
      for (const [key, element] of geometryValues)
        element.textContent = `${numberText(layout[key])} px`;
      renderStyle(selection.style ?? null);
      renderTransform(selection.transform ?? null);
      if (
        snapshot.elements !== breadcrumbElements ||
        snapshot.selectedId !== breadcrumbSelection
      ) {
        breadcrumbElements = snapshot.elements;
        breadcrumbSelection = snapshot.selectedId;
        breadcrumbs.replaceChildren();
        const byId = new Map(snapshot.elements.map((node) => [node.id, node]));
        const ancestry: ElementInspection[] = [];
        let node = byId.get(snapshot.selectedId!);
        const visited = new Set<number>();
        while (node && !visited.has(node.id)) {
          ancestry.unshift(node);
          visited.add(node.id);
          node = node.parentId === null ? undefined : byId.get(node.parentId);
        }
        for (const [index, ancestor] of ancestry.entries()) {
          if (index)
            breadcrumbs.append(el('span', 'breadcrumb-separator', '›'));
          const crumb = button(
            'breadcrumb',
            `Select ${ancestor.name} #${ancestor.id}`,
          );
          crumb.textContent = ancestor.name;
          crumb.addEventListener('click', () => selectNode(ancestor.id));
          breadcrumbs.append(crumb);
        }
      }
    }
    renderState(snapshot.state);
    renderHistory(snapshot.stores);
    const { stats } = snapshot;
    [
      stats.layoutUpdates.toString(),
      stats.layoutDuration.toFixed(2),
      stats.frameInterval.toFixed(2),
      stats.frames.toString(),
    ].forEach((value, index) => {
      metricValues[index].textContent = value;
    });
    metricNotes[2].textContent = `Peak ${stats.maxFrameInterval.toFixed(2)} ms · Ticker`;
    const recent = snapshot.timeline.slice(-20);
    timelineEmpty.hidden = recent.length > 0;
    const maximum = Math.max(1, ...recent.map((event) => event.duration));
    for (const [index, event] of recent.entries()) {
      let row = timelineRows[index];
      if (!row) {
        const element = el('div', 'timeline-row');
        const time = el('span', 'timeline-time');
        const track = el('div', 'timeline-track');
        const bar = el('div', 'timeline-bar');
        const duration = el('span', 'timeline-duration');
        track.append(bar);
        element.append(time, track, duration);
        row = { element, time, bar, duration };
        timelineRows.push(row);
        timeline.append(element);
      }
      row.time.textContent = `${event.time.toFixed(1)} ms`;
      row.duration.textContent = `${event.duration.toFixed(2)} ms`;
      row.bar.style.width = `${Math.min(100, Math.max(0, (event.duration / maximum) * 100))}%`;
    }
    while (timelineRows.length > recent.length)
      timelineRows.pop()!.element.remove();

    const animations = Array.isArray(snapshot.animations)
      ? snapshot.animations
      : [];
    animationEmpty.hidden =
      animations.length > 0 || !Array.isArray(snapshot.animations);
    animationError.textContent = Array.isArray(snapshot.animations)
      ? ''
      : String(snapshot.animations);
    const retained = new Set<string>();
    for (const [index, item] of animations.entries()) {
      const animation = object(item);
      const id = String(animation.id ?? index);
      retained.add(id);
      let record = animationCards.get(id);
      if (!record) {
        const card = el('article', 'animation-card');
        const header = el('div', 'animation-header');
        const status = el('span', 'play-state');
        header.append(el('span', 'animation-title', id), status);
        const body = el('div', 'animation-body');
        card.append(header, body);
        record = {
          card,
          status,
          render: valueTree(body, (value) =>
            Number(value.toFixed(2)).toString(),
          ),
        };
        animationCards.set(id, record);
        animationGrid.append(card);
      }
      record.status.textContent = String(animation.playState ?? 'unavailable');
      record.render(animation);
    }
    for (const [id, record] of animationCards) {
      if (!retained.has(id)) {
        record.card.remove();
        animationCards.delete(id);
      }
    }
  }
  mount.append(host);
  return {
    host,
    render,
    setPicking(active: boolean) {
      if (!removed) pickButton?.setAttribute('aria-pressed', String(active));
    },
    reveal(id: number) {
      if (removed || !current) return;
      const byId = new Map(current.elements.map((node) => [node.id, node]));
      let node = byId.get(id);
      if (!node) return;
      activateTab('Elements');
      search.value = '';
      const visited = new Set<number>([id]);
      while (node.parentId !== null && !visited.has(node.parentId)) {
        visited.add(node.parentId);
        if (collapsed.delete(node.parentId)) collapseRevision++;
        const parent = byId.get(node.parentId);
        if (!parent) break;
        node = parent;
      }
      renderTree(current);
      treeRows.get(id)?.row.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
      });
    },
    remove() {
      if (removed) return;
      removed = true;
      refreshButton.removeEventListener('click', refresh);
      closeButton.removeEventListener('click', close);
      pickButton?.removeEventListener('click', togglePicking);
      if (controls) {
        dockControls[0].removeEventListener('click', controls.toggleTheme);
        dockControls[1].removeEventListener('click', controls.collapse);
      }
      current = undefined;
      renderedElements = undefined;
      breadcrumbElements = undefined;
      collapsed.clear();
      treeRows.clear();
      animationCards.clear();
      historyCards.clear();
      timelineRows.length = 0;
      shadow.replaceChildren();
      host.remove();
    },
  };
}
