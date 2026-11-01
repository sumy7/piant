import 'pixi.js/events';
import {
  createState,
  onError,
  type PNode,
  PRoot,
  render,
  type Text,
  View,
} from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
} from 'pixi.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  Checkbox,
  type CheckboxProps,
  RadioGroup,
  type RadioGroupProps,
  ToggleSwitch,
  UIProvider,
  type UIProviderProps,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      font: '14px Arial',
      setTransform() {},
      clearRect() {},
      fillText() {},
      fillRect() {},
      measureText(text: string) {
        const size = Number.parseFloat(
          this.font.match(/([\d.]+)px/)?.[1] ?? '14',
        );
        return {
          width: (text.length * size) / 2,
          actualBoundingBoxAscent: size * 0.75,
          actualBoundingBoxDescent: size * 0.25,
        };
      },
    }),
  });
});
afterAll(() => {
  if (originalGetContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext,
    );
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});

function withProps<T extends object, U extends object>(
  base: T,
  local: U,
): T & U {
  return Object.defineProperties(
    Object.defineProperties({}, Object.getOwnPropertyDescriptors(base)),
    Object.getOwnPropertyDescriptors(local),
  ) as T & U;
}

function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}

type TextNode = ReturnType<ReturnType<typeof Text>>;
function textNodes(node: PNode) {
  return descendants(node).filter(
    (child): child is TextNode => '_textLayoutStyle' in child,
  );
}

function fixture(create: () => unknown, options: UIProviderProps = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 440, height: 600 });
  const errors = vi.fn();
  const props = Object.create(options) as UIProviderProps;
  props.children = () => {
    onError(errors);
    return View({
      style: { width: 420, alignItems: 'flex-start' },
      children: create() as ReturnType<typeof View>,
    });
  };
  const dispose = render(() => UIProvider(props), host);
  function settle() {
    for (const node of descendants(host)) {
      for (const child of node._view.children) {
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
      }
    }
    host.doLayout();
  }
  settle();
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  return { host, dom, errors, dispose, settle };
}

function pointer(patch: Partial<FederatedPointerEvent> = {}) {
  const event = new FederatedPointerEvent(new EventBoundary());
  Object.assign(
    event,
    {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      isPrimary: true,
    },
    patch,
  );
  return event;
}

function key(
  element: HTMLElement,
  type: 'keydown' | 'keyup',
  value: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}

function press(node: PNode, pointerType = 'mouse') {
  node._view.emit('pointerdown', pointer({ pointerType }));
  node._view.emit('pointerup', pointer({ pointerType, buttons: 0 }));
  node._view.emit('pointertap', pointer({ pointerType, buttons: 0 }));
}

function checkControl(
  create: () => unknown,
  role: 'checkbox' | 'switch',
  options?: UIProviderProps,
) {
  const scene = fixture(create, options);
  const element = scene.dom.querySelector<HTMLButtonElement>(
    `[role="${role}"]`,
  );
  if (!element) throw new Error(`Missing ${role} semantic proxy`);
  const node = descendants(scene.host).find((candidate) =>
    candidate._view.children.some(
      (child) =>
        child instanceof DOMContainer && child.element.contains(element),
    ),
  );
  if (!node)
    throw new Error(
      'Semantic control must be attached to its own retained node',
    );
  return { ...scene, node, element };
}

function clickLabel(host: PRoot, node: PNode) {
  host._view.eventMode = 'passive';
  const sync = (container: Container) => {
    container.getGlobalTransform(container.worldTransform);
    for (const child of container.children) sync(child);
  };
  sync(host._view);
  const label = textNodes(node)[0];
  const point = label._view.toGlobal({
    x: label._layoutNode.getComputedWidth() / 2,
    y: label._layoutNode.getComputedHeight() / 2,
  });
  const boundary = new EventBoundary(host._view);
  expect(boundary.hitTest(point.x, point.y)).toBe(node._view);
  const event = new FederatedPointerEvent(boundary);
  Object.assign(event, {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 1,
    isPrimary: true,
  });
  event.global.copyFrom(point);
  event.type = 'pointerdown';
  boundary.mapEvent(event);
  event.type = 'pointerup';
  event.buttons = 0;
  boundary.mapEvent(event);
}

