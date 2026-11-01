import { createState, type MountedApp, mount, onError } from '@piant/core';
import {
  SettingsPanel,
  type SettingsPanelProps,
  type SettingsSnapshot,
} from './SettingsPanel';
import './style.css';

const page = document.createElement('main');
page.innerHTML = `
  <header class="page-header">
    <div><p class="eyebrow">PIANT / UI GALLERY</p><h1>让偏好成为界面</h1>
    <p class="intro">同一套组件，两个独立的设置面板。编辑名称、调整提醒与导出质量，再保存你的选择。</p></div>
    <a href="../../ui/gallery.html">组件与验收指南 ↗</a>
  </header>
  <div class="gallery-actions"><span>本页的设置仅保留在当前会话，重新挂载会恢复默认值。</span>
    <button type="button" id="unmount-all">卸载全部</button><button type="button" id="remount-all">重挂载全部</button></div>
  <div class="gallery-grid"></div>
  <p class="lifecycle-status" role="status" aria-live="polite">正在准备独立面板…</p>
  <details class="diagnostics"><summary>查看验收信息</summary><pre></pre></details>
  <footer>Canvas 渲染 · 原生文本编辑 · 实例独立的焦点与状态</footer>`;
document.body.append(page);
if (!location.pathname.startsWith('/examples/ui-gallery'))
  page.querySelector<HTMLAnchorElement>('.page-header a')!.href =
    'https://piant.sumygg.com/ui/introduction';
const grid = page.querySelector<HTMLElement>('.gallery-grid')!;
const lifecycle = page.querySelector<HTMLElement>('.lifecycle-status')!;
const diagnostics = page.querySelector('pre')!;

