import {
  attachDOMElement,
  createState,
  type PNode,
  PRoot,
  root,
  View,
} from '@piant/core';
import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFocusable,
  type FocusableOptions,
  type FocusableState,
  UIProvider,
} from '../dist/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
});
function fixture(
  options: (node: PNode, element: HTMLElement) => FocusableOptions,
) {
  const host = document.createElement('div');
  document.body.append(host);
  const element = document.createElement('div');
  const scene = new PRoot(new Container(), { width: 200, height: 100 });
  let focus!: FocusableState;
  const stop = root((dispose) => {
    UIProvider({
      reducedMotion: false,
      children: () => {
        const node = View({ style: { width: 100, height: 40 } }) as PNode;
        const props = options(node, element);
        focus = createFocusable(node, props);
        scene.appendChild(node);
        host.append(focus.element.parentElement!);
        scene.doLayout();
        return undefined;
      },
    });
    return dispose;
  });
  cleanups.push(() => {
    stop();
    scene.destroyRecursive();
    host.remove();
  });
  return focus;
}

describe('popup focus semantics', () => {
  it('updates combobox/menu roles and manages optional popup associations without stale attributes', () => {
    const [role, setRole] = createState<FocusableOptions['role']>('combobox');
    const [controls, setControls] = createState<string | undefined>('choices');
    const [hasPopup, setHasPopup] =
      createState<FocusableOptions['hasPopup']>('listbox');
    const [active, setActive] = createState<string | undefined>('choice-one');
    const focus = fixture(() => ({
      name: 'Choice',
      get role() {
        return role();
      },
      get controls() {
        return controls();
      },
      get hasPopup() {
        return hasPopup();
      },
      get activeDescendant() {
        return active();
      },
    }));
    expect(focus.element.getAttribute('role')).toBe('combobox');
    expect(focus.element.getAttribute('aria-controls')).toBe('choices');
    expect(focus.element.getAttribute('aria-haspopup')).toBe('listbox');
    expect(focus.element.getAttribute('aria-activedescendant')).toBe(
      'choice-one',
    );
    setRole('menu');
    setHasPopup('menu');
    setControls('actions');
    setActive('action-two');
    expect(focus.element.getAttribute('role')).toBe('menu');
    expect(focus.element.getAttribute('aria-controls')).toBe('actions');
    expect(focus.element.getAttribute('aria-haspopup')).toBe('menu');
    expect(focus.element.getAttribute('aria-activedescendant')).toBe(
      'action-two',
    );
    setRole('button');
    expect(focus.element.hasAttribute('aria-activedescendant')).toBe(false);
    setRole('listbox');
    expect(focus.element.getAttribute('aria-activedescendant')).toBe(
      'action-two',
    );
    setControls(undefined);
    setHasPopup(undefined);
    setActive(undefined);
    for (const attribute of [
      'aria-controls',
      'aria-haspopup',
      'aria-activedescendant',
    ])
      expect(focus.element.hasAttribute(attribute)).toBe(false);
  });

  it('restores authored popup attributes on disposal only when explicitly managed by this registration', () => {
    const [controls, setControls] = createState<string | undefined>(
      'managed-list',
    );
    const focus = fixture((node, element) => {
      element.setAttribute('aria-controls', 'authored-list');
      element.setAttribute('aria-haspopup', 'dialog');
      element.setAttribute('aria-activedescendant', 'authored-row');
      return {
        name: 'Managed choice',
        role: 'combobox',
        domElement: attachDOMElement(node, element),
        get controls() {
          return controls();
        },
        hasPopup: 'listbox',
        activeDescendant: 'managed-row',
      };
    });
    expect(focus.element.getAttribute('aria-controls')).toBe('managed-list');
    expect(focus.element.getAttribute('aria-activedescendant')).toBe(
      'managed-row',
    );
    setControls(undefined);
    expect(focus.element.hasAttribute('aria-controls')).toBe(false);
    focus.dispose();
    expect(focus.element.getAttribute('aria-controls')).toBe('authored-list');
    expect(focus.element.getAttribute('aria-haspopup')).toBe('dialog');
    expect(focus.element.getAttribute('aria-activedescendant')).toBe(
      'authored-row',
    );
  });

  it.each(
    (['button', 'checkbox', 'slider'] as const).flatMap((role) => [
      { role, native: true },
      { role, native: false },
    ]),
  )(
    'preserves externally managed popup attributes for $role (native=$native)',
    ({ role, native }) => {
      const [name, setName] = createState('Original control');
      const focus = fixture((node, element) => {
        element.setAttribute('aria-controls', 'external-before');
        element.setAttribute('aria-haspopup', 'dialog');
        element.setAttribute('aria-activedescendant', 'external-row-before');
        return {
          get name() {
            return name();
          },
          role,
          ...(native ? { domElement: attachDOMElement(node, element) } : {}),
          ...(role === 'checkbox' ? { checked: true } : {}),
          ...(role === 'slider' ? { value: { now: 5, min: 0, max: 10 } } : {}),
        };
      });
      focus.element.setAttribute('aria-controls', 'external-after');
      focus.element.setAttribute('aria-haspopup', 'menu');
      focus.element.setAttribute('aria-activedescendant', 'external-row-after');
      setName('Updated control');
      expect(focus.element.getAttribute('aria-controls')).toBe(
        'external-after',
      );
      expect(focus.element.getAttribute('aria-haspopup')).toBe('menu');
      expect(focus.element.getAttribute('aria-activedescendant')).toBe(
        'external-row-after',
      );
      focus.dispose();
      expect(focus.element.getAttribute('aria-controls')).toBe(
        'external-after',
      );
      expect(focus.element.getAttribute('aria-haspopup')).toBe('menu');
      expect(focus.element.getAttribute('aria-activedescendant')).toBe(
        'external-row-after',
      );
    },
  );
});
