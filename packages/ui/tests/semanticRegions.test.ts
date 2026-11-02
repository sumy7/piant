import {
  attachDOMElement,
  createEffect,
  createState,
  onError,
  type PNode,
  PRoot,
  render,
  untrack,
  View,
} from '@piant/core';
import { Container, DOMContainer } from 'pixi.js';
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
  Accordion,
  Button,
  Collapsible,
  Tabs,
  TextField,
  UIProvider,
} from '../dist/index.js';
import {
  type FocusScope,
  getFocusScope,
} from '../dist/primitives/focusScope.js';

const cleanups: (() => void)[] = [];
const originalContext = Object.getOwnPropertyDescriptor(
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
        return {
          width: text.length * 7,
          actualBoundingBoxAscent: 11,
          actualBoundingBoxDescent: 3,
        };
      },
    }),
  });
});
afterAll(() => {
  if (originalContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalContext,
    );
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function descendants(node: PNode): PNode[] {
  return [node, ...node._children.flatMap(descendants)];
}
function fixture(content: () => unknown) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 500, height: 900 });
  let scope!: FocusScope;
  const errors = vi.fn();
  const stop = render(
    () =>
      UIProvider({
        reducedMotion: false,
        children: () => {
          scope = getFocusScope();
          onError(errors);
          return View({
            style: { width: 450 },
            children: [
              content() as JSX.Element,
              Button({ children: 'Persistent sibling' }),
            ],
          });
        },
      }),
    host,
  );
  const settle = () => {
    for (const node of descendants(host))
      for (const child of node._view.children)
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
    host.doLayout();
    scope.refresh();
  };
  settle();
  cleanups.push(() => {
    stop();
    host.destroyRecursive();
    dom.remove();
  });
  return { dom, host, scope, errors, settle };
}
const items = [
  {
    value: 'a',
    label: 'Alpha',
    children: () => View({ style: { height: 30 } }),
  },
  {
    value: 'c',
    label: 'Gamma',
    children: () => View({ style: { height: 30 } }),
  },
];
function controlledPanel(dom: HTMLElement, name: string) {
  const trigger = Array.from(
    dom.querySelectorAll<HTMLElement>('[aria-controls]'),
  ).find((item) => item.getAttribute('aria-label') === name)!;
  return document.getElementById(trigger.getAttribute('aria-controls')!)!;
}

