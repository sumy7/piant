import {
  acquireInteractive,
  attachDOMElement,
  createEffect,
  createState,
  type DOMElementBinding,
  type Getter,
  onCleanup,
  type PNode,
  root,
  untrack,
} from '@piant/core';
import {
  type FocusEntry,
  getFocusScope,
  type RovingFocusGroup,
  resolveFocusGroup,
  setAttribute,
} from './focusScope';

interface FocusableSemantics {
  name: string;
  role?:
    | 'button'
    | 'checkbox'
    | 'radio'
    | 'switch'
    | 'tab'
    | 'link'
    | 'slider'
    | 'spinbutton';
  description?: string;
  checked?: boolean | 'mixed';
  expanded?: boolean;
  selected?: boolean;
  pressed?: boolean | 'mixed';
  value?: { now: number; min?: number; max?: number; text?: string };
  hidden?: boolean;
  /** Logical scene order is the default; never uses positive tabindex. */
  order?: number;
  /** Group membership is fixed for this registration. */
  group?: RovingFocusGroup;
  onActivate?: (event: MouseEvent, node: PNode) => void;
  onKeyDown?: (event: KeyboardEvent, node: PNode) => void;
}

export type FocusableOptions = FocusableSemantics &
  (
    | {
        domElement?: undefined;
        disabled?: boolean;
      }
    | {
        /** Reuse Input's binding. Set disabled on Input, which owns native editing. */
        domElement: DOMElementBinding;
        disabled?: never;
      }
  );

export interface FocusableState {
  readonly element: HTMLElement;
  readonly focused: Getter<boolean>;
  readonly focusVisible: Getter<boolean>;
  /** Keyboard press only. Compose with createPressable for pointer visuals. */
  readonly pressed: Getter<boolean>;
  focus(): boolean;
  dispose(): void;
}

const registrations = new WeakMap<PNode, FocusableState>();
const elements = new WeakSet<HTMLElement>();
let descriptionId = 0;

/** Register a Canvas semantic proxy, or the existing native input, in its provider. */
export function createFocusable(
  node: PNode,
  options: FocusableOptions,
): FocusableState {
  return untrack(() => registerFocusable(node, options));
}