const choices = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', disabled: true },
  { value: 'c', label: 'Gamma' },
  { value: 'd', label: 'Delta' },
] as const;

function radio(props: RadioGroupProps, options?: UIProviderProps) {
  let node!: PNode;
  const forwarded = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(props),
  ) as RadioGroupProps;
  const originalRef = props.ref;
  forwarded.ref = (current) => {
    node = current;
    originalRef?.(current);
  };
  const scene = fixture(() => RadioGroup(forwarded), options);
  const elements = () =>
    Array.from(scene.dom.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const named = (label: string) => {
    const found = elements().find(
      (element) => element.getAttribute('aria-label') === label,
    );
    if (!found) throw new Error(`Missing radio ${label}`);
    return found;
  };
  return { ...scene, node, elements, named };
}

describe('published Checkbox and ToggleSwitch', () => {
  it('cycles mixed to checked to unchecked once per real pointer, Space or AT click, while Enter does nothing', () => {
    const changed = vi.fn();
    const { element, node } = checkControl(
      () =>
        Checkbox({
          label: 'Include files',
          defaultChecked: 'mixed',
          onCheckedChange: changed,
        }),
      'checkbox',
    );
    expect(element.getAttribute('aria-checked')).toBe('mixed');
    press(node);
    expect(element.getAttribute('aria-checked')).toBe('true');
    expect(changed.mock.calls).toEqual([[true]]);
    element.focus();
    key(element, 'keydown', 'Enter');
    key(element, 'keyup', 'Enter');
    expect(changed).toHaveBeenCalledTimes(1);
    key(element, 'keydown', ' ');
    expect(changed).toHaveBeenCalledTimes(1);
    key(element, 'keyup', ' ');
    key(element, 'keyup', ' ');
    expect(element.getAttribute('aria-checked')).toBe('false');
    expect(changed.mock.calls).toEqual([[true], [false]]);
    element.click();
    expect(changed.mock.calls).toEqual([[true], [false], [true]]);
    expect(node._view.listenerCount('pointertap')).toBe(0);
  });

  it.each(['checkbox', 'switch'] as const)(
    'activates the %s once from its actual Canvas label hit area',
    (role) => {
      const changed = vi.fn();
      const { host, node, element, errors } = checkControl(
        () =>
          role === 'checkbox'
            ? Checkbox({ label: 'Enable option', onCheckedChange: changed })
            : ToggleSwitch({
                label: 'Enable option',
                onCheckedChange: changed,
              }),
        role,
      );
      clickLabel(host, node);
      expect(changed).toHaveBeenCalledExactlyOnceWith(true);
      expect(element.getAttribute('aria-checked')).toBe('true');
      expect(errors).not.toHaveBeenCalled();
    },
  );

  it('keeps controlled acceptance and rejection authoritative and reads the latest callback without rebinding', () => {
    const [checked, setChecked] =
      createState<NonNullable<CheckboxProps['checked']>>(false);
    const [accept, setAccept] = createState(false);
    const first = vi.fn();
    const second = vi.fn((next: NonNullable<CheckboxProps['checked']>) =>
      setChecked(next),
    );
    const { element, node, dom } = checkControl(
      () =>
        Checkbox({
          label: 'Include files',
          get checked() {
            return checked();
          },
          get onCheckedChange() {
            return accept() ? second : first;
          },
        }),
      'checkbox',
    );
    const listener = node._view.listeners('pointerup')[0];
    press(node);
    expect(first).toHaveBeenCalledExactlyOnceWith(true);
    expect(element.getAttribute('aria-checked')).toBe('false');
    setAccept(true);
    press(node);
    expect(second).toHaveBeenCalledExactlyOnceWith(true);
    expect(element.getAttribute('aria-checked')).toBe('true');
    expect(node._view.listeners('pointerup')[0]).toBe(listener);
    expect(dom.querySelector('[role="checkbox"]')).toBe(element);
  });

  it('reads defaultChecked only initially, provides boolean switch semantics and handles touch without duplicate activation', () => {
    const [initial, setInitial] = createState(true);
    let reads = 0;
    const changed = vi.fn();
    const { element, node } = checkControl(
      () =>
        ToggleSwitch({
          label: 'Auto save',
          get defaultChecked() {
            reads++;
            return initial();
          },
          onCheckedChange: changed,
        }),
      'switch',
    );
    const initialReads = reads;
    expect(element.getAttribute('aria-checked')).toBe('true');
    press(node, 'touch');
    expect(changed).toHaveBeenCalledExactlyOnceWith(false);
    setInitial(false);
    expect(reads).toBe(initialReads);
    expect(element.getAttribute('aria-checked')).toBe('false');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('keeps a rejected controlled switch false and commits only the caller accepted boolean update', () => {
    const [checked, setChecked] = createState(false);
    const [accept, setAccept] = createState(false);
    const requested = vi.fn((next: boolean) => {
      if (accept()) setChecked(next);
    });
    const { node, element } = checkControl(
      () =>
        ToggleSwitch({
          label: 'Auto save',
          get checked() {
            return checked();
          },
          onCheckedChange: requested,
        }),
      'switch',
    );
    press(node);
    expect(requested).toHaveBeenCalledExactlyOnceWith(true);
    expect(element.getAttribute('aria-checked')).toBe('false');
    setAccept(true);
    press(node);
    expect(requested.mock.calls).toEqual([[true], [true]]);
    expect(element.getAttribute('aria-checked')).toBe('true');
  });

  it.each(['checkbox', 'switch'] as const)(
    'cancels pending %s activation when disabled and preserves the declared name/description',
    (role) => {
      const [disabled, setDisabled] = createState(false);
      const changed = vi.fn();
      const props = {
        label: 'Auto save',
        description: 'Save changes automatically',
        get disabled() {
          return disabled();
        },
        onCheckedChange: changed,
      };
      const { node, element } = checkControl(
        () => (role === 'checkbox' ? Checkbox(props) : ToggleSwitch(props)),
        role,
      );
      const description = document.getElementById(
        element.getAttribute('aria-describedby')!,
      );
      expect(element.getAttribute('aria-label')).toBe('Auto save');
      expect(description?.textContent).toBe('Save changes automatically');
      node._view.emit('pointerdown', pointer());
      setDisabled(true);
      node._view.emit('pointerup', pointer());
      element.click();
      element.focus();
      key(element, 'keydown', ' ');
      key(element, 'keyup', ' ');
      expect(changed).not.toHaveBeenCalled();
      expect(element.disabled).toBe(true);
      expect(element.tabIndex).toBe(-1);
      expect(element.getAttribute('aria-disabled')).toBe('true');
      setDisabled(false);
      press(node);
      expect(changed).toHaveBeenCalledExactlyOnceWith(true);
    },
  );

  it.each(['pointercancel', 'pointerupoutside'] as const)(
    'cancels a checkbox gesture on %s',
    (name) => {
      const changed = vi.fn();
      const { node } = checkControl(
        () => Checkbox({ label: 'Include files', onCheckedChange: changed }),
        'checkbox',
      );
      node._view.emit('pointerdown', pointer());
      node._view.emit(name, pointer());
      node._view.emit('pointerup', pointer());
      expect(changed).not.toHaveBeenCalled();
    },
  );
});

describe('published RadioGroup', () => {
  it('chooses the first enabled Tab stop for an unavailable selection without synthesizing value changes', () => {
    const changed = vi.fn();
    const { named, elements } = radio({
      label: 'Rendering',
      value: 'missing',
      options: choices,
      onValueChange: changed,
    });
    expect(elements().filter((element) => element.tabIndex === 0)).toEqual([
      named('Alpha'),
    ]);
    expect(
      elements().every(
        (element) => element.getAttribute('aria-checked') === 'false',
      ),
    ).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  it('exposes one named group, one initial selected Tab stop and per-option descriptions/disabled semantics', () => {
    const { dom, node, elements, named } = radio({
      label: 'Rendering',
      description: 'Choose one renderer',
      defaultValue: 'c',
      options: [
        { value: 'a', label: 'Alpha', description: 'First renderer' },
        ...choices.slice(1),
      ],
    });
    const group = dom.querySelector('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-label')).toBe('Rendering');
    expect(group.hasAttribute('aria-orientation')).toBe(false);
    const rows = node._children.at(-1)!._children;
    expect(rows[1]._layoutNode.getComputedTop()).toBeGreaterThan(
      rows[0]._layoutNode.getComputedTop(),
    );
    expect(elements().filter((element) => element.tabIndex === 0)).toEqual([
      named('Gamma'),
    ]);
    expect(named('Gamma').getAttribute('aria-checked')).toBe('true');
    expect(named('Alpha').getAttribute('aria-checked')).toBe('false');
    expect(named('Beta').disabled).toBe(true);
    const descriptionId = named('Alpha').getAttribute('aria-describedby')!;
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'First renderer',
    );
  });

  it('navigates vertical arrows with wrap, skips disabled options and selects once on each navigation, Home or End', () => {
    const changed = vi.fn();
    const { named } = radio({
      label: 'Rendering',
      defaultValue: 'a',
      options: choices,
      onValueChange: changed,
    });
    named('Alpha').focus();
    key(named('Alpha'), 'keydown', 'ArrowDown');
    expect(document.activeElement).toBe(named('Gamma'));
    expect(named('Gamma').getAttribute('aria-checked')).toBe('true');
    expect(changed).toHaveBeenCalledExactlyOnceWith('c');
    key(named('Gamma'), 'keydown', 'End');
    expect(document.activeElement).toBe(named('Delta'));
    key(named('Delta'), 'keydown', 'ArrowDown');
    expect(document.activeElement).toBe(named('Alpha'));
    key(named('Alpha'), 'keydown', 'ArrowUp');
    expect(document.activeElement).toBe(named('Delta'));
    key(named('Delta'), 'keydown', 'Home');
    expect(document.activeElement).toBe(named('Alpha'));
    expect(changed.mock.calls).toEqual([['c'], ['d'], ['a'], ['d'], ['a']]);
    expect(key(named('Alpha'), 'keydown', 'ArrowRight').defaultPrevented).toBe(
      true,
    );
    expect(document.activeElement).toBe(named('Gamma'));
  });

  it('uses horizontal RTL direction while keeping vertical arrows active independent of layout orientation', () => {
    const changed = vi.fn();
    const { named, dom, node } = radio({
      label: 'Rendering',
      defaultValue: 'a',
      options: choices,
      orientation: 'horizontal',
      dir: 'rtl',
      onValueChange: changed,
    });
    expect(
      dom
        .querySelector('[role="radiogroup"]')
        ?.hasAttribute('aria-orientation'),
    ).toBe(false);
    const rows = node._children.at(-1)!._children;
    expect(rows[1]._layoutNode.getComputedLeft()).toBeGreaterThan(
      rows[0]._layoutNode.getComputedLeft(),
    );
    expect(rows[1]._layoutNode.getComputedTop()).toBe(
      rows[0]._layoutNode.getComputedTop(),
    );
    named('Alpha').focus();
    key(named('Alpha'), 'keydown', 'ArrowLeft');
    expect(document.activeElement).toBe(named('Gamma'));
    expect(changed).toHaveBeenCalledExactlyOnceWith('c');
    key(named('Gamma'), 'keydown', 'ArrowRight');
    expect(document.activeElement).toBe(named('Alpha'));
    expect(changed.mock.calls).toEqual([['c'], ['a']]);
    expect(key(named('Alpha'), 'keydown', 'ArrowDown').defaultPrevented).toBe(
      true,
    );
    expect(document.activeElement).toBe(named('Gamma'));
    key(named('Gamma'), 'keydown', 'ArrowUp');
    expect(document.activeElement).toBe(named('Alpha'));
  });

  it('keeps controlled rejection separate from roving focus and only Space/AT click changes the value when activation is accepted', () => {
    const [value, setValue] = createState('a');
    const [accept, setAccept] = createState(false);
    const rejected = vi.fn();
    const accepted = vi.fn((next: string) => setValue(next));
    const { named } = radio({
      label: 'Rendering',
      options: choices,
      get value() {
        return value();
      },
      get onValueChange() {
        return accept() ? accepted : rejected;
      },
    });
    named('Alpha').focus();
    key(named('Alpha'), 'keydown', 'ArrowDown');
    expect(document.activeElement).toBe(named('Gamma'));
    expect(named('Alpha').getAttribute('aria-checked')).toBe('true');
    expect(named('Gamma').getAttribute('aria-checked')).toBe('false');
    expect(rejected).toHaveBeenCalledExactlyOnceWith('c');
    key(named('Gamma'), 'keydown', 'Enter');
    key(named('Gamma'), 'keyup', 'Enter');
    expect(rejected).toHaveBeenCalledTimes(1);
    const outside = document.createElement('button');
    document.body.append(outside);
    cleanups.push(() => outside.remove());
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(named('Alpha').tabIndex).toBe(0);
    expect(named('Gamma').tabIndex).toBe(-1);
    named('Gamma').focus();
    setAccept(true);
    key(named('Gamma'), 'keydown', ' ');
    key(named('Gamma'), 'keyup', ' ');
    expect(accepted).toHaveBeenCalledExactlyOnceWith('c');
    expect(named('Gamma').getAttribute('aria-checked')).toBe('true');
    named('Delta').click();
    expect(accepted.mock.calls).toEqual([['c'], ['d']]);
    named('Delta').click();
    expect(accepted).toHaveBeenCalledTimes(2);
  });

  it('reads its default only during initialization and recovers removal of the focused option without implicitly changing selection', async () => {
    const [options, setOptions] =
      createState<RadioGroupProps['options']>(choices);
    const [initial, setInitial] = createState('c');
    let reads = 0;
    const changed = vi.fn();
    const { named, settle, elements, dom } = radio({
      label: 'Rendering',
      get options() {
        return options();
      },
      get defaultValue() {
        reads++;
        return initial();
      },
      onValueChange: changed,
    });
    const initialReads = reads;
    const old = named('Gamma');
    old.focus();
    setInitial('a');
    expect(reads).toBe(initialReads);
    expect(named('Gamma').getAttribute('aria-checked')).toBe('true');
    setOptions(choices.filter((choice) => choice.value !== 'c'));
    settle();
    await Promise.resolve();
    expect(old.isConnected).toBe(false);
    expect(document.activeElement).toBe(named('Delta'));
    expect(changed).not.toHaveBeenCalled();
    expect(
      elements().every(
        (element) => element.getAttribute('aria-checked') === 'false',
      ),
    ).toBe(true);
    expect(elements().filter((element) => element.tabIndex === 0)).toEqual([
      named('Delta'),
    ]);
    expect(dom.querySelectorAll('[role="radiogroup"]')).toHaveLength(1);
  });

  it('does not steal outside focus when options or controlled selection update, and handles empty/all-disabled groups', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    cleanups.push(() => outside.remove());
    const [options, setOptions] =
      createState<RadioGroupProps['options']>(choices);
    const [value, setValue] = createState('a');
    const changed = vi.fn();
    const { dom, settle, named, elements } = radio({
      label: 'Rendering',
      get options() {
        return options();
      },
      get value() {
        return value();
      },
      onValueChange: changed,
    });
    outside.focus();
    setValue('d');
    setOptions(choices.filter((choice) => choice.value !== 'a'));
    settle();
    await Promise.resolve();
    expect(document.activeElement).toBe(outside);
    expect(named('Delta').getAttribute('aria-checked')).toBe('true');
    setOptions([]);
    settle();
    await Promise.resolve();
    expect(elements()).toHaveLength(0);
    expect(document.activeElement).toBe(outside);
    expect(dom.querySelectorAll('[role="radiogroup"]')).toHaveLength(0);
    setOptions(choices.map((choice) => ({ ...choice, disabled: true })));
    settle();
    await Promise.resolve();
    expect(elements()).toHaveLength(4);
    expect(dom.querySelectorAll('[role="radiogroup"]')).toHaveLength(1);
    expect(
      elements().every(
        (element) => element.disabled && element.tabIndex === -1,
      ),
    ).toBe(true);
    expect(document.activeElement).toBe(outside);
    expect(changed).not.toHaveBeenCalled();
  });

  it('updates the selected reentry Tab stop only outside the group and keeps focused navigation independent', () => {
    const [value, setValue] = createState('a');
    const { named } = radio({
      label: 'Rendering',
      get value() {
        return value();
      },
      options: choices,
    });
    named('Alpha').focus();
    key(named('Alpha'), 'keydown', 'ArrowDown');
    expect(document.activeElement).toBe(named('Gamma'));
    setValue('d');
    expect(document.activeElement).toBe(named('Gamma'));
    expect(named('Gamma').tabIndex).toBe(0);
    expect(named('Delta').getAttribute('aria-checked')).toBe('true');
    const outside = document.createElement('button');
    document.body.append(outside);
    cleanups.push(() => outside.remove());
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(named('Delta').tabIndex).toBe(0);
    expect(named('Gamma').tabIndex).toBe(-1);
  });
});

describe('selection themes and lifecycle', () => {
  it.each(['vertical', 'horizontal'] as const)(
    'fits %s radio rows and scaled text within a narrow group',
    (orientation) => {
      const { node, errors } = radio(
        {
          label: 'Renderer',
          orientation,
          style: { width: 220 },
          options: [
            { value: 'a', label: 'Alpha renderer with a long label' },
            { value: 'b', label: 'Beta renderer with another long label' },
          ],
        },
        { fontScale: 2 },
      );
      expect(node._layoutNode.getComputedWidth()).toBe(220);
      const rows = node._children.at(-1)!._children;
      for (const row of rows) {
        expect(
          row._layoutNode.getComputedLeft() +
            row._layoutNode.getComputedWidth(),
        ).toBeLessThanOrEqual(220);
        const text = textNodes(row)[0];
        expect(text._textLayoutStyle.fontSize).toBe(28);
        const textRight = text._view.toGlobal({
          x: text._layoutNode.getComputedWidth(),
          y: 0,
        }).x;
        const rowRight = row._view.toGlobal({
          x: row._layoutNode.getComputedWidth(),
          y: 0,
        }).x;
        expect(textRight).toBeLessThanOrEqual(rowRight);
      }
      expect(errors).not.toHaveBeenCalled();
    },
  );

  it.each(['checkbox', 'switch', 'radio'] as const)(
    'updates %s theme, density, typography and style overrides on retained nodes',
    (role) => {
      const [large, setLarge] = createState(false);
      const [override, setOverride] = createState(false);
      let node!: PNode;
      let creations = 0;
      const ref = (current: PNode) => {
        node = current;
        creations++;
      };
      const common = {
        label: 'Selection',
        ref,
        get style() {
          return override() ? { width: 180 } : undefined;
        },
        get textStyle() {
          return override()
            ? { fontSize: 30, lineHeight: 44, color: '#ff00ff' }
            : undefined;
        },
      };
      const { dom, host, errors } = fixture(
        () =>
          role === 'checkbox'
            ? Checkbox(withProps(common, { defaultChecked: true }))
            : role === 'switch'
              ? ToggleSwitch(withProps(common, { defaultChecked: true }))
              : RadioGroup(
                  withProps(common, { options: choices, defaultValue: 'a' }),
                ),
        {
          get colorMode() {
            return large() ? 'dark' : 'light';
          },
          get density() {
            return large() ? 'compact' : 'comfortable';
          },
          get fontScale() {
            return large() ? 2 : 1;
          },
        },
      );
      const element = dom.querySelector(
        `[role="${role === 'radio' ? 'radio' : role}"]`,
      );
      const initialHeight = node._layoutNode.getComputedHeight();
      expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(14);
      setLarge(true);
      host.doLayout();
      expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(28);
      expect(node._layoutNode.getComputedHeight()).toBeGreaterThan(
        initialHeight,
      );
      setOverride(true);
      host.doLayout();
      expect(node._layoutNode.getComputedWidth()).toBe(180);
      expect(textNodes(node)[0]._textLayoutStyle.fontSize).toBe(30);
      expect(textNodes(node)[0]._textLayoutStyle.color).toBe('#ff00ff');
      expect(
        dom.querySelector(`[role="${role === 'radio' ? 'radio' : role}"]`),
      ).toBe(element);
      expect(creations).toBe(1);
      expect(errors).not.toHaveBeenCalled();
    },
  );

  it.each(['checkbox', 'switch', 'radio'] as const)(
    'releases %s node and owner resources without restarting watchers or native gestures',
    (role) => {
      for (const method of ['node', 'owner'] as const) {
        const [changed, setChanged] = createState(false);
        const onChange = vi.fn();
        const consoleErrors = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        const add = vi.spyOn(window, 'addEventListener');
        const remove = vi.spyOn(window, 'removeEventListener');
        let node!: PNode;
        const common = {
          get label() {
            return changed() ? 'Updated selection' : 'Selection';
          },
          ref: (current: PNode) => {
            node = current;
          },
        };
        const { dom, host, dispose, errors } = fixture(
          () =>
            role === 'checkbox'
              ? Checkbox(
                  withProps(common, {
                    get checked() {
                      return changed();
                    },
                    onCheckedChange: onChange,
                  }),
                )
              : role === 'switch'
                ? ToggleSwitch(
                    withProps(common, {
                      get checked() {
                        return changed();
                      },
                      onCheckedChange: onChange,
                    }),
                  )
                : RadioGroup(
                    withProps(common, {
                      get options() {
                        return changed() ? [] : choices;
                      },
                      onValueChange: onChange,
                    }),
                  ),
          {
            get colorMode() {
              return changed() ? 'dark' : 'light';
            },
            get fontScale() {
              return changed() ? 2 : 1;
            },
          },
        );
        const element = dom.querySelector<HTMLButtonElement>(
          `[role="${role === 'radio' ? 'radio' : role}"]`,
        )!;
        expect(
          errors.mock.calls,
          `${role}/${method} construction errors`,
        ).toEqual([]);
        expect(element !== null, `${role}/${method} native proxy`).toBe(true);
        const target = descendants(host).find((candidate) =>
          candidate._view.children.some(
            (child) =>
              child instanceof DOMContainer && child.element.contains(element),
          ),
        )!;
        const start = add.mock.calls.length;
        const freedStyleWrites: string[] = [];
        for (const child of descendants(node).slice(1)) {
          const setStyle = child.setStyle.bind(child);
          vi.spyOn(child, 'setStyle').mockImplementation((style) => {
            if (child.isDestroyed) {
              // Record the violation without letting a freed Yoga pointer
              // corrupt later tests in this same WebAssembly runtime.
              freedStyleWrites.push(child.displayName);
              return;
            }
            setStyle(style);
          });
        }
        const allocator = (stage: string) => {
          expect(() => {
            const probe = new PRoot(new Container(), { width: 17, height: 19 });
            probe.doLayout();
            expect(probe._layoutNode.getComputedWidth()).toBe(17);
            probe.destroyRecursive();
          }, `${role}/${method}/${stage} Yoga allocator`).not.toThrow();
        };
        allocator('before destruction');
        target._view.emit('pointerdown', pointer());
        const guards = add.mock.calls
          .slice(start)
          .filter(([name]) =>
            ['pointercancel', 'pointerup', 'pointermove', 'blur'].includes(
              name,
            ),
          );
        expect(guards).toHaveLength(4);
        if (method === 'node') node.destroyRecursive();
        else dispose();
        expect(
          freedStyleWrites,
          `${role}/${method} writes to freed children`,
        ).toEqual([]);
        allocator('after destruction');
        expect(element.isConnected).toBe(false);
        expect(dom.querySelectorAll('button')).toHaveLength(0);
        for (const guard of guards)
          expect(remove).toHaveBeenCalledWith(...guard);
        expect(target._view.listenerCount('pointerdown')).toBe(0);
        expect(target._view.listenerCount('pointerup')).toBe(0);
        expect(() => {
          setChanged(true);
          allocator('after state update');
          host.doLayout();
          allocator('after layout');
          element.click();
        }).not.toThrow();
        expect(onChange).not.toHaveBeenCalled();
        expect(freedStyleWrites).toEqual([]);
        expect(errors).not.toHaveBeenCalled();
        expect(consoleErrors).not.toHaveBeenCalled();
      }
    },
  );
});
