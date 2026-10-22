import { Application, Ticker } from 'pixi.js';
import {
  createState,
  Dynamic,
  Match,
  PRoot,
  render,
  Show,
  Switch,
  Transition,
  View,
} from '../src';

// Sample the actual application framebuffer after every draw. Do not use
// extract.pixels: it renders a second time, which could hide a first-frame bug.
const app = new Application();
await app.init({
  width: 320,
  height: 200,
  background: '#ffffff',
  preference: 'webgl',
  antialias: false,
  resolution: 1,
});
document.querySelector('#canvas')!.append(app.canvas);
const root = new PRoot(app.stage, { width: 320, height: 200 });
const [selected, setSelected] = createState(0);
const colors = ['#ff0000', '#0000ff', '#00ff00'];
const cards = colors.map(
  (backgroundColor, index) => () =>
    View({
      style: {
        position: 'absolute',
        left: 100 - index * 10,
        top: 60 - index * 10,
        width: 120 + index * 20,
        height: 80 + index * 20,
        backgroundColor,
      },
    }),
);
const scenario = new URLSearchParams(location.search).get('case') ?? 'dynamic';
const dispose = render(() => {
  if (scenario === 'show') {
    return Show({
      get when() {
        return selected() === 0;
      },
      get children() {
        return cards[0]();
      },
      get fallback() {
        return cards[1]();
      },
    });
  }
  if (scenario === 'switch') {
    return Switch({
      children: [0, 1].map((index) =>
        Match({
          get when() {
            return selected() === index;
          },
          get children() {
            return cards[index]();
          },
        }),
      ),
      get fallback() {
        return cards[2]();
      },
    });
  }
  const dynamic = Dynamic({
    get component() {
      return cards[selected()];
    },
  });
  if (scenario.startsWith('transition-')) {
    return Transition({
      mode: scenario.slice('transition-'.length) as
        'out-in' | 'in-out' | 'parallel',
      children: dynamic,
      // Keep the outgoing card for a real frame, including superseded exits.
      onExit: (_element, done) => requestAnimationFrame(() => done()),
      onEnter: (_element, done) => requestAnimationFrame(() => done()),
    });
  }
  return dynamic;
}, root);
let changes = 0;
function toggle() {
  changes++;
  setSelected((value) => (value + 1) % 3);
}
document.querySelector('#toggle')!.addEventListener('click', toggle);
const copy = document.createElement('canvas');
copy.width = 320;
copy.height = 200;
const context = copy.getContext('2d', { willReadFrequently: true })!;
type Frame = {
  frame: number;
  changes: number;
  selected: number;
  dirty: boolean;
  center: number[];
  mismatches: number;
  ok: boolean;
};
const frames: Frame[] = [];
const screenshots: { frame: number; ok: boolean; image: string }[] = [];
const capturedGoodChanges = new Set<number>();
const draw = app.renderer.render.bind(app.renderer);
app.renderer.render = ((...args: Parameters<typeof draw>) => {
  draw(...args);
  context.drawImage(app.canvas, 0, 0);
  const pixels = context.getImageData(0, 0, 320, 200).data;
  // Expected pixels use declared card rectangles, not computed Yoga/Pixi bounds.
  // During transitions the logical tree determines the allowed overlap/order.
  const rectangles = root._children.filter((node) => node._layoutStyle.width);
  let mismatches = 0;
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 320; x++) {
      let rgb = 0xffffff;
      for (const node of rectangles) {
        const style = node._layoutStyle;
        const left = style.left as number;
        const top = style.top as number;
        if (
          x >= left &&
          x < left + (style.width as number) &&
          y >= top &&
          y < top + (style.height as number)
        ) {
          rgb = Number.parseInt(String(style.backgroundColor).slice(1), 16);
        }
      }
      const offset = (y * 320 + x) * 4;
      if (
        pixels[offset] !== rgb >> 16 ||
        pixels[offset + 1] !== ((rgb >> 8) & 255) ||
        pixels[offset + 2] !== (rgb & 255) ||
        pixels[offset + 3] !== 255
      ) {
        mismatches++;
      }
    }
  }
  const ok = mismatches === 0;
  const center = Array.from(
    pixels.slice((100 * 320 + 160) * 4, (100 * 320 + 160) * 4 + 4),
  );
  const frame = frames.length;
  frames.push({
    frame,
    changes,
    selected: selected(),
    dirty: root._isDirty,
    center,
    mismatches,
    ok,
  });
  if (
    (!ok && screenshots.filter((item) => !item.ok).length < 3) ||
    (ok && capturedGoodChanges.size < 4 && !capturedGoodChanges.has(changes))
  ) {
    screenshots.push({ frame, ok, image: copy.toDataURL() });
    if (ok) capturedGoodChanges.add(changes);
  }
  document.querySelector('#result')!.textContent = JSON.stringify({
    scenario,
    frames: frames.length,
    bad: frames.filter((f) => !f.ok).length,
  });
}) as typeof app.renderer.render;
Object.assign(window, {
  fixture: {
    app,
    root,
    frames,
    screenshots,
    toggle,
    manual() {
      app.stop();
      Ticker.shared.stop();
    },
    draw() {
      app.render();
    },
    // A mutation after the shared layout callback must still reach this draw.
    lateUpdate() {
      Ticker.shared.update(performance.now());
      toggle();
      app.render();
    },
    destroy() {
      dispose();
      root.destroyRecursive();
      app.destroy(true, { children: true });
    },
  },
});
