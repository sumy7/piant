import { TanStackDevtoolsCore } from '@tanstack/devtools';
import type { DevtoolsSnapshot } from './types';

function createInspector(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  close: () => void,
) {
  const host = mount.ownerDocument.createElement('aside');
  host.setAttribute('aria-label', 'Piant DevTools');
  host.dataset.piantDevtools = '';
  host.style.cssText =
    'display:block;height:100%;min-height:0;font:12px/1.5 monospace;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    *{box-sizing:border-box}:host{color:#e2e8f0;background:#0f172a}:host([data-theme=light]){color:#0f172a;background:#f8fafc}:host([data-theme=light]) button{background:#e2e8f0;border-color:#94a3b8} header{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #475569} strong{flex:1} button{font:inherit;color:inherit;background:#1e293b;border:1px solid #475569;border-radius:4px;cursor:pointer;padding:4px 8px} button:focus-visible{outline:2px solid #38bdf8} main{padding:10px;height:calc(100% - 50px);overflow:auto;display:grid;grid-template-columns:minmax(160px,1fr) minmax(200px,2fr);gap:16px} h2,summary{font-size:12px;margin:8px 0;color:#7dd3fc} section{min-width:0} nav{max-height:100%;overflow:auto} nav button{display:block;width:100%;text-align:left;margin:2px 0} nav button[aria-pressed=true]{border-color:#38bdf8;background:#164e63} pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0} p{margin:6px 0;color:#94a3b8}
    </style><header><strong>Piant DevTools</strong><button type="button" id="refresh">Refresh</button><button type="button" id="close" aria-label="Disconnect Piant DevTools">Disconnect</button></header><main><section><h2>PNode element tree</h2><p>Rendered elements · not component ownership</p><nav aria-label="PNode element tree"></nav><p id="limit"></p></section><section><h2>Selection · style / layout</h2><pre id="selection"></pre><h2>Read-only state</h2><pre id="state"></pre><details open><summary>Performance · layout / frame intervals</summary><pre id="stats"></pre><pre id="timeline"></pre></details><details open><summary>Registered animations</summary><pre id="animations"></pre></details></section></main>`;
  const refreshButton = shadow.getElementById('refresh')!;
  const closeButton = shadow.getElementById('close')!;
  refreshButton.addEventListener('click', refresh);
  closeButton.addEventListener('click', close);
  const nav = shadow.querySelector('nav')!;
  let treeKey = '';
  function render(snapshot: DevtoolsSnapshot) {
    const key = JSON.stringify([snapshot.elements, snapshot.selectedId]);
    if (treeKey !== key) {
      treeKey = key;
      nav.replaceChildren();
      for (const node of snapshot.elements) {
        const button = mount.ownerDocument.createElement('button');
        button.type = 'button';
        button.textContent = `${'  '.repeat(Math.min(node.depth, 20))}${node.name} #${node.id}`;
        button.setAttribute(
          'aria-pressed',
          String(node.id === snapshot.selectedId),
        );
        button.addEventListener('click', () => select(node.id));
        nav.appendChild(button);
      }
    }
    shadow.getElementById('limit')!.textContent = snapshot.truncated
      ? 'Tree truncated at maxNodes.'
      : `${snapshot.elements.length} elements`;
    for (const key of ['selection', 'state', 'stats', 'animations'] as const) {
      shadow.getElementById(key)!.textContent = JSON.stringify(
        snapshot[key],
        null,
        2,
      );
    }
    shadow.getElementById('timeline')!.textContent =
      `Recent layout updates (ms)\n${snapshot.timeline
        .slice(-10)
        .map(
          (event) =>
            `${event.time.toFixed(1)}: ${event.duration.toFixed(2)} ms`,
        )
        .join('\n')}`;
  }
  mount.appendChild(host);
  return {
    host,
    render,
    remove: () => {
      refreshButton.removeEventListener('click', refresh);
      closeButton.removeEventListener('click', close);
      shadow.replaceChildren();
      host.remove();
    },
  };
}

/** Use the framework-independent TanStack shell, docked in the current page. */
export function createPanel(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  disconnect: () => void,
  onActiveChange: (active: boolean) => void,
  defaultOpen = true,
) {
  const host = mount.ownerDocument.createElement('div');
  host.dataset.piantDevtoolsHost = '';
  mount.appendChild(host);
  let inspector: ReturnType<typeof createInspector> | undefined;
  let snapshot: DevtoolsSnapshot | undefined;
  let removed = false;
  const release = () => {
    onActiveChange(false);
    inspector?.remove();
    inspector = undefined;
  };
  const devtools = new TanStackDevtoolsCore({
    config: {
      defaultOpen,
      hideUntilHover: false,
      triggerMode: 'fixed',
      position: 'bottom-right',
      panelLocation: 'bottom',
    },
    eventBusConfig: { connectToServerBus: false },
    plugins: [
      {
        id: 'piant',
        name: 'Piant',
        defaultOpen: true,
        render(element, props) {
          if (removed) return;
          if (inspector?.host.parentElement !== element) {
            release();
            inspector = createInspector(element, select, refresh, disconnect);
          }
          inspector.host.dataset.theme = props.theme;
          onActiveChange(props.devtoolsOpen);
          if (snapshot) inspector.render(snapshot);
        },
        destroy: release,
      },
    ],
  });
  devtools.mount(host);
  return {
    render(value: DevtoolsSnapshot) {
      snapshot = value;
      inspector?.render(value);
    },
    remove() {
      if (removed) return;
      removed = true;
      try {
        // Also cancels the shell's pending asynchronous mount.
        devtools.unmount();
      } finally {
        release();
        host.remove();
      }
    },
  };
}
