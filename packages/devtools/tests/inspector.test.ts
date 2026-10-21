import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInspector } from '../src/inspector';
import { readonlySnapshot } from '../src/snapshot';
import type { DevtoolsSnapshot } from '../src/types';

const inspectors: ReturnType<typeof createInspector>[] = [];

function snapshot(overrides: Partial<DevtoolsSnapshot> = {}): DevtoolsSnapshot {
  return Object.freeze({
    elements: Object.freeze([
      { id: 1, parentId: null, depth: 0, name: 'Root' },
      { id: 2, parentId: 1, depth: 1, name: 'Container' },
      { id: 3, parentId: 2, depth: 2, name: 'Counter' },
      { id: 4, parentId: 1, depth: 1, name: 'Footer' },
    ]),
    truncated: false,
    selectedId: null,
    selection: null,
    state: readonlySnapshot({ count: 3, enabled: true, empty: null }),
    animations: readonlySnapshot([]),
    stats: Object.freeze({
      frames: 8,
      frameInterval: 16.5,
      maxFrameInterval: 22,
      layoutUpdates: 2,
      layoutDuration: 0.75,
    }),
    timeline: Object.freeze([{ time: 123.5, duration: 0.75 }]),
    ...overrides,
  });
}

function fixture(
  value = snapshot(),
  controls?: Parameters<typeof createInspector>[4],
) {
  const select = vi.fn();
  const refresh = vi.fn();
  const close = vi.fn();
  const inspector = createInspector(
    document.body,
    select,
    refresh,
    close,
    controls,
  );
  inspectors.push(inspector);
  inspector.render(value);
  const shadow = inspector.host.shadowRoot!;
  const tree = shadow.querySelector<HTMLElement>(
    'nav[aria-label="PNode element tree"]',
  )!;
  const search = shadow.querySelector<HTMLInputElement>(
    '[aria-label="Filter elements"]',
  )!;
  const button = (label: string) => {
    const match = Array.from(shadow.querySelectorAll('button')).find(
      (element) =>
        element.getAttribute('aria-label') === label ||
        element.textContent?.trim() === label,
    );
    expect(match, `button ${label}`).toBeDefined();
    return match!;
  };
  const filter = (text: string) => {
    search.value = text;
    search.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const tab = (name: string) => {
    button(name).click();
    const panel = shadow.querySelector<HTMLElement>(
      `[role="tabpanel"][aria-label="${name}"]`,
    )!;
    expect(panel.hidden).toBe(false);
    expect(button(name).getAttribute('aria-selected')).toBe('true');
    return panel;
  };
  return {
    inspector,
    shadow,
    tree,
    search,
    select,
    refresh,
    close,
    button,
    filter,
    tab,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const inspector of inspectors.splice(0)) inspector.remove();
  document.body.replaceChildren();
});

