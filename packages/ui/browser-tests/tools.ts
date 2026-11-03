import {
  createState,
  type MountedApp,
  mount,
  onError,
  type PInput,
} from '@piant/core';
import { SearchField, UIProvider } from '@piant/ui';
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
// Dedicated callback teardown cases are created only when the verifier asks.
// Production examples stay unchanged, and the same fixture is copied into the
// isolated tarball consumer by verifyPackage.mjs.
type SearchTeardownStage = 'value' | 'clear' | 'key';
type SearchTeardownTarget = 'owner' | 'input';
function searchLifecycle() {
  let active:
    | {
        host: HTMLDivElement;
        mounted: MountedApp;
        input: PInput;
        state: {
          events: string[];
          destroyed: boolean;
          focusAfterDestroy: number;
          nativeFocusAfterDestroy: number;
        };
      }
    | undefined;
  function stop() {
    if (!active) return;
    active.mounted.destroy();
    active.host.remove();
    active = undefined;
  }
  return {
    async start(stage: SearchTeardownStage, target: SearchTeardownTarget) {
      stop();
      const host = document.createElement('div');
      host.dataset.searchLifecycle = '';
      host.style.cssText = 'width:340px;height:100px;position:relative';
      document.body.append(host);
      const state = {
        events: [] as string[],
        destroyed: false,
        focusAfterDestroy: 0,
        nativeFocusAfterDestroy: 0,
      };
      let input!: PInput;
      let mounted!: MountedApp;
      function destroyFromCallback() {
        state.destroyed = true;
        if (target === 'owner') mounted.destroy();
        else input.destroyRecursive();
      }
      mounted = await mount(
        () =>
          UIProvider({
            children: () =>
              SearchField({
                'aria-label': 'Lifecycle search',
                clearLabel: 'Lifecycle clear',
                defaultValue: 'clear me',
                ref(node) {
                  input = node;
                  const focus = node.focus.bind(node);
                  node.focus = (options) => {
                    if (state.destroyed || node.isDestroyed)
                      state.focusAfterDestroy++;
                    focus(options);
                  };
                  const nativeFocus = node.element.focus.bind(node.element);
                  node.element.focus = (options) => {
                    if (state.destroyed || node.isDestroyed)
                      state.nativeFocusAfterDestroy++;
                    nativeFocus(options);
                  };
                },
                onValueChange(value) {
                  state.events.push(`value:${value}`);
                  if (stage === 'value') destroyFromCallback();
                },
                onClear() {
                  state.events.push('clear');
                  if (stage === 'clear') destroyFromCallback();
                },
                onKeyDown(event) {
                  state.events.push(`key:${event.key}`);
                  if (stage === 'key') destroyFromCallback();
                },
                onSearch() {
                  state.events.push('search');
                },
              }),
          }),
        host,
      );
      active = { host, mounted, input, state };
    },
    snapshot() {
      if (!active) return undefined;
      return {
        ...active.state,
        events: [...active.state.events],
        inputDestroyed: active.input.isDestroyed,
        inputConnected: active.input.element.isConnected,
      };
    },
    stop,
  };
}
const lifecycle = searchLifecycle();
panels.push(panel('A'), panel('B'));
await Promise.all(panels.map((p) => p.start()));
Object.assign(window, {
  toolFixture: {
    info: () => panels.map((p) => p.info()),
    lifecycleStart: (
      stage: SearchTeardownStage,
      target: SearchTeardownTarget,
    ) => lifecycle.start(stage, target),
    lifecycleSnapshot: () => lifecycle.snapshot(),
    lifecycleStop: () => lifecycle.stop(),
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
    lifecycle.stop();
    for (const p of panels) p.stop();
  },
  { once: true },
);
