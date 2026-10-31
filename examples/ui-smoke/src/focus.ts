import {
  createEffect,
  createState,
  Input,
  mount,
  type PNode,
  Text,
  View,
} from '@piant/core';
import {
  createFocusable,
  createPressable,
  createRovingFocusGroup,
  type FocusableOptions,
  UIProvider,
  useUIFocus,
} from '@piant/ui';

document.body.style.fontFamily = 'Arial, sans-serif';
const title = document.createElement('h1');
title.textContent = 'Canvas and native input focus';
const instructions = document.createElement('p');
instructions.textContent =
  'Use Tab/Shift+Tab, Enter and Space. Toolbar: arrows/Home/End. Slider: left/right arrows. Inspect names, descriptions and values separately from screen-reader testing.';
document.body.append(title, instructions);

function button(label: string, action?: () => void) {
  const element = document.createElement('button');
  element.textContent = label;
  if (action) element.onclick = action;
  return element;
}

document.body.append(button('Before Canvas scopes'));

async function panel(name: 'A' | 'B') {
  const section = document.createElement('section');
  section.setAttribute('aria-label', `Focus scope ${name}`);
  const heading = document.createElement('h2');
  heading.textContent = `Scope ${name}`;
  const host = document.createElement('div');
  host.style.cssText = `width:600px;height:${name === 'A' ? 470 : 100}px;position:relative;background:#f8fafc;`;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-label', `Scope ${name} status`);
  status.textContent = `Mounting scope ${name}`;
  section.append(heading, host, status);
  document.body.append(section);

  let actionNode!: PNode;
  let setDisabled!: (value: boolean) => void;
  let setHidden!: (value: boolean) => void;
  let disabled = false;
  let hidden = false;
  let updates = 0;
  const elements: HTMLElement[] = [];
  const mounted = await mount(
    () =>
      UIProvider({
        reducedMotion: false,
        children: () => {
          const scope = useUIFocus();
          const [count, setCount] = createState(0);
          const [checked, setChecked] = createState(false);
          const [expanded, setExpanded] = createState(false);
          const [value, setValue] = createState(5);
          const [isDisabled, disable] = createState(false);
          const [isHidden, hide] = createState(false);
          setDisabled = disable;
          setHidden = hide;

          function control(
            label: string,
            options: FocusableOptions,
            activate?: () => void,
            width = 550,
          ) {
            let focus!: ReturnType<typeof createFocusable>;
            let press!: ReturnType<typeof createPressable>;
            const node = View({
              ref: (node) => {
                focus = createFocusable(node, options);
                elements.push(focus.element);
                press = createPressable(node, {
                  get disabled() {
                    return options.disabled || options.hidden;
                  },
                  onPress: activate,
                });
              },
              get style() {
                return {
                  width,
                  height: 44,
                  marginBottom: 8,
                  paddingLeft: 12,
                  justifyContent: 'center' as const,
                  borderWidth: 3,
                  borderRadius: 6,
                  borderColor: focus.focusVisible() ? '#f59e0b' : '#64748b',
                  backgroundColor: options.disabled
                    ? '#cbd5e1'
                    : press.pressed() || focus.pressed()
                      ? '#bfdbfe'
                      : '#e2e8f0',
                  display: options.hidden
                    ? ('none' as const)
                    : ('flex' as const),
                };
              },
              children: Text({
                children: label,
                style: { color: '#0f172a', fontSize: 16, lineHeight: 24 },
              }),
            }) as PNode;
            return node;
          }

          const activate = () => setCount((previous) => previous + 1);
          actionNode = control(
            `Canvas action ${name}`,
            {
              name: `Canvas action ${name}`,
              get disabled() {
                return isDisabled();
              },
              get hidden() {
                return isHidden();
              },
              onActivate: activate,
            },
            activate,
          );
          const nodes: PNode[] = [actionNode];

          if (name === 'A') {
            let inputFocus!: ReturnType<typeof createFocusable>;
            nodes.push(
              Input({
                defaultValue: 'Edit native input',
                ref: (node) => {
                  inputFocus = createFocusable(node, {
                    name: 'Native input A',
                    description:
                      'Native text editing; Tab moves to Canvas choice A.',
                    domElement: node.domElement,
                  });
                  elements.push(inputFocus.element);
                },
                get style() {
                  return {
                    width: 550,
                    height: 44,
                    marginBottom: 8,
                    borderWidth: 3,
                    borderColor: inputFocus.focusVisible()
                      ? '#f59e0b'
                      : '#64748b',
                    backgroundColor: '#ffffff',
                  };
                },
              }) as PNode,
            );
            const toggleChoice = () => setChecked((previous) => !previous);
            nodes.push(
              control(
                'Canvas choice A — Space toggles checked',
                {
                  name: 'Canvas choice A',
                  role: 'checkbox',
                  get checked() {
                    return checked();
                  },
                  onActivate: toggleChoice,
                },
                toggleChoice,
              ),
            );
            const toggleExpanded = () => setExpanded((previous) => !previous);
            nodes.push(
              control(
                'Canvas details A — Enter/Space toggles expanded',
                {
                  name: 'Canvas details A',
                  description:
                    'Shows or hides the details state in the scope status.',
                  get expanded() {
                    return expanded();
                  },
                  onActivate: toggleExpanded,
                },
                toggleExpanded,
              ),
              control('Canvas value A — left/right changes 0–10', {
                name: 'Canvas value A',
                role: 'slider',
                get value() {
                  return {
                    now: value(),
                    min: 0,
                    max: 10,
                    text: `${value()} of 10`,
                  };
                },
                onKeyDown: (event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                    return;
                  event.preventDefault();
                  const delta = event.key === 'ArrowRight' ? 1 : -1;
                  setValue((previous) =>
                    Math.max(0, Math.min(10, previous + delta)),
                  );
                },
              }),
            );
            const group = createRovingFocusGroup({
              role: 'toolbar',
              name: 'Canvas toolbar A',
              orientation: 'horizontal',
              loop: true,
            });
            const groupNodes: PNode[] = [];
            for (const [index, label] of [
              'first',
              'disabled',
              'last',
            ].entries()) {
              groupNodes.push(
                control(
                  `Toolbar ${label} A`,
                  {
                    name: `Toolbar ${label} A`,
                    group,
                    disabled: index === 1,
                    onActivate: activate,
                  },
                  activate,
                  175,
                ),
              );
            }
            nodes.push(
              View({
                style: { width: 550, flexDirection: 'row', gap: 8 },
                children: groupNodes,
              }) as PNode,
            );
          }

          createEffect(() => {
            updates++;
            const focused =
              scope.focused()?.getAttribute('aria-label') ?? 'none';
            status.textContent = `${name}: activations=${count()}; focus=${focused}; checked=${checked()}; expanded=${expanded()}; value=${value()}; disabled=${isDisabled()}; hidden=${isHidden()}`;
          });
          return View({
            style: { width: 600, padding: 12, flexDirection: 'column' },
            children: nodes,
          });
        },
      }),
    host,
  );

  if (name === 'A') {
    const disable = button('Disable/enable action A', () => {
      disabled = !disabled;
      setDisabled(disabled);
    });
    const hide = button('Hide/show action A', () => {
      hidden = !hidden;
      setHidden(hidden);
    });
    const destroy = button('Destroy action A', () => {
      actionNode.destroyRecursive();
      disable.disabled = hide.disabled = destroy.disabled = true;
      status.textContent += '; action A node destroyed';
    });
    const unmount = button('Unmount A', () => {
      mounted.destroy();
      const previous = updates;
      setDisabled(!disabled);
      setHidden(!hidden);
      if (
        !mounted.isDestroyed ||
        host.querySelector('canvas') ||
        elements.some((element) => element.isConnected) ||
        updates !== previous
      )
        throw new Error('Focus scope A leaked DOM, canvas, or subscriptions');
      status.textContent =
        'A: unmounted; canvas, semantic proxies and native input removed';
      disable.disabled =
        hide.disabled =
        destroy.disabled =
        unmount.disabled =
          true;
    });
    section.append(disable, hide, destroy, unmount);
  }
}

await panel('A');
await panel('B');
document.body.append(button('After Canvas scopes'));
