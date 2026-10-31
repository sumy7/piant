import {
  createEffect,
  createState,
  Input,
  type InputProps,
  mount,
  PNode,
  Text,
  View,
} from '@piant/core';
import {
  UIProvider,
  type UIProviderProps,
  type UITheme,
  useUITheme,
} from '@piant/ui';

const heading = document.createElement('h1');
heading.textContent = 'UI theme: independent mounts';
document.body.append(heading);

type InputNode = Parameters<NonNullable<InputProps['ref']>>[0];

async function panel(name: string) {
  const section = document.createElement('section');
  section.setAttribute('aria-label', name);
  const title = document.createElement('h2');
  title.textContent = name;
  const host = document.createElement('div');
  host.style.cssText = 'width:480px;height:260px;position:relative';
  const status = document.createElement('p');
  const toggle = document.createElement('button');
  toggle.textContent = `Toggle ${name} theme/density/scale`;
  const motion = document.createElement('button');
  motion.textContent = `Toggle ${name} reduced motion`;
  const destroy = document.createElement('button');
  destroy.textContent = `Unmount ${name}`;
  section.append(title, host, status, toggle, motion, destroy);
  document.body.append(section);
  let setOptions!: (options: UIProviderProps) => void;
  let setDOMRoot!: (element: HTMLElement) => void;
  let theme!: () => UITheme;
  let input!: InputNode;
  let builds = 0;
  let updates = 0;
  let options: UIProviderProps = {};
  const mounted = await mount(() => {
    const [current, set] = createState<UIProviderProps>({});
    setOptions = set;
    const [domRoot, setRoot] = createState<HTMLElement>();
    setDOMRoot = setRoot;
    return UIProvider({
      get colorMode() {
        return current().colorMode;
      },
      get density() {
        return current().density;
      },
      get fontScale() {
        return current().fontScale;
      },
      get reducedMotion() {
        return current().reducedMotion;
      },
      get domRoot() {
        return domRoot();
      },
      children: () => {
        builds++;
        theme = useUITheme();
        const label = Text({
          children: 'Theme preview',
          get style() {
            const t = theme();
            return {
              fontFamily: t.typography.fontFamily,
              fontSize: t.typography.fontSize,
              lineHeight: t.typography.lineHeight,
              color: t.colors.text,
              height: t.typography.lineHeight,
            };
          },
        });
        const field = Input({
          defaultValue: 'Edit before switching',
          ref: (node) => {
            input = node;
          },
          get style() {
            const t = theme();
            return {
              width: 400,
              height: t.controlSize.md,
              marginTop: t.spacing.sm,
              backgroundColor: t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.sm,
            };
          },
        });
        const nested = UIProvider({
          theme: { colors: { primary: '#7c3aed', onPrimary: '#ffffff' } },
          children: () => {
            const local = useUITheme();
            const text = Text({
              children: 'Local accent',
              get style() {
                const t = local();
                return {
                  fontFamily: t.typography.fontFamily,
                  fontSize: t.typography.fontSize,
                  lineHeight: t.typography.lineHeight,
                  color: t.colors.onPrimary,
                  height: t.typography.lineHeight,
                };
              },
            });
            return View({
              get style() {
                const t = local();
                return {
                  backgroundColor: t.colors.primary,
                  height: t.controlSize.md,
                  marginTop: t.spacing.sm,
                  paddingLeft: t.spacing.md,
                  justifyContent: 'center' as const,
                  borderRadius: t.radius.md,
                };
              },
              children: text,
            });
          },
        });
        createEffect(() => {
          const t = theme();
          updates++;
          status.textContent = `${name}: ${t.colorMode}/${t.density}; font=${t.typography.fontSize}; motion=${t.motion.normal}; builds=${builds}`;
          section.dataset.colorMode = t.colorMode;
          section.dataset.fontSize = String(t.typography.fontSize);
        });
        return View({
          get style() {
            const t = theme();
            return {
              width: 480,
              height: 260,
              padding: t.spacing.md,
              backgroundColor: t.colors.canvas,
            };
          },
          children: [label, field, nested],
        });
      },
    });
  }, host);
  setDOMRoot(mounted.app.domContainerRoot);
  const original = input;
  const element = input.element;
  element.setAttribute('aria-label', `${name} input`);
  function update(next: UIProviderProps) {
    const focused = document.activeElement === element;
    const value = element.value;
    const selection = [element.selectionStart, element.selectionEnd];
    options = next;
    setOptions(next);
    mounted.root.doLayout();
    if (
      !(input instanceof PNode) ||
      input !== original ||
      builds !== 1 ||
      element.value !== value ||
      (focused &&
        (document.activeElement !== element ||
          element.selectionStart !== selection[0] ||
          element.selectionEnd !== selection[1]))
    ) {
      throw new Error('Theme switch rebuilt or disturbed input');
    }
    if (
      parseFloat(getComputedStyle(element).fontSize) !==
        theme().typography.fontSize ||
      input._layoutNode.getComputedHeight() < theme().typography.lineHeight
    )
      throw new Error('DOM/Canvas theme mismatch');
    section.dataset.retained = 'true';
  }
  for (const button of [toggle, motion])
    button.onpointerdown = (event) => event.preventDefault();
  toggle.onclick = () =>
    update({
      ...options,
      colorMode: theme().colorMode === 'light' ? 'dark' : 'light',
      density: theme().density === 'comfortable' ? 'compact' : 'comfortable',
      fontScale: theme().fontScale === 1 ? 2 : 1,
    });
  motion.onclick = () =>
    update({ ...options, reducedMotion: !theme().reducedMotion });
  destroy.onclick = () => {
    mounted.destroy();
    const previous = updates;
    setOptions({ colorMode: 'dark' });
    if (
      !mounted.isDestroyed ||
      host.querySelector('canvas') ||
      !input.isDestroyed ||
      element.isConnected ||
      updates !== previous
    )
      throw new Error('Theme disposal failed');
    status.textContent = `${name}: unmounted; DOM/canvas/subscriptions disposed`;
    toggle.disabled = motion.disabled = destroy.disabled = true;
  };
}

await panel('A');
await panel('B');
