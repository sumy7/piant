import { createState, mount, type PNode, Text, View } from '@piant/core';
import {
  createOverlay,
  OverlayHost,
  type OverlayState,
  Slider,
  Surface,
  TextField,
  UIProvider,
} from '../dist/index.js';

const fixtures: Record<string, unknown> = {};
for (const id of ['a', 'b']) {
  const [value, setValue] = createState(0);
  const [disabled, setDisabled] = createState(false);
  const [orientation, setOrientation] = createState<'horizontal' | 'vertical'>(
    'horizontal',
  );
  const [dir, setDir] = createState<'ltr' | 'rtl'>('ltr');
  const [min, setMin] = createState(-1);
  const [max, setMax] = createState(1);
  const [step, setStep] = createState(0.1);
  const [accept, setAccept] = createState(true);
  const [shown, setShown] = createState(true);
  const [dark, setDark] = createState(false);
  const events: number[] = [];
  const verticalEvents: number[] = [];
  let modal!: OverlayState;
  let slider: PNode;
  let outer: PNode;
  let inner: PNode;
  const instance = await mount(
    () =>
      UIProvider({
        reducedMotion: false,
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        children: () =>
          OverlayHost({
            children: () => {
              modal = createOverlay({
                width: 240,
                height: 120,
                modal: true,
                children: () =>
                  Surface({
                    style: { width: '100%', height: '100%' },
                    children: TextField({
                      'aria-label': `modal-${id}`,
                      defaultValue: 'Modal boundary',
                    }),
                  }),
              });
              return View({
                style: { padding: 24, width: '100%', height: '100%', gap: 16 },
                children: [
                  Text({
                    children: `Slider ${id}: drag, keys, cancellation and transforms`,
                    style: { fontSize: 16 },
                  }),
                  View({
                    ref: (node) => {
                      outer = node;
                    },
                    style: { width: 460, height: 60 },
                    children: View({
                      ref: (node) => {
                        inner = node;
                      },
                      style: { width: 400, height: 40 },
                      children: Slider({
                        name: `speed-${id}`,
                        description: 'Decimal controlled speed',
                        get value() {
                          return value();
                        },
                        get min() {
                          return min();
                        },
                        get max() {
                          return max();
                        },
                        get step() {
                          return step();
                        },
                        get disabled() {
                          return disabled();
                        },
                        get orientation() {
                          return orientation();
                        },
                        get dir() {
                          return dir();
                        },
                        valueText: (next) => `${next}x`,
                        onValueChange(next) {
                          events.push(next);
                          if (accept()) setValue(next);
                        },
                        get style() {
                          return {
                            width: 400,
                            height: 40,
                            display: shown()
                              ? ('flex' as const)
                              : ('none' as const),
                          };
                        },
                        ref: (node) => {
                          slider = node;
                        },
                      }),
                    }),
                  }),
                  Slider({
                    name: `vertical-${id}`,
                    orientation: 'vertical',
                    min: 0,
                    max: 10,
                    step: 2,
                    defaultValue: 4,
                    style: { height: 150 },
                    onValueChange: (next) => verticalEvents.push(next),
                  }),
                  Slider({
                    name: `disabled-${id}`,
                    disabled: true,
                    defaultValue: 35,
                    style: { width: 300 },
                  }),
                ],
              });
            },
          }),
      }),
    document.querySelector<HTMLElement>(`#slider-${id}`)!,
  );
  fixtures[id] = {
    instance,
    modal,
    events,
    verticalEvents,
    value,
    setValue,
    setDisabled,
    setOrientation,
    setDir,
    setMin,
    setMax,
    setStep,
    setAccept,
    setShown,
    setDark,
    slider: () => slider,
    outer: () => outer,
    inner: () => inner,
    point(fraction: number, cross = 0) {
      instance.app.render();
      const width = slider._layoutNode.getComputedWidth();
      const height = slider._layoutNode.getComputedHeight();
      const vertical = orientation() === 'vertical';
      const main = vertical ? height : width;
      const side = vertical ? width : height;
      const radius = Math.max(0, Math.min(10, side / 2 - 5, main / 2 - 5));
      const inset = radius + 5;
      const p = slider._view.toGlobal({
        x: vertical
          ? width / 2 + cross
          : inset + fraction * (width - 2 * inset),
        y: vertical
          ? inset + fraction * (height - 2 * inset)
          : height / 2 + cross,
      });
      const rect = instance.canvas.getBoundingClientRect();
      return {
        x: rect.left + (p.x * rect.width) / instance.app.screen.width,
        y: rect.top + (p.y * rect.height) / instance.app.screen.height,
      };
    },
  };
}
Object.assign(window, { sliderFixture: fixtures });
