import { createState, type MountedApp, mount, onError } from '@piant/core';
import {
  type ColorEditorControls,
  ColorEditorPanel,
  type ColorEditorSnapshot,
} from '../../../examples/ui-gallery/src/ColorEditorPanel';

const panels: ReturnType<typeof panel>[] = [];
function panel(name: string) {
  const section = document.createElement('section');
  section.dataset.instance = name;
  const host = document.createElement('div');
  host.style.cssText =
    'width:680px;height:520px;position:relative;transform-origin:top left';
  section.append(host);
  document.body.append(section);
  let mounted: MountedApp | undefined,
    controls: ColorEditorControls | undefined,
    snapshot: ColorEditorSnapshot | undefined;
  let appearance = (_value: boolean) => {};
  function stop() {
    mounted?.destroy();
    mounted = undefined;
    controls = undefined;
  }
  async function start() {
    stop();
    mounted = await mount(() => {
      onError((error) => {
        throw error;
      });
      const [large, setLarge] = createState(false);
      appearance = setLarge;
      return ColorEditorPanel({
        name,
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
    action: (method: keyof ColorEditorControls, value: string | boolean) => {
      const fn = controls?.[method];
      if (fn) (fn as (value: string | boolean) => void)(value);
    },
    width: (width: number) => {
      host.style.width = `${width}px`;
    },
    scale: (scale: number) => {
      host.style.transform = `scale(${scale})`;
    },
  };
}
panels.push(panel('A'), panel('B'));
await Promise.all(panels.map((p) => p.start()));
Object.assign(window, {
  colorPickerFixture: {
    info: () => panels.map((p) => p.info()),
    start: (i: number) => panels[i].start(),
    stop: (i: number) => panels[i].stop(),
    action: (
      i: number,
      method: keyof ColorEditorControls,
      value: string | boolean,
    ) => panels[i].action(method, value),
    appearance: (i: number, value: boolean) => panels[i].appearance(value),
    width: (i: number, width: number) => panels[i].width(width),
    scale: (i: number, scale: number) => panels[i].scale(scale),
  },
});
window.addEventListener(
  'pagehide',
  () => {
    for (const p of panels) p.stop();
  },
  { once: true },
);