interface Appearance {
  colorMode: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  fontScale: number;
  reducedMotion: boolean;
}
interface Panel {
  id: string;
  start(): Promise<void>;
  stop(): void;
  info(): object;
}
const panels: Panel[] = [];
function report() {
  diagnostics.textContent = JSON.stringify(
    panels.map((panel) => panel.info()),
    null,
    2,
  );
}
function createPanel(id: string, appearance: Appearance): Panel {
  const section = document.createElement('section');
  section.className = 'instance';
  section.setAttribute('aria-label', `设置实例 ${id}`);
  section.innerHTML = `<header class="instance-header"><div><p class="eyebrow">INSTANCE ${id}</p><h2>设置面板 ${id}</h2></div><span class="instance-badge">独立 Canvas</span></header><div class="instance-tools"></div><div class="canvas-frame"><div class="canvas-host" role="group" aria-label="Canvas ${id}"></div><p class="unmounted" hidden>面板已卸载。重新挂载即可开始新的会话。</p></div><p class="instance-summary"></p>`;
  grid.append(section);
  const host = section.querySelector<HTMLElement>('.canvas-host')!;
  const tools = section.querySelector<HTMLElement>('.instance-tools')!;
  const empty = section.querySelector<HTMLElement>('.unmounted')!;
  const summary = section.querySelector<HTMLElement>('.instance-summary')!;
  let instance: MountedApp | undefined;
  let mounting: Promise<MountedApp> | undefined;
  let controller: AbortController | undefined;
  let update: ((value: Appearance) => void) | undefined;
  let snapshot: SettingsSnapshot | undefined;
  let generation = 0;
  let mountedCount = 0;
  let destroyedCount = 0;
  let pending = false;
  let narrow = false;
  let stopLayout = () => {};
  const buttons = new Map<string, HTMLButtonElement>();
  function button(label: string, action: () => void) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.onpointerdown = (event) => event.preventDefault();
    node.onclick = action;
    tools.append(node);
    buttons.set(label, node);
    return node;
  }
  function syncAppearance() {
    update?.(appearance);
    buttons
      .get(`暗色 ${id}`)
      ?.setAttribute('aria-pressed', String(appearance.colorMode === 'dark'));
    buttons
      .get(`紧凑 ${id}`)
      ?.setAttribute('aria-pressed', String(appearance.density === 'compact'));
    buttons
      .get(`字号 200% ${id}`)
      ?.setAttribute('aria-pressed', String(appearance.fontScale === 2));
    buttons
      .get(`减少动画 ${id}`)
      ?.setAttribute('aria-pressed', String(appearance.reducedMotion));
    report();
  }
  function fitHeight() {
    const root = instance?.root;
    if (!root || root.isDestroyed) return;
    const height = Math.max(
      1,
      Math.ceil(root.firstChild?._layoutNode.getComputedHeight() ?? 0),
    );
    if (Math.abs(host.clientHeight - height) > 1)
      host.style.height = `${height}px`;
  }
  function stop() {
    const hadInstance = Boolean(instance);
    controller?.abort();
    controller = undefined;
    stopLayout();
    stopLayout = () => {};
    instance?.destroy();
    instance = undefined;
    update = undefined;
    pending = false;
    section.removeAttribute('aria-busy');
    if (hadInstance) destroyedCount++;
    if (host.querySelector('canvas,input,button,[role]'))
      throw new Error(`Canvas ${id} left DOM resources after unmount`);
    host.hidden = true;
    empty.hidden = false;
    summary.textContent = '会话已结束，待保存的操作已取消。';
    report();
  }
  async function start() {
    stop();
    const current = ++generation;
    const abort = new AbortController();
    controller = abort;
    pending = true;
    snapshot = undefined;
    host.hidden = false;
    host.style.height = '920px';
    empty.hidden = true;
    section.setAttribute('aria-busy', 'true');
    summary.textContent = '正在加载设置面板…';
    report();
    // An aborted renderer may still be finishing asynchronous initialization.
    // Wait for its cleanup before acquiring the same host again.
    await mounting?.catch(() => undefined);
    if (abort.signal.aborted || current !== generation) return;
    let request: Promise<MountedApp> | undefined;
    try {
      request = mount(
        () => {
          onError((error) => {
            throw error;
          });
          const [config, setConfig] = createState(appearance);
          update = setConfig;
          const props: SettingsPanelProps = {
            title: `个人设置 · ${id}`,
            get colorMode() {
              return config().colorMode;
            },
            get density() {
              return config().density;
            },
            get fontScale() {
              return config().fontScale;
            },
            get reducedMotion() {
              return config().reducedMotion;
            },
            onStateChange(state) {
              if (abort.signal.aborted || current !== generation) return;
              snapshot = state;
              summary.textContent = state.saving
                ? '正在保存本地偏好…'
                : `已保存 ${state.saveCount} 次 · ${state.dirty ? '有未保存的更改' : '当前状态已同步'}`;
              report();
            },
          };
          return SettingsPanel(props);
        },
        host,
        {
          signal: abort.signal,
          resolution: Math.min(devicePixelRatio || 1, 2),
        },
      );
      mounting = request;
      const mounted = await request;
      if (abort.signal.aborted || current !== generation) {
        mounted.destroy();
        return;
      }
      instance = mounted;
      mountedCount++;
      pending = false;
      section.removeAttribute('aria-busy');
      stopLayout = mounted.root.observeLayout(fitHeight);
      mounted.root.doLayout();
      fitHeight();
      lifecycle.textContent = `设置面板 ${id} 已就绪。`;
      syncAppearance();
    } catch (error) {
      if (abort.signal.aborted || current !== generation) return;
      pending = false;
      section.removeAttribute('aria-busy');
      summary.textContent = `加载失败：${error instanceof Error ? error.message : String(error)}`;
      lifecycle.textContent = `设置面板 ${id} 加载失败，可重新挂载。`;
      console.error(error);
      report();
    } finally {
      if (mounting === request) mounting = undefined;
    }
  }
  button(`暗色 ${id}`, () => {
    appearance = {
      ...appearance,
      colorMode: appearance.colorMode === 'dark' ? 'light' : 'dark',
    };
    syncAppearance();
  });
  button(`紧凑 ${id}`, () => {
    appearance = {
      ...appearance,
      density: appearance.density === 'compact' ? 'comfortable' : 'compact',
    };
    syncAppearance();
  });
  button(`字号 200% ${id}`, () => {
    appearance = {
      ...appearance,
      fontScale: appearance.fontScale === 2 ? 1 : 2,
    };
    syncAppearance();
  });
  button(`减少动画 ${id}`, () => {
    appearance = { ...appearance, reducedMotion: !appearance.reducedMotion };
    syncAppearance();
  });
  const narrowButton = button(`窄容器 ${id}`, () => {
    narrow = !narrow;
    host.style.width = narrow ? 'min(100%, 260px)' : '100%';
    narrowButton.setAttribute('aria-pressed', String(narrow));
    report();
  });
  button(`卸载 ${id}`, () => {
    stop();
    lifecycle.textContent = `设置面板 ${id} 已卸载，其余面板仍可操作。`;
  });
  button(`重挂载 ${id}`, () => {
    void start();
  });
  syncAppearance();
  return {
    id,
    start,
    stop,
    info: () => ({
      id,
      mounted: Boolean(instance),
      pending,
      generation,
      mountedCount,
      destroyedCount,
      appearance,
      narrow,
      snapshot,
    }),
  };
}
panels.push(
  createPanel('A', {
    colorMode: 'light',
    density: 'comfortable',
    fontScale: 1,
    reducedMotion: false,
  }),
);
panels.push(
  createPanel('B', {
    colorMode: 'dark',
    density: 'compact',
    fontScale: 1,
    reducedMotion: false,
  }),
);
page.querySelector<HTMLButtonElement>('#unmount-all')!.onclick = () => {
  for (const panel of panels) panel.stop();
  lifecycle.textContent = '全部面板已卸载，Canvas 与表单资源已清理。';
};
page.querySelector<HTMLButtonElement>('#remount-all')!.onclick = () => {
  void Promise.all(panels.map((panel) => panel.start()));
};
window.addEventListener(
  'pagehide',
  () => {
    for (const panel of panels) panel.stop();
  },
  { once: true },
);
await Promise.all(panels.map((panel) => panel.start()));
