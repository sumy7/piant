import { createState, type MountedApp, mount, onError } from '@piant/core';
import {
  type CollectionControls,
  CollectionPanel,
  type CollectionSnapshot,
} from '../../../examples/ui-gallery/src/CollectionPanel';

const panels: ReturnType<typeof panel>[] = [];
function panel(name: string, kind: 'list' | 'tree') {
  const section = document.createElement('section');
  section.dataset.instance = name;
  const host = document.createElement('div');
  host.style.cssText =
    'width:680px;height:560px;position:relative;transform-origin:top left';
  section.append(host);
  document.body.append(section);
  let instance: MountedApp | undefined,
    controls: CollectionControls | undefined,
    snapshot: CollectionSnapshot | undefined;
  let appearance = (_v: boolean) => {};
  function stop() {
    instance?.destroy();
    instance = undefined;
    controls = undefined;
  }
  async function start() {
    stop();
    instance = await mount(() => {
      onError((error) => {
        throw error;
      });
      const [large, setLarge] = createState(false);
      appearance = setLarge;
      return CollectionPanel({
        name,
        kind,
        get colorMode() {
          return large() ? 'dark' : 'light';
        },
        get density() {
          return large() ? 'compact' : 'comfortable';
        },
        get fontScale() {
          return large() ? 2 : 1;
        },
        onReady(next) {
          controls = next;
        },
        onStateChange(next) {
          snapshot = next;
        },
      });
    }, host);
  }
  return {
    start,
    stop,
    info: () => snapshot,
    appearance: (value: boolean) => appearance(value),
    action: (action: keyof Omit<CollectionControls, 'api'>, key?: string) => {
      const fn = controls?.[action];
      if (fn) (fn as (key?: string) => void)(key);
    },
    scroll: (index: number) => controls?.api.scrollToIndex(index, 'start'),
    key: (key: string) => controls?.api.scrollToKey(key, 'start'),
    offset: (offset: number) => controls?.api.scrollToOffset(offset),
    range: () => controls?.api.range(),
    width: (width: number) => {
      host.style.width = `${width}px`;
    },
    scale: (scale: number) => {
      host.style.transform = `scale(${scale})`;
    },
  };
}
panels.push(panel('A', 'list'), panel('B', 'tree'));
await Promise.all(panels.map((panel) => panel.start()));
Object.assign(window, {
  collectionFixture: {
    info: () => panels.map((panel) => panel.info()),
    range: (n: number) => panels[n].range(),
    start: (n: number) => panels[n].start(),
    stop: (n: number) => panels[n].stop(),
    action: (
      n: number,
      action: keyof Omit<CollectionControls, 'api'>,
      key?: string,
    ) => panels[n].action(action, key),
    scroll: (n: number, index: number) => panels[n].scroll(index),
    key: (n: number, key: string) => panels[n].key(key),
    offset: (n: number, offset: number) => panels[n].offset(offset),
    appearance: (n: number, large: boolean) => panels[n].appearance(large),
    width: (n: number, width: number) => panels[n].width(width),
    scale: (n: number, scale: number) => panels[n].scale(scale),
  },
});
window.addEventListener(
  'pagehide',
  () => {
    for (const panel of panels) panel.stop();
  },
  { once: true },
);
