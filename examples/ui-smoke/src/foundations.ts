import { createState, mount, PNode, Text } from '@piant/core';
import {
  Badge,
  Icon,
  ProgressBar,
  Separator,
  Spinner,
  Stack,
  Surface,
  UIProvider,
  type UIProviderProps,
  useUITheme,
} from '@piant/ui';
import { Graphics } from 'pixi.js';

const heading = document.createElement('h1');
heading.textContent = 'UI foundations';
const controls = document.createElement('div');
const host = document.createElement('div');
host.style.cssText =
  'width:560px;height:520px;position:relative;transform-origin:top left';
const status = document.createElement('pre');
document.body.append(heading, controls, host, status);

function button(label: string, click: () => void) {
  const element = document.createElement('button');
  element.textContent = label;
  element.onclick = click;
  controls.append(element);
  return element;
}

let options: UIProviderProps = {};
let setOptions!: (value: UIProviderProps) => void;
let setValue!: (value: number) => void;
let setBusy!: (value: boolean) => void;
let setHidden!: (value: boolean) => void;
let value = 42;
let busy = false;
let hidden = false;
let narrow = false;
let zoom = false;
let builds = 0;
let drawReads = 0;
const nodes: PNode[] = [];
const asset = new Graphics().star(70, -25, 5, 18, 8).fill('#d97706');
const mounted = await mount(
  () => {
    const [settings, update] = createState<UIProviderProps>({});
    const [progress, updateProgress] = createState(value);
    const [indeterminate, updateBusy] = createState(false);
    const [concealed, updateHidden] = createState(false);
    setOptions = update;
    setValue = updateProgress;
    setBusy = updateBusy;
    setHidden = updateHidden;
    return UIProvider({
      get colorMode() {
        return settings().colorMode;
      },
      get density() {
        return settings().density;
      },
      get fontScale() {
        return settings().fontScale;
      },
      get reducedMotion() {
        return settings().reducedMotion;
      },
      children: () => {
        builds++;
        const theme = useUITheme();
        const title = (content: string) =>
          Text({
            children: content,
            get style() {
              return {
                color: theme().colors.text,
                fontSize: theme().typography.fontSize,
                lineHeight: theme().typography.lineHeight,
                fontFamily: theme().typography.fontFamily,
              };
            },
          });
        const drawing = Icon({
          size: 36,
          label: 'Check mark',
          draw(graphics, width, height, color) {
            drawReads++;
            graphics
              .moveTo(width * 0.2, height * 0.5)
              .lineTo(width * 0.42, height * 0.75)
              .lineTo(width * 0.8, height * 0.2)
              .stroke({
                color,
                width: width / 10,
                cap: 'round',
                join: 'round',
              });
          },
        });
        const sourceIcon = Icon({
          src: asset,
          size: 48,
          label: 'Offset star asset',
        });
        const spinner = Spinner({ label: 'Loading preview', size: 36 });
        const bar = ProgressBar({
          label: 'Upload',
          thickness: 10,
          get value() {
            return progress();
          },
          get indeterminate() {
            return indeterminate();
          },
        });
        const badge = Badge({
          children: 'Canvas UI · 测量文字',
          tone: 'primary',
          style: { maxWidth: '100%' },
        });
        const loading = Stack({
          get style() {
            return {
              display: concealed() ? ('none' as const) : ('flex' as const),
              gap: theme().spacing.md,
            };
          },
          children: [
            Stack({
              direction: 'row',
              align: 'center',
              children: [
                drawing,
                sourceIcon,
                Separator({ orientation: 'vertical', length: 40 }),
                spinner,
              ],
            }),
            bar,
          ],
        });
        const surface = Surface({
          bordered: true,
          children: Stack({
            children: [
              title('Surface + Stack'),
              badge,
              Separator({}),
              loading,
              Surface({
                tone: 'raised',
                children: title('Theme / density / 200% text'),
              }),
              Stack({
                direction: 'row',
                wrap: true,
                children: [
                  Badge({ children: 'Neutral' }),
                  Badge({ children: 'Warning', tone: 'danger' }),
                  Badge({ children: 0, tone: 'primary' }),
                ],
              }),
            ],
          }),
        }) as PNode;
        nodes.push(drawing, sourceIcon, spinner, bar, surface);
        return Surface({
          tone: 'canvas',
          style: { width: '100%', height: '100%' },
          children: surface,
        });
      },
    });
  },
  host,
  { resolution: Math.min(devicePixelRatio || 1, 2) },
);

function report() {
  mounted.root.doLayout();
  if (builds !== 1 || nodes.some((node) => !(node instanceof PNode)))
    throw new Error('UI rebuilt or duplicate core');
  status.textContent = JSON.stringify(
    {
      options,
      value,
      busy,
      hidden,
      narrow,
      zoom,
      builds,
      sizes: nodes.map((node) => [
        node._layoutNode.getComputedWidth(),
        node._layoutNode.getComputedHeight(),
      ]),
      singleCore: true,
      assetOwnedByCaller: !asset.destroyed,
    },
    null,
    2,
  );
}
button('Theme', () => {
  options = {
    ...options,
    colorMode: options.colorMode === 'dark' ? 'light' : 'dark',
  };
  setOptions(options);
  report();
});
button('Density', () => {
  options = {
    ...options,
    density: options.density === 'compact' ? 'comfortable' : 'compact',
  };
  setOptions(options);
  report();
});
button('Text 200%', () => {
  options = { ...options, fontScale: options.fontScale === 2 ? 1 : 2 };
  setOptions(options);
  report();
});
button('Reduced motion', () => {
  options = { ...options, reducedMotion: !options.reducedMotion };
  setOptions(options);
  report();
});
button('Progress +30', () => {
  value = value >= 130 ? -20 : value + 30;
  setValue(value);
  report();
});
button('Indeterminate', () => {
  busy = !busy;
  setBusy(busy);
  report();
});
button('Hide loading', () => {
  hidden = !hidden;
  setHidden(hidden);
  report();
});
button('Narrow 240px', () => {
  narrow = !narrow;
  host.style.width = narrow ? '240px' : '560px';
  requestAnimationFrame(() => requestAnimationFrame(report));
});
button('Scene scale 150%', () => {
  zoom = !zoom;
  mounted.app.stage.scale.set(zoom ? 1.5 : 1);
  report();
});
button('Unmount', () => {
  mounted.destroy();
  const previous = drawReads;
  setOptions({ colorMode: 'dark' });
  setValue(20);
  setBusy(true);
  if (
    host.querySelector('canvas') ||
    nodes.some((node) => !node.isDestroyed) ||
    asset.destroyed ||
    previous !== drawReads
  )
    throw new Error('Disposal or asset ownership failed');
  asset.destroy();
  status.textContent =
    'PASS: canvas, nodes, semantic DOM and reactive subscriptions disposed; caller asset survived and was released by caller';
  for (const element of Array.from(controls.querySelectorAll('button')))
    element.disabled = true;
});
report();