describe('embedded inspector interactions', () => {
  it('toggles canvas picking and reflects its controlled state until removed', () => {
    const togglePicking = vi.fn();
    const { inspector, button } = fixture(snapshot(), {
      collapse: vi.fn(),
      toggleTheme: vi.fn(),
      togglePicking,
    });
    const pick = button('Select element from canvas');
    expect(pick.getAttribute('aria-pressed')).toBe('false');
    pick.click();
    expect(togglePicking).toHaveBeenCalledTimes(1);
    inspector.setPicking(true);
    expect(pick.getAttribute('aria-pressed')).toBe('true');
    inspector.setPicking(false);
    expect(pick.getAttribute('aria-pressed')).toBe('false');
    inspector.remove();
    pick.click();
    inspector.setPicking(true);
    expect(togglePicking).toHaveBeenCalledTimes(1);
    expect(pick.getAttribute('aria-pressed')).toBe('false');
  });

  it('reveals a canvas selection through filters and collapsed ancestors without reopening other branches', () => {
    const value = snapshot();
    const elements = Object.freeze([
      ...value.elements,
      { id: 5, parentId: 4, depth: 2, name: 'FooterLabel' },
    ]);
    const { inspector, button, filter, search, tree, shadow, tab } = fixture(
      snapshot({ elements }),
    );
    button('Collapse Container #2').click();
    button('Collapse Footer #4').click();
    button('Collapse Root #1').click();
    filter('missing');
    tab('State');
    inspector.render(
      snapshot({
        elements,
        selectedId: 3,
        selection: readonlySnapshot({
          id: 3,
          name: 'Counter',
          layout: { left: 10, top: 12, width: 80, height: 30 },
          style: { backgroundColor: '#112233' },
          transform: { x: 4 },
        }),
      }),
    );
    const scroll = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {});
    inspector.reveal(3);
    expect(search.value).toBe('');
    expect(button('Elements').getAttribute('aria-selected')).toBe('true');
    expect(tree.textContent).toContain('Counter');
    expect(tree.textContent).not.toContain('FooterLabel');
    expect(button('Counter #3').getAttribute('aria-pressed')).toBe('true');
    expect(button('Expand Footer #4').getAttribute('aria-expanded')).toBe(
      'false',
    );
    const selection = shadow.querySelector<HTMLElement>('#selection')!;
    expect(selection.hidden).toBe(false);
    expect(selection.textContent).toContain('Counter');
    expect(selection.textContent).toContain('#112233');
    expect(scroll).toHaveBeenCalledExactlyOnceWith({
      block: 'nearest',
      inline: 'nearest',
    });
    inspector.render(snapshot({ elements, state: { count: 4 } }));
    expect(scroll).toHaveBeenCalledTimes(1);
    inspector.remove();
    inspector.reveal(3);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('filters names without case sensitivity and ids while retaining ancestors', () => {
    const { tree, filter } = fixture();
    filter('cOuNtEr');
    expect(tree.textContent).toContain('Root');
    expect(tree.textContent).toContain('Container');
    expect(tree.textContent).toContain('Counter');
    expect(tree.textContent).not.toContain('Footer');
    filter('#4');
    expect(tree.textContent).toContain('Root');
    expect(tree.textContent).toContain('Footer');
    expect(tree.textContent).not.toContain('Counter');
    filter('missing');
    expect(tree.textContent).toMatch(/no.*(elements|results|matches)/i);
    filter('');
    expect(tree.textContent).toContain('Counter');
    expect(tree.textContent).toContain('Footer');
  });

  it('persists collapsed branches across snapshots and reveals search matches without selecting', () => {
    const { inspector, button, tree, select, filter } = fixture();
    button('Collapse Container #2').click();
    expect(tree.textContent).not.toContain('Counter');
    expect(select).not.toHaveBeenCalled();
    inspector.render(snapshot({ state: { count: 4 } }));
    expect(tree.textContent).not.toContain('Counter');
    filter('counter');
    expect(tree.textContent).toContain('Counter');
    filter('');
    expect(tree.textContent).not.toContain('Counter');
    button('Expand Container #2').click();
    expect(tree.textContent).toContain('Counter');
  });

  it('selects elements and shows their ancestry and actual property groups', () => {
    const { inspector, tree, select, tab } = fixture();
    const node = Array.from(
      tree.querySelectorAll<HTMLButtonElement>('button'),
    ).find(
      (element) =>
        element.textContent?.includes('Counter') &&
        element.hasAttribute('aria-pressed'),
    )!;
    node.click();
    expect(select).toHaveBeenCalledExactlyOnceWith(3);
    inspector.render(
      snapshot({
        selectedId: 3,
        selection: readonlySnapshot({
          id: 3,
          name: 'Counter',
          layout: { left: 10, top: 12, width: 80, height: 30 },
          style: { backgroundColor: '#112233' },
          transform: { x: 4, y: 5, alpha: 0.5 },
        }),
      }),
    );
    const panel = tab('Elements');
    expect(node.getAttribute('aria-pressed')).toBe('true');
    expect(panel.textContent).toContain('Root');
    expect(panel.textContent).toContain('Container');
    expect(panel.textContent).toContain('Layout');
    expect(panel.textContent).toContain('Style');
    expect(panel.textContent).toContain('Transform');
    expect(panel.textContent).toContain('#112233');
    inspector.render(snapshot());
    expect(tab('Elements').textContent).toMatch(/select a PNode/i);
    expect(panel.querySelector('#selection')?.hasAttribute('hidden')).toBe(
      true,
    );
  });

  it('renders typed read-only state safely and preserves nested disclosure across updates', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const state = readonlySnapshot({
      count: 3,
      enabled: true,
      empty: null,
      message: malicious,
      nested: { score: 7, marker: '[Circular]' },
    });
    const { inspector, shadow, tab } = fixture(snapshot({ state }));
    const panel = tab('State');
    expect(panel.textContent).toMatch(/read.only/i);
    expect(panel.textContent).toContain('true');
    expect(panel.textContent).toContain('null');
    expect(panel.textContent).toContain(JSON.stringify(malicious));
    expect(panel.querySelector('img')).toBeNull();
    expect(
      panel.querySelector('input, textarea, [contenteditable="true"]'),
    ).toBeNull();
    const details = Array.from(panel.querySelectorAll('details')).find(
      (element) =>
        element.querySelector('summary')?.textContent?.includes('nested'),
    )!;
    expect(details).toBeDefined();
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    inspector.render(
      snapshot({
        state: readonlySnapshot({
          ...(state as object),
          nested: { score: 8, marker: '[Circular]' },
        }),
      }),
    );
    const updated = Array.from(shadow.querySelectorAll('details')).find(
      (element) =>
        element.querySelector('summary')?.textContent?.includes('nested'),
    )!;
    expect(updated.open).toBe(true);
    expect(updated.textContent).toContain('8');
    expect(state).toEqual({
      count: 3,
      enabled: true,
      empty: null,
      message: malicious,
      nested: { score: 7, marker: '[Circular]' },
    });
  });

  it('distinguishes empty objects and arrays while reconciling empty and populated state', () => {
    const { inspector, tab } = fixture(
      snapshot({ state: readonlySnapshot({}) }),
    );
    const panel = tab('State');
    const state = panel.querySelector<HTMLElement>('#state')!;
    expect(state.textContent).toBe('Object {0}');
    inspector.render(snapshot({ state: readonlySnapshot({ count: 1 }) }));
    expect(state.textContent).toContain('count');
    expect(state.textContent).not.toContain('Object {0}');
    inspector.render(snapshot({ state: readonlySnapshot({}) }));
    expect(state.textContent).toBe('Object {0}');
    expect(state.querySelector('.property-row')).toBeNull();
    inspector.render(snapshot({ state: readonlySnapshot([]) }));
    expect(state.textContent).toBe('Array [0]');
    inspector.render(snapshot({ state: readonlySnapshot(['entry']) }));
    expect(state.textContent).toContain('"entry"');
    expect(state.textContent).not.toContain('Array [0]');
    inspector.render(snapshot({ state: readonlySnapshot([]) }));
    expect(state.textContent).toBe('Array [0]');
    expect(state.querySelector('.property-row')).toBeNull();
  });

  it('keeps bracketed business values quoted and typed as strings', () => {
    const { tab } = fixture(
      snapshot({
        state: readonlySnapshot({
          serialized: '[1,2]',
          markerLike: '[Circular]',
        }),
      }),
    );
    const panel = tab('State');
    const values = Array.from(
      panel.querySelectorAll<HTMLElement>('.property-value'),
    );
    expect(values.map((value) => value.textContent)).toEqual([
      '"[1,2]"',
      '"[Circular]"',
    ]);
    for (const value of values)
      expect(value.classList.contains('value-string')).toBe(true);
    expect(panel.querySelector('details')).toBeNull();
  });

  it('preserves the active search input and tree scroll during sampled updates', () => {
    const { inspector, shadow, tree, search, filter } = fixture();
    search.focus();
    filter('counter');
    tree.scrollTop = 42;
    inspector.render(snapshot({ state: { count: 4 } }));
    expect(shadow.activeElement).toBe(search);
    expect(search.value).toBe('counter');
    expect(tree.scrollTop).toBe(42);
    expect(tree.textContent).not.toContain('Footer');
  });

  it('shows real sampled metrics and registered animation observations', () => {
    const { tab } = fixture(
      snapshot({
        state: readonlySnapshot({
          currentTime: 275.30000000000007,
          elapsed: 100.123456789,
        }),
        animations: readonlySnapshot([
          {
            id: 'pulse',
            nodeId: 3,
            playState: 'paused',
            currentTime: 275.30000000000007,
            observedFrames: 6,
            observedElapsed: 100.123456789,
          },
        ]),
      }),
    );
    const performance = tab('Performance');
    expect(performance.textContent).toContain('16.5');
    expect(performance.textContent).toContain('0.75');
    expect(performance.textContent).toMatch(/layout/i);
    expect(performance.textContent).toMatch(/interval/i);
    expect(performance.textContent).not.toMatch(/GPU|FPS|component render/i);
    const animations = tab('Animations');
    expect(animations.textContent).toContain('pulse');
    expect(animations.textContent).toContain('paused');
    expect(animations.textContent).toContain('275.3');
    expect(animations.textContent).toContain('100.12');
    expect(animations.textContent).not.toContain('275.30000000000007');
    expect(animations.textContent).not.toContain('100.123456789');
    const state = tab('State');
    expect(state.textContent).toContain('275.30000000000007');
    expect(state.textContent).toContain('100.123456789');
    expect(animations.querySelector('input, select')).toBeNull();
  });

  it('invokes toolbar actions and makes removed controls inert', () => {
    const { inspector, button, refresh, close, select, tree } = fixture();
    const refreshButton = button('Refresh');
    const disconnect = button('Disconnect');
    const node = tree.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    refreshButton.click();
    disconnect.click();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    inspector.remove();
    inspector.remove();
    expect(inspector.host.isConnected).toBe(false);
    refreshButton.click();
    disconnect.click();
    node.click();
    inspector.render(snapshot());
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(document.querySelector('[data-piant-devtools]')).toBeNull();
  });
});