describe('relocated semantic regions', () => {
  it('repairs focus to the intended trigger before an earlier observer refresh hides a panel', () => {
    const [open, setOpen] = createState(true);
    const scene = fixture(() => {
      const scope = getFocusScope();
      createEffect(() => {
        open();
        untrack(() => scope.refresh());
      });
      return Collapsible({
        label: 'Retain draft',
        get open() {
          return open();
        },
        onOpenChange: setOpen,
        mountStrategy: 'lazy',
        children: () => TextField({ 'aria-label': 'Draft' }),
      });
    });
    const trigger = scene.dom.querySelector<HTMLButtonElement>(
      '[aria-label="Retain draft"]',
    )!;
    scene.dom.querySelector<HTMLInputElement>('[aria-label="Draft"]')!.focus();
    trigger.click();
    scene.settle();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('restores owned attributes and display priority when a region is released', () => {
    const [visible, setVisible] = createState(true);
    let element!: HTMLElement;
    let release = () => {};
    const scene = fixture(() => {
      const node = View({ style: { width: 50, height: 40 } }) as PNode;
      element = document.createElement('div');
      element.style.setProperty('display', 'inline-flex', 'important');
      element.setAttribute('aria-hidden', 'false');
      const binding = attachDOMElement(node, element);
      release = getFocusScope().registerRegion(node, binding, { visible });
      return node;
    });
    scene.scope.setConstraint(() => false);
    setVisible(false);
    expect(element.hidden).toBe(true);
    expect(element.inert).toBe(true);
    release();
    release();
    expect(element.isConnected).toBe(false);
    expect(element.hidden).toBe(false);
    expect(element.inert).toBe(false);
    expect(element.getAttribute('aria-hidden')).toBe('false');
    expect(element.style.getPropertyValue('display')).toBe('inline-flex');
    expect(element.style.getPropertyPriority('display')).toBe('important');
    setVisible(true);
    expect(element.hidden).toBe(false);
    expect(element.inert).toBe(false);
  });

  it('hides headings, tablists and panels with their logical ancestor while a sibling keeps the DOM host alive', () => {
    const [hidden, setHidden] = createState(false);
    const scene = fixture(() =>
      View({
        get style() {
          return { display: hidden() ? ('none' as const) : ('flex' as const) };
        },
        children: [
          Tabs({ label: 'Sections', items, mountStrategy: 'keepMounted' }),
          Accordion({
            type: 'single',
            items: [items[0]],
            defaultValue: 'a',
            mountStrategy: 'lazy',
          }),
          Collapsible({
            label: 'Details',
            defaultOpen: true,
            mountStrategy: 'lazy',
            children: () => View({}),
          }),
        ],
      }),
    );
    const heading = scene.dom.querySelector<HTMLElement>('[role="heading"]')!;
    const list = scene.dom.querySelector<HTMLElement>('[role="tablist"]')!;
    const panels = Array.from(
      scene.dom.querySelectorAll<HTMLElement>(
        '[role="region"],[role="tabpanel"]',
      ),
    );
    expect(panels).toHaveLength(4);
    const initiallyHidden = panels.map((panel) => panel.hidden);
    setHidden(true);
    scene.settle();
    expect(heading.hidden).toBe(true);
    expect(heading.inert).toBe(true);
    expect(list.hidden).toBe(true);
    expect(list.inert).toBe(true);
    expect(panels.every((panel) => panel.hidden && panel.inert)).toBe(true);
    expect(
      scene.dom.querySelector('[aria-label="Persistent sibling"]')?.isConnected,
    ).toBe(true);
    setHidden(false);
    scene.settle();
    expect(heading.hidden).toBe(false);
    expect(heading.inert).toBe(false);
    expect(list.hidden).toBe(false);
    expect(list.inert).toBe(false);
    expect(panels.map((panel) => panel.hidden)).toEqual(initiallyHidden);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('applies modal isolation to actual relocated region elements and keeps the latest retained panel state', () => {
    const [value, setValue] = createState<string | null>('a');
    const scene = fixture(() =>
      View({
        children: [
          Tabs({
            label: 'Sections',
            items,
            get value() {
              return value();
            },
            mountStrategy: 'keepMounted',
          }),
          Accordion({ type: 'single', items: [items[0]], defaultValue: 'a' }),
        ],
      }),
    );
    const a = controlledPanel(scene.dom, 'Alpha');
    const c = controlledPanel(scene.dom, 'Gamma');
    const heading = scene.dom.querySelector<HTMLElement>('[role="heading"]')!;
    const list = scene.dom.querySelector<HTMLElement>('[role="tablist"]')!;
    scene.scope.setConstraint(() => false);
    expect(a.inert).toBe(true);
    expect(c.inert).toBe(true);
    expect(heading.inert).toBe(true);
    expect(list.inert).toBe(true);
    setValue('c');
    scene.settle();
    expect(a.hidden).toBe(true);
    expect(a.inert).toBe(true);
    expect(c.hidden).toBe(false);
    expect(c.inert).toBe(true);
    scene.scope.setConstraint();
    expect(a.hidden).toBe(true);
    expect(a.inert).toBe(true);
    expect(c.hidden).toBe(false);
    expect(c.inert).toBe(false);
    expect(heading.inert).toBe(false);
    expect(list.inert).toBe(false);
    expect(scene.errors).not.toHaveBeenCalled();
  });

  it('tracks DOMPipe marker clipping changes after the semantic element has moved away', async () => {
    const scene = fixture(() =>
      Accordion({ type: 'single', items: [items[0]], defaultValue: 'a' }),
    );
    const heading = scene.dom.querySelector<HTMLElement>('[role="heading"]')!;
    const trigger = heading.querySelector<HTMLElement>('[role="button"]')!;
    const entry = scene.scope.entries.find(
      (entry) => entry.binding.element === trigger,
    )!;
    const markers = entry.node._view.children.filter(
      (child) =>
        child instanceof DOMContainer && child.element.childElementCount === 0,
    );
    expect(markers).toHaveLength(1);
    const marker = markers[0] as DOMContainer;
    expect(marker.element).not.toBe(entry.binding.hostElement);
    expect(marker.element.contains(heading)).toBe(false);
    marker.element.hidden = true;
    await vi.waitFor(() => expect(heading.hidden).toBe(true));
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    const refresh = vi.spyOn(scene.scope, 'refresh');
    marker.element.hidden = true;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    expect(refresh).not.toHaveBeenCalled();
    refresh.mockRestore();
    marker.element.hidden = false;
    await vi.waitFor(() => expect(heading.hidden).toBe(false));
  });
});
