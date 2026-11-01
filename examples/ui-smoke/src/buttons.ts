import { createState, mount, type PNode, Text, View } from '@piant/core';
import {
  Button,
  type ButtonIconContext,
  type ButtonPressEvent,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
  Icon,
  IconButton,
  Stack,
  Surface,
  UIProvider,
  type UIProviderProps,
  useUITheme,
} from '@piant/ui';

document.body.style.fontFamily = 'Arial, sans-serif';
const title = document.createElement('h1');
title.textContent = 'Button and IconButton';
const before = document.createElement('button');
before.textContent = 'Before Canvas';
const host = document.createElement('div');
host.style.cssText = 'width:560px;height:400px;position:relative';
const after = document.createElement('button');
after.textContent = 'After Canvas';
const controls = document.createElement('div');
const status = document.createElement('pre');
document.body.append(title, before, host, after, controls, status);

type Settings = UIProviderProps & {
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  hidden?: boolean;
  alternate?: boolean;
};
let settings: Settings = {};
let update!: (value: Settings) => void;
let theme!: ReturnType<typeof useUITheme>;
const nodes: PNode[] = [];
let creations = 0;
let reads = 0;
let count = 0;
let iconCount = 0;
let currentHandler = 'original';
const events: string[] = [];
function star(context: ButtonIconContext) {
  return Icon({
    get size() {
      return context.size();
    },
    get color() {
      return context.color();
    },
    draw(graphics, width, height, color) {
      reads++;
      graphics
        .star(
          width / 2,
          height / 2,
          5,
          Math.min(width, height) / 2,
          Math.min(width, height) / 4,
        )
        .fill(color);
    },
  });
}
function describe(event: ButtonPressEvent) {
  return event instanceof MouseEvent ? 'keyboard/AT' : event.pointerType;
}
const mounted = await mount(
  () => {
    const [options, set] = createState<Settings>({});
    update = set;
    return UIProvider({
      get colorMode() {
        return options().colorMode;
      },
      get density() {
        return options().density;
      },
      get fontScale() {
        return options().fontScale;
      },
      get reducedMotion() {
        return options().reducedMotion;
      },
      children: () => {
        creations++;
        theme = useUITheme();
        const primary = Button({
          children: 'Save',
          icon: star,
          get name() {
            return options().alternate ? 'Save latest' : 'Save';
          },
          get variant() {
            return options().variant;
          },
          get size() {
            return options().size;
          },
          get disabled() {
            return options().disabled;
          },
          get loading() {
            return options().loading;
          },
          get onPress(): ButtonProps['onPress'] {
            return options().alternate
              ? (event) => {
                  currentHandler = 'replacement';
                  count += 10;
                  events.push(describe(event));
                  report();
                }
              : (event) => {
                  currentHandler = 'original';
                  count++;
                  events.push(describe(event));
                  report();
                };
          },
          ref: (node) => nodes.push(node),
        });
        const icon = IconButton({
          name: 'Favorite',
          icon: star,
          variant: 'secondary',
          get size() {
            return options().size;
          },
          get disabled() {
            return options().disabled;
          },
          get loading() {
            return options().loading;
          },
          onPress(event) {
            iconCount++;
            events.push(`icon:${describe(event)}`);
            report();
          },
          ref: (node) => nodes.push(node),
        });
        const variants = (
          ['primary', 'secondary', 'ghost', 'danger'] as const
        ).map((variant) => Button({ children: variant, variant, size: 'sm' }));
        const custom = Button({
          name: 'Custom action',
          variant: 'secondary',
          children: View({
            style: { flexDirection: 'row', alignItems: 'center', gap: 6 },
            children: [
              View({
                style: {
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#15803d',
                },
              }),
              Text({
                children: 'Custom content',
                get style() {
                  return {
                    color: theme().colors.text,
                    fontSize: theme().typography.fontSize,
                    lineHeight: theme().typography.lineHeight,
                  };
                },
              }),
            ],
          }),
        });
        return Surface({
          tone: 'canvas',
          style: { width: '100%', height: '100%' },
          children: Stack({
            get style() {
              return {
                display: options().hidden
                  ? ('none' as const)
                  : ('flex' as const),
                padding: 6,
              };
            },
            children: [
              Stack({
                direction: 'row',
                align: 'center',
                wrap: true,
                gap: 'lg',
                children: [primary, icon],
              }),
              Stack({ direction: 'row', wrap: true, children: variants }),
              custom,
            ],
          }),
        });
      },
    });
  },
  host,
  { resolution: Math.min(devicePixelRatio || 1, 2) },
);

function report() {
  mounted.root.doLayout();
  if (creations !== 1) throw new Error('Theme rebuilt the button tree');
  status.textContent = JSON.stringify(
    {
      count,
      iconCount,
      events,
      currentHandler,
      settings,
      creations,
      sizes: nodes.map((node) => [
        node._layoutNode.getComputedWidth(),
        node._layoutNode.getComputedHeight(),
      ]),
    },
    null,
    2,
  );
}
function control(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = action;
  controls.append(button);
}
function change(next: Partial<Settings>) {
  settings = { ...settings, ...next };
  update(settings);
  report();
}
control('Theme', () =>
  change({ colorMode: theme().colorMode === 'dark' ? 'light' : 'dark' }),
);
control('Density', () =>
  change({
    density: theme().density === 'compact' ? 'comfortable' : 'compact',
  }),
);
control('Text 200%', () =>
  change({ fontScale: theme().fontScale === 2 ? 1 : 2 }),
);
control('Disabled', () => change({ disabled: !settings.disabled }));
control('Loading', () => change({ loading: !settings.loading }));
control('Reduced motion', () =>
  change({ reducedMotion: !theme().reducedMotion }),
);
control('Replace handler/name', () =>
  change({ alternate: !settings.alternate }),
);
control('Size', () =>
  change({
    size: settings.size === 'lg' ? 'sm' : settings.size === 'sm' ? 'md' : 'lg',
  }),
);
control('Variant', () =>
  change({ variant: settings.variant === 'danger' ? 'primary' : 'danger' }),
);
control('Hide', () => change({ hidden: !settings.hidden }));
control('Narrow 240px', () => {
  host.style.width = host.style.width === '240px' ? '560px' : '240px';
  requestAnimationFrame(() => requestAnimationFrame(report));
});
control('Unmount', () => {
  mounted.destroy();
  const previousReads = reads;
  update({ loading: true, colorMode: 'dark', size: 'lg' });
  if (
    host.querySelector('canvas,button') ||
    nodes.some((node) => !node.isDestroyed) ||
    reads !== previousReads
  )
    throw new Error('Button disposal failed');
  status.textContent =
    'PASS: button nodes, Canvas, semantic DOM and subscriptions disposed';
  for (const button of Array.from(controls.querySelectorAll('button')))
    button.disabled = true;
});
report();
