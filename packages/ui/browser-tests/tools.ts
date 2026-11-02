import { createState, type MountedApp, mount, onError } from '@piant/core';
import {
  ToolPanel,
  type ToolSnapshot,
} from '../../../examples/ui-gallery/src/ToolPanel';

const panels: Array<ReturnType<typeof panel>> = [];
function panel(name: string) {
  const section = document.createElement('section');
  section.dataset.instance = name;
  const host = document.createElement('div');
  host.style.cssText =
    'width:700px;height:460px;position:relative;transform-origin:top left';
  section.append(host);
  document.body.append(section);
  let mounted: MountedApp | undefined;
  let state: ToolSnapshot | undefined;
  let setAppearance = (_v: boolean) => {};
  let setDisabled = (_v: boolean) => {};
  function stop() {
    mounted?.destroy();
    mounted = undefined;
  }
  async function start() {
    stop();
    mounted = await mount(() => {
      onError((e) => {
        throw e;
      });
      const [dark, updateDark] = createState(false);
      const [disabled, updateDisabled] = createState(false);
      setAppearance = updateDark;
      setDisabled = updateDisabled;
      return ToolPanel({
        name,
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        get density() {
          return dark() ? 'compact' : 'comfortable';
        },
        get fontScale() {
          return dark() ? 2 : 1;
        },
        get disabled() {
          return disabled();
        },
        onStateChange(next) {
          state = next;
        },
      });
    }, host);
  }
  return {
    name,
    start,
    stop,
    info: () => state,
    appearance: (dark: boolean) => setAppearance(dark),
    disable: (value: boolean) => setDisabled(value),
    width: (value: number) => {
      host.style.width = `${value}px`;
    },
    scale: (value: number) => {
      host.style.transform = `scale(${value})`;
    },
  };
}
panels.push(panel('A'), panel('B'));
await Promise.all(panels.map((p) => p.start()));
Object.assign(window, {
  toolFixture: {
    info: () => panels.map((p) => p.info()),
    start: (n: number) => panels[n].start(),
    stop: (n: number) => panels[n].stop(),
    appearance: (n: number, value: boolean) => panels[n].appearance(value),
    disable: (n: number, value: boolean) => panels[n].disable(value),
    width: (n: number, value: number) => panels[n].width(value),
    scale: (n: number, value: number) => panels[n].scale(value),
  },
});
window.addEventListener(
  'pagehide',
  () => {
    for (const p of panels) p.stop();
  },
  { once: true },
);
