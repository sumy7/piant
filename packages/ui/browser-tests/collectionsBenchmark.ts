import {
  For,
  type MountedApp,
  mount,
  type PNode,
  type PScrollView,
  Text,
  View,
} from '@piant/core';

const viewportHeight = 320;
const rowHeight = 32;
const overscan = 2;
const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px;position:relative';
document.body.append(host);
let mounted: MountedApp | undefined;
let scroll: PScrollView | undefined;
let rows = new Map<number, PNode>();
let created = 0;
let disposed = 0;
let maxLive = 0;
let layoutMs = 0;
let scrollTo = (_index: number) => {};
let currentMode = '';
let count = 0;
const frame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));
function nodeCount(node: PNode): number {
  return 1 + node._children.reduce((sum, child) => sum + nodeCount(child), 0);
}
function row(index: number) {
  created++;
  maxLive = Math.max(maxLive, created - disposed);
  const node = View({
    style: {
      width: '100%',
      height: rowHeight,
      minHeight: rowHeight,
      flexShrink: 0,
      paddingInline: 8,
      justifyContent: 'center',
    },
    children: Text({
      style: { fontSize: 14, lineHeight: 20, color: '#0f172a' },
      children: `Layer ${index + 1}`,
    }),
  }) as PNode;
  rows.set(index, node);
  let released = false;
  node.onDestroy(() => {
    if (released) return;
    released = true;
    disposed++;
    if (rows.get(index) === node) rows.delete(index);
  });
  return node;
}
function stop() {
  mounted?.destroy();
  mounted = undefined;
  scroll = undefined;
  scrollTo = () => {};
  return {
    created,
    disposed,
    live: created - disposed,
    retainedRows: rows.size,
    hostChildren: host.childElementCount,
  };
}
async function start(mode: 'baseline' | 'virtual', total = 10000) {
  stop();
  rows = new Map();
  created = 0;
  disposed = 0;
  maxLive = 0;
  count = total;
  currentMode = mode;
  const data = Array.from({ length: total }, (_, index) => index);
  const ui = mode === 'virtual' ? await import('@piant/ui') : undefined;
  const begin = performance.now();
  if (mode === 'baseline') {
    const { ScrollView } = await import('@piant/core');
    mounted = await mount(
      () =>
        ScrollView({
          ref: (node) => {
            scroll = node;
          },
          style: { width: '100%', height: viewportHeight, minHeight: 0 },
          children: For({ each: data, children: row }),
        }),
      host,
    );
    scrollTo = (index) => {
      const target = rows.get(index);
      if (target) scroll?.scrollIntoView(target, { block: 'start' });
      scroll?.update();
    };
  } else {
    if (!ui) throw new Error('Missing UI module.');
    mounted = await mount(
      () =>
        ui.UIProvider({
          children: () =>
            ui.VirtualList({
              label: 'Benchmark layers',
              items: data,
              getKey: (index) => String(index),
              getLabel: (index) => `Layer ${index + 1}`,
              estimateHeight: rowHeight,
              measure: false,
              overscan,
              style: { width: '100%', height: viewportHeight, minHeight: 0 },
              children: (_item, index) => row(index()),
              apiRef(api) {
                scrollTo = (index) => api.scrollToIndex(index, 'start');
              },
            }),
        }),
      host,
    );
  }
  const mountMs = performance.now() - begin;
  const layoutBegin = performance.now();
  mounted.root.doLayout();
  mounted.app.render();
  layoutMs = performance.now() - layoutBegin;
  await frame();
  await frame();
  return {
    mode,
    total,
    viewportHeight,
    rowHeight,
    overscan,
    mountMs,
    initialLayoutRenderMs: layoutMs,
    created,
    disposed,
    live: created - disposed,
    maxLive,
    nodeCount: nodeCount(mounted.root),
    browser: navigator.userAgent,
  };
}
async function sample(frames = 90, warmup = 10) {
  if (!mounted) throw new Error('Start the benchmark first.');
  const timings: {
    index: number;
    workMs: number;
    frameMs: number;
    live: number;
    nodeCount: number;
  }[] = [];
  let previous = await frame();
  for (let i = 0; i < frames + warmup; i++) {
    const index = Math.min(count - 10, (i * 37) % count);
    const begin = performance.now();
    scrollTo(index);
    mounted.root.doLayout();
    mounted.app.render();
    const workMs = performance.now() - begin;
    const timestamp = await frame();
    if (i >= warmup)
      timings.push({
        index,
        workMs,
        frameMs: timestamp - previous,
        live: created - disposed,
        nodeCount: nodeCount(mounted.root),
      });
    previous = timestamp;
  }
  return {
    mode: currentMode,
    frames,
    warmup,
    timings,
    created,
    disposed,
    live: created - disposed,
    maxLive,
    nodeCount: nodeCount(mounted.root),
  };
}
Object.assign(window, { collectionsBenchmark: { start, sample, stop } });
window.addEventListener('pagehide', stop, { once: true });
