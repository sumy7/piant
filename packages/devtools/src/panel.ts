import type { DevtoolsSnapshot } from './types';

export function createPanel(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  close: () => void,
) {
  const host = mount.ownerDocument.createElement('aside');
  host.setAttribute('aria-label', 'Piant DevTools');
  host.dataset.piantDevtools = '';
  host.style.cssText =
    'position:fixed;right:12px;top:12px;width:min(360px,calc(100vw - 24px));max-height:85vh;z-index:2147483647;color:#e2e8f0;background:#0f172a;border:1px solid #64748b;border-radius:8px;box-shadow:0 8px 24px #0006;font:12px/1.5 monospace;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    *{box-sizing:border-box} header{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #475569} strong{flex:1} button{font:inherit;color:inherit;background:#1e293b;border:1px solid #475569;border-radius:4px;cursor:pointer;padding:4px 8px} button:focus-visible{outline:2px solid #38bdf8} main{padding:10px;max-height:calc(85vh - 52px);overflow:auto} h2,summary{font-size:12px;margin:8px 0;color:#7dd3fc} nav{max-height:220px;overflow:auto} nav button{display:block;width:100%;text-align:left;margin:2px 0} nav button[aria-pressed=true]{border-color:#38bdf8;background:#164e63} pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0} p{margin:6px 0;color:#94a3b8}
    </style><header><strong>Piant DevTools</strong><button type="button" id="refresh">Refresh</button><button type="button" id="close" aria-label="Close Piant DevTools">×</button></header><main><h2>PNode element tree</h2><p>Rendered elements · not component ownership</p><nav aria-label="PNode element tree"></nav><p id="limit"></p><h2>Selection · style / layout</h2><pre id="selection"></pre><h2>Read-only state</h2><pre id="state"></pre><details open><summary>Performance · layout / frame intervals</summary><pre id="stats"></pre><pre id="timeline"></pre></details><details open><summary>Registered animations</summary><pre id="animations"></pre></details></main>`;
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
