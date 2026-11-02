import { createState, type MountedApp, mount, onError } from '@piant/core';
import {
  OverlayWorkflow,
  type OverlayWorkflowSnapshot,
} from './OverlayWorkflow';
import './style.css';

const page = document.createElement('main');
page.innerHTML = `<header class="page-header"><div><p class="eyebrow">PIANT / OVERLAY WORKFLOW</p><h1>编辑、确认与反馈</h1><p class="intro">两个独立工作区：编辑文档，在嵌套菜单和选择中浏览，明确确认操作，再查看或撤销本地状态通知。</p></div><a href="../../ui/workflow.html">组合指南 ↗</a></header><div class="gallery-actions"><span>本例不连接真实存储或归档服务，重挂载恢复初始状态。</span><button type="button" id="unmount-all">卸载全部工作区</button><button type="button" id="remount-all">重挂载全部工作区</button></div><div class="gallery-grid"></div><details class="diagnostics"><summary>查看工作区状态</summary><pre></pre></details>`;
document.body.append(page);
if (!location.pathname.startsWith('/examples/ui-gallery'))
  page.querySelector<HTMLAnchorElement>('a')!.href =
    'https://piant.sumygg.com/ui/workflow';
const grid = page.querySelector<HTMLElement>('.gallery-grid')!;
const report = () => {
  page.querySelector('pre')!.textContent = JSON.stringify(
    panels.map((panel) => panel.info()),
    null,
    2,
  );
};
type Appearance = {
  colorMode: 'light' | 'dark';
  density: 'comfortable' | 'compact';
  fontScale: number;
  reducedMotion: boolean;
};
type Panel = { start(): Promise<void>; stop(): void; info(): unknown };
const panels: Panel[] = [];
function panel(name: string): Panel {
  const section = document.createElement('section');
  section.className = 'instance';
  section.dataset.instance = name;
  section.innerHTML = `<header class="instance-header"><h2>工作区 ${name}</h2><span class="instance-badge">独立 Canvas</span></header><div class="instance-tools"></div><div class="canvas-frame"><div class="canvas-host" role="group" aria-label="工作区 ${name}"></div><p class="unmounted" hidden>工作区已卸载。</p></div><p class="instance-summary"></p>`;
  grid.append(section);
  const target = section.querySelector<HTMLElement>('.canvas-host')!;
  target.style.height = '720px';
  const empty = section.querySelector<HTMLElement>('.unmounted')!;
  const summary = section.querySelector<HTMLElement>('.instance-summary')!;
  let mounted: MountedApp | undefined,
    pending: Promise<MountedApp> | undefined,
    abort: AbortController | undefined;
  let update: ((value: Appearance) => void) | undefined;
  let appearance: Appearance = {
    colorMode: name === 'A' ? 'light' : 'dark',
    density: 'comfortable',
    fontScale: 1,
    reducedMotion: true,
  };
  let generation = 0,
    mounts = 0,
    destroys = 0,
    narrow = false,
    scaled = false;
  let snapshot: OverlayWorkflowSnapshot | undefined;
  const buttons = new Map<string, HTMLButtonElement>();
  function button(label: string, action: () => void) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = `${label} ${name}`;
    el.onpointerdown = (e) => e.preventDefault();
    el.onclick = action;
    section.querySelector('.instance-tools')!.append(el);
    buttons.set(label, el);
  }
  function sync() {
    update?.(appearance);
    buttons
      .get('暗色')
      ?.setAttribute('aria-pressed', String(appearance.colorMode === 'dark'));
    buttons
      .get('紧凑')
      ?.setAttribute('aria-pressed', String(appearance.density === 'compact'));
    buttons
      .get('字号 200%')
      ?.setAttribute('aria-pressed', String(appearance.fontScale === 2));
    buttons
      .get('减少动画')
      ?.setAttribute('aria-pressed', String(appearance.reducedMotion));
    report();
  }
  function stop() {
    generation++;
    abort?.abort();
    abort = undefined;
    if (mounted) {
      mounted.destroy();
      destroys++;
    }
    mounted = undefined;
    update = undefined;
    target.hidden = true;
    empty.hidden = false;
    section.removeAttribute('aria-busy');
    if (target.querySelector('canvas,input,button,[role]'))
      throw new Error(`工作区${name}卸载后仍有DOM`);
    summary.textContent = '本地会话已结束。';
    report();
  }
  async function start() {
    stop();
    const current = generation;
    const signal = new AbortController();
    abort = signal;
    await pending?.catch(() => undefined);
    if (signal.signal.aborted || current !== generation) return;
    target.hidden = false;
    empty.hidden = true;
    section.setAttribute('aria-busy', 'true');
    snapshot = undefined;
    let request: Promise<MountedApp> | undefined;
    try {
      request = mount(
        () => {
          onError((error) => {
            console.error(error);
            section.dataset.failure = String(error);
          });
          const [config, setConfig] = createState(appearance);
          update = setConfig;
          return OverlayWorkflow({
            name,
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
            onStateChange(value) {
              if (signal.signal.aborted || current !== generation) return;
              snapshot = value;
              summary.textContent = `已保存 ${value.saves} 次 · 已归档 ${value.archives} 次 · 撤销 ${value.undoCount} 次`;
              report();
            },
          });
        },
        target,
        {
          signal: signal.signal,
          resolution: Math.min(devicePixelRatio || 1, 2),
        },
      );
      pending = request;
      const result = await request;
      if (signal.signal.aborted || current !== generation) {
        result.destroy();
        return;
      }
      mounted = result;
      mounts++;
      section.removeAttribute('aria-busy');
      sync();
    } catch (error) {
      if (signal.signal.aborted || current !== generation) return;
      section.dataset.failure = String(error);
      section.removeAttribute('aria-busy');
      console.error(error);
    } finally {
      if (pending === request) pending = undefined;
      report();
    }
  }
  button('暗色', () => {
    appearance = {
      ...appearance,
      colorMode: appearance.colorMode === 'dark' ? 'light' : 'dark',
    };
    sync();
  });
  button('紧凑', () => {
    appearance = {
      ...appearance,
      density: appearance.density === 'compact' ? 'comfortable' : 'compact',
    };
    sync();
  });
  button('字号 200%', () => {
    appearance = {
      ...appearance,
      fontScale: appearance.fontScale === 1 ? 2 : 1,
    };
    sync();
  });
  button('减少动画', () => {
    appearance = { ...appearance, reducedMotion: !appearance.reducedMotion };
    sync();
  });
  button('窄容器', () => {
    narrow = !narrow;
    target.style.width = narrow ? 'min(100%, 280px)' : '100%';
    buttons.get('窄容器')!.setAttribute('aria-pressed', String(narrow));
    report();
  });
  button('CSS 缩放', () => {
    scaled = !scaled;
    target.style.transform = scaled ? 'scale(0.8)' : '';
    target.style.transformOrigin = 'top left';
    buttons.get('CSS 缩放')!.setAttribute('aria-pressed', String(scaled));
    report();
  });
  button('卸载', stop);
  button('重挂载', () => {
    void start();
  });
  return {
    start,
    stop,
    info: () => ({
      name,
      mounted: Boolean(mounted),
      pending: Boolean(pending),
      generation,
      mounts,
      destroys,
      narrow,
      scaled,
      appearance,
      snapshot,
    }),
  };
}
panels.push(panel('A'), panel('B'));
page.querySelector<HTMLButtonElement>('#unmount-all')!.onclick = () =>
  panels.forEach((panel) => {
    panel.stop();
  });
page.querySelector<HTMLButtonElement>('#remount-all')!.onclick = () => {
  void Promise.all(panels.map((panel) => panel.start()));
};
window.addEventListener(
  'pagehide',
  () =>
    panels.forEach((panel) => {
      panel.stop();
    }),
  { once: true },
);
Object.assign(window, {
  overlayWorkflowFixture: {
    info: () => panels.map((panel) => panel.info()),
    stop: (index: number) => panels[index].stop(),
    start: (index: number) => panels[index].start(),
  },
});
await Promise.all(panels.map((panel) => panel.start()));