function registerFocusable(
  node: PNode,
  options: FocusableOptions,
): FocusableState {
  const scope = getFocusScope();
  if (node.isDestroyed) throw new Error('Cannot focus a destroyed node.');
  if (registrations.has(node))
    throw new Error('A node can have only one focus registration.');
  const group = resolveFocusGroup(options.group, scope);
  const native = options.domElement !== undefined;
  if (native && options.disabled !== undefined)
    throw new Error(
      'Set disabled on Input when registering its native DOM binding.',
    );
  const element =
    options.domElement?.element ?? document.createElement('button');
  if (elements.has(element))
    throw new Error('A native element can have only one focus registration.');
  if (!native) {
    (element as HTMLButtonElement).type = 'button';
    element.style.cssText =
      'opacity:0;pointer-events:none;border:0;padding:0;margin:0;';
  }
  const binding = options.domElement ?? attachDOMElement(node, element);
  const [focused, setFocused] = createState(false);
  const [focusVisible, setFocusVisible] = createState(false);
  const [pressed, setPressed] = createState(false);
  const description = element.ownerDocument.createElement('span');
  description.id = `piant-description-${++descriptionId}`;
  description.hidden = true;
  binding.hostElement.append(description);
  const attributes = [
    'role',
    'aria-label',
    'aria-describedby',
    'aria-checked',
    'aria-expanded',
    'aria-selected',
    'aria-pressed',
    'aria-valuenow',
    'aria-valuemin',
    'aria-valuemax',
    'aria-valuetext',
    'aria-disabled',
    'tabindex',
    'hidden',
  ];
  const previous = new Map(
    attributes.map((name) => [name, element.getAttribute(name)]),
  );
  const wasAccessible = node._view.accessible;
  node._view.accessible = false;
  let disposed = false;
  let armed: 'Enter' | ' ' | undefined;
  let unregister = () => {};
  let stop = () => {};
  let removeDestroy = () => {};
  let stopLayout = () => {};
  const releaseInteractive = native ? () => {} : acquireInteractive(node);

  function available() {
    if (
      disposed ||
      node.isDestroyed ||
      !binding.visible ||
      !element.isConnected ||
      options.disabled ||
      options.hidden ||
      element.matches(':disabled')
    )
      return false;
    for (
      let ancestor: HTMLElement | null = element;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      if (
        ancestor.hidden ||
        ancestor.inert ||
        ancestor.getAttribute('aria-hidden') === 'true'
      )
        return false;
      const style =
        element.ownerDocument.defaultView?.getComputedStyle(ancestor);
      if (
        style?.display === 'none' ||
        style?.visibility === 'hidden' ||
        style?.visibility === 'collapse'
      )
        return false;
    }
    return true;
  }
  function cancel() {
    armed = undefined;
    setPressed(false);
  }
  const entry: FocusEntry = {
    node,
    binding,
    group,
    order: () => options.order ?? 0,
    available,
    cancel,
    dispose,
    updateFocus(value) {
      setFocused(value && !disposed);
      setFocusVisible(value && !disposed && scope.focusVisible(element));
      if (!value) cancel();
    },
  };

  function click(event: MouseEvent) {
    if (!available()) {
      event.preventDefault();
      return;
    }
    // Includes AT-generated clicks with no preceding key or pointer event.
    options.onActivate?.(event, node);
  }
  function activationKey(event: KeyboardEvent): 'Enter' | ' ' | undefined {
    const role = options.role ?? 'button';
    if (role === 'slider' || role === 'spinbutton') return;
    if (event.key === ' ' && role !== 'link') return ' ';
    if (
      event.key === 'Enter' &&
      !['checkbox', 'radio', 'switch'].includes(role)
    )
      return 'Enter';
  }
  function keydown(event: KeyboardEvent) {
    if (!available() || element.ownerDocument.activeElement !== element) return;
    if (!native && scope.navigate(entry, event)) return;
    options.onKeyDown?.(event, node);
    if (native || event.defaultPrevented) return;
    const key = activationKey(event);
    if (!key) {
      // A role does not remove the backing button's native Enter/Space action.
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      return;
    }
    // Own this key's default action so a synthetic click cannot double fire.
    event.preventDefault();
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.repeat ||
      armed
    )
      return;
    armed = key;
    setPressed(true);
    if (key === 'Enter' && available() && armed === key) element.click();
  }
  function keyup(event: KeyboardEvent) {
    if (native) return;
    const key = activationKey(event);
    if (!key) {
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
      return;
    }
    event.preventDefault();
    const activate =
      key === ' ' &&
      armed === key &&
      !event.isComposing &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      element.ownerDocument.activeElement === element;
    cancel();
    if (activate && available()) element.click();
  }
  const pointerdown = (event: {
    button: number;
    isPrimary: boolean;
    preventDefault(): void;
  }) => {
    if (event.button === 0 && event.isPrimary !== false) {
      cancel();
      // Otherwise the canvas' subsequent native mousedown default blurs the
      // semantic element we just focused. Native Input never takes this path.
      if (scope.focus(entry)) event.preventDefault();
    }
  };

  function syncSemantics() {
    const role = native ? options.role : (options.role ?? 'button');
    const checkable =
      role === 'checkbox' || role === 'radio' || role === 'switch';
    const range = role === 'slider' || role === 'spinbutton';
    const checked = checkable ? options.checked : undefined;
    const values = {
      role,
      'aria-label': options.name,
      'aria-checked':
        checked === 'mixed' && role !== 'checkbox' ? false : checked,
      'aria-expanded': options.expanded,
      'aria-selected': role === 'tab' ? options.selected : undefined,
      'aria-pressed': role === 'button' ? options.pressed : undefined,
      'aria-valuenow': range ? options.value?.now : undefined,
      'aria-valuemin': range ? options.value?.min : undefined,
      'aria-valuemax': range ? options.value?.max : undefined,
      'aria-valuetext': range ? options.value?.text : undefined,
      'aria-disabled': options.disabled ? true : undefined,
    };
    for (const [name, value] of Object.entries(values)) {
      // Keep native role/range/checked/value semantics unless explicitly adapted.
      setAttribute(
        element,
        name,
        native && name !== 'aria-label' && role === undefined
          ? (previous.get(name) ?? undefined)
          : value,
      );
    }
    if (!native)
      (element as HTMLButtonElement).disabled = Boolean(options.disabled);
    element.hidden = Boolean(options.hidden) || previous.get('hidden') !== null;
    const text = options.description ?? '';
    if (description.textContent !== text) description.textContent = text;
    setAttribute(
      element,
      'aria-describedby',
      [previous.get('aria-describedby'), text ? description.id : undefined]
        .filter(Boolean)
        .join(' ') || undefined,
    );
    if (!available()) cancel();
    void options.order;
    untrack(() => scope.refresh());
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancel();
    entry.updateFocus(false);
    stop();
    stopLayout();
    removeDestroy();
    element.removeEventListener('click', click);
    element.removeEventListener('keydown', keydown);
    element.removeEventListener('keyup', keyup);
    node._view.off('pointerdown', pointerdown);
    unregister();
    description.remove();
    if (!node.isDestroyed && node._view.accessible === false)
      node._view.accessible = wasAccessible;
    releaseInteractive();
    if (native) {
      for (const [name, value] of previous) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    } else binding.dispose();
    registrations.delete(node);
    elements.delete(element);
  }

  const state: FocusableState = {
    element,
    focused,
    focusVisible,
    pressed,
    focus: () => scope.focus(entry),
    dispose,
  };
  registrations.set(node, state);
  elements.add(element);
  element.addEventListener('click', click);
  element.addEventListener('keydown', keydown);
  element.addEventListener('keyup', keyup);
  if (!native) node._view.on('pointerdown', pointerdown);
  unregister = scope.register(entry);
  stopLayout = node.observeLayout(() => scope.refresh());
  stop = root((dispose) => {
    createEffect(syncSemantics);
    return dispose;
  });
  removeDestroy = node.onDestroy(dispose);
  onCleanup(dispose);
  return state;
}
