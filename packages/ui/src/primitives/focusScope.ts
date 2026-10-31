import {
  createContext,
  createEffect,
  createState,
  type DOMElementBinding,
  type Getter,
  onCleanup,
  type PNode,
  root,
  untrack,
  useContext,
} from '@piant/core';

export interface UIFocusScope {
  readonly focused: Getter<HTMLElement | null>;
  focusFirst(): boolean;
}

export interface RovingFocusGroupOptions {
  role?: 'toolbar' | 'radiogroup' | 'tablist' | 'group';
  name?: string;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  dir?: 'ltr' | 'rtl';
}

export interface RovingFocusGroup {
  dispose(): void;
}

export interface FocusEntry {
  node: PNode;
  binding: DOMElementBinding;
  group?: FocusGroup;
  order(): number;
  available(): boolean;
  updateFocus(focused: boolean): void;
  cancel(): void;
  dispose(): void;
}

/** Internal group identity; membership cannot cross provider scopes. */
class FocusGroup implements RovingFocusGroup {
  readonly element = document.createElement('div');
  current?: FocusEntry;
  disposed = false;
  stop = () => {};
  constructor(
    readonly scope: FocusScope,
    readonly options: RovingFocusGroupOptions,
  ) {
    this.element.style.display = 'contents';
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    for (const entry of [...this.scope.entries]) {
      if (entry.group === this) entry.dispose();
    }
    this.element.remove();
    this.scope.groups.delete(this);
  }
}

export const FocusContext = createContext<FocusScope>();

export function useUIFocus(): UIFocusScope {
  const scope = useContext(FocusContext);
  if (!scope) throw new Error('Focus primitives require a UIProvider.');
  return scope;
}

export function getFocusScope(): FocusScope {
  useUIFocus();
  return useContext(FocusContext);
}

export function resolveFocusGroup(
  group: RovingFocusGroup | undefined,
  scope: FocusScope,
): FocusGroup | undefined {
  if (!group) return;
  if (!(group instanceof FocusGroup) || group.scope !== scope || group.disposed)
    throw new Error('A roving group must belong to the same live UIProvider.');
  return group;
}

export function createRovingFocusGroup(
  options: RovingFocusGroupOptions = {},
): RovingFocusGroup {
  const scope = getFocusScope();
  const group = new FocusGroup(scope, options);
  scope.groups.add(group);
  group.stop = root((dispose) => {
    createEffect(() => {
      const attributes = {
        role: options.role ?? 'group',
        'aria-label': options.name,
        'aria-orientation':
          options.role !== 'group' &&
          options.role !== undefined &&
          options.orientation !== 'both'
            ? options.orientation
            : undefined,
      };
      for (const [name, value] of Object.entries(attributes))
        setAttribute(group.element, name, value);
      // Read navigation options here so replacing a getter updates the scope.
      void options.loop;
      void options.dir;
      untrack(() => scope.refresh());
    });
    return dispose;
  });
  onCleanup(() => group.dispose());
  return group;
}

export function setAttribute(
  element: HTMLElement,
  name: string,
  value: string | boolean | number | undefined,
) {
  if (value === undefined) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== String(value)) {
    element.setAttribute(name, String(value));
  }
}

/** One registry per provider scope; it never intercepts Tab or input editing. */
export class FocusScope implements UIFocusScope {
  readonly entries: FocusEntry[] = [];
  readonly groups = new Set<FocusGroup>();
  readonly focused: Getter<HTMLElement | null>;
  private readonly setFocused: (value: HTMLElement | null) => void;
  private readonly hosts = new Map<HTMLElement, HTMLElement>();
  private observer?: MutationObserver;
  private active?: FocusEntry;
  private disposed = false;
  private refreshing = false;
  private queued = false;
  private keyboard = true;
  private windowActive = true;
  private doc?: Document;

  constructor() {
    [this.focused, this.setFocused] = createState<HTMLElement | null>(null);
  }

  private sorted() {
    const paths = new Map<PNode, { root: PNode; indices: number[] }>();
    const path = (node: PNode) => {
      const cached = paths.get(node);
      if (cached) return cached;
      const indices: number[] = [];
      let current = node;
      while (current.parentNode) {
        const parent = current.parentNode;
        let index = 0;
        for (
          let child = parent.firstChild;
          child && child !== current;
          child = child.nextSibling
        )
          index++;
        indices.unshift(index);
        current = parent;
      }
      const result = { root: current, indices };
      paths.set(node, result);
      return result;
    };
    const roots = new Map<PNode, number>();
    for (const entry of this.entries) {
      const current = path(entry.node).root;
      if (!roots.has(current)) roots.set(current, roots.size);
    }
    return [...this.entries].sort((a, b) => {
      const explicit = a.order() - b.order();
      if (explicit) return explicit;
      const first = path(a.node);
      const second = path(b.node);
      if (first.root !== second.root)
        return roots.get(first.root)! - roots.get(second.root)!;
      for (
        let i = 0;
        i < Math.min(first.indices.length, second.indices.length);
        i++
      ) {
        const difference = first.indices[i] - second.indices[i];
        if (difference) return difference;
      }
      return first.indices.length - second.indices.length;
    });
  }

  private schedule = () => {
    if (this.queued || this.disposed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (!this.disposed) this.refresh();
    });
  };

  private onKey = () => {
    this.keyboard = true;
    this.active?.updateFocus(this.windowActive);
    // Chromium can update :focus-visible after capture listeners run.
    this.schedule();
  };

  private onPointer = () => {
    this.keyboard = false;
    this.active?.cancel();
    this.active?.updateFocus(this.windowActive);
    this.schedule();
  };

  private onFocus = (event: FocusEvent) => {
    const next = this.entries.find(
      (entry) => entry.binding.element === event.target,
    );
    if (this.active !== next) this.active?.updateFocus(false);
    this.active = next;
    this.setFocused(next?.binding.element ?? null);
    if (!next) return;
    if (next.group) next.group.current = next;
    next.updateFocus(true);
    this.refresh();
    this.schedule();
  };

  private onBlur = () => {
    this.active?.cancel();
    this.active?.updateFocus(false);
    this.setFocused(null);
    this.schedule();
  };

  private onWindowBlur = () => {
    this.windowActive = false;
    this.onBlur();
  };

  private onWindowFocus = () => {
    this.windowActive = true;
    this.refresh();
  };

  private connect(doc: Document) {
    if (this.doc) {
      if (this.doc !== doc)
        throw new Error('A focus scope cannot span documents.');
      return;
    }
    this.doc = doc;
    doc.addEventListener('focusin', this.onFocus);
    doc.addEventListener('focusout', this.onBlur);
    doc.addEventListener('keydown', this.onKey, true);
    doc.addEventListener('pointerdown', this.onPointer, true);
    doc.defaultView?.addEventListener('blur', this.onWindowBlur);
    doc.defaultView?.addEventListener('focus', this.onWindowFocus);
    this.observer = new MutationObserver((records) => {
      if (
        records.some((record) => {
          if (record.type === 'childList') return true;
          const target = record.target as HTMLElement;
          if (target.getAttribute(record.attributeName!) === record.oldValue)
            return false;
          return this.entries.some(
            (entry) =>
              target === entry.binding.element ||
              target.contains(entry.binding.hostElement),
          );
        })
      )
        this.schedule();
    });
    this.observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        'disabled',
        'hidden',
        'inert',
        'style',
        'class',
        'aria-hidden',
      ],
    });
  }

  register(entry: FocusEntry): () => void {
    if (this.disposed)
      throw new Error('Cannot register in a disposed UIProvider.');
    this.connect(entry.binding.element.ownerDocument);
    this.entries.push(entry);
    this.refresh();
    this.schedule();
    return () => {
      const sorted = this.sorted();
      const index = sorted.indexOf(entry);
      const wasActive = this.active === entry;
      const wrapper = entry.binding.hostElement;
      // Native Input remains usable after manual unregistration. Release our
      // structural wrapper without taking ownership of its core DOM binding.
      const host = [...this.hosts.values()].find((host) =>
        host.contains(wrapper),
      );
      if (host?.parentElement) host.parentElement.insertBefore(wrapper, host);
      this.entries.splice(this.entries.indexOf(entry), 1);
      if (wasActive) {
        this.active = undefined;
        this.setFocused(null);
        if (!this.disposed) this.recover(sorted, index, entry.group);
      }
      this.refresh();
    };
  }

  focusVisible(element: HTMLElement): boolean {
    try {
      return element.matches(':focus-visible');
    } catch {
      return this.keyboard;
    }
  }

  focus(entry: FocusEntry): boolean {
    if (this.disposed || !entry.available()) return false;
    entry.binding.element.focus({ preventScroll: true });
    return this.doc?.activeElement === entry.binding.element;
  }

  focusFirst(): boolean {
    const entry = this.sorted().find((entry) => entry.available());
    return entry ? this.focus(entry) : false;
  }

  private recover(sorted: FocusEntry[], index: number, group?: FocusGroup) {
    // If a consumer already moved focus outside this scope, leave it there.
    const current = this.doc?.activeElement;
    if (
      current &&
      current !== this.doc?.body &&
      !sorted.some((entry) => entry.binding.element === current)
    )
      return;
    const candidates = [
      ...sorted.slice(index + 1),
      ...sorted.slice(0, index).reverse(),
    ];
    const next =
      (group &&
        candidates.find(
          (entry) =>
            entry.group === group &&
            this.entries.includes(entry) &&
            entry.available(),
        )) ||
      candidates.find(
        (entry) => this.entries.includes(entry) && entry.available(),
      );
    if (next) this.focus(next);
  }

  navigate(entry: FocusEntry, event: KeyboardEvent): boolean {
    const group = entry.group;
    if (
      !group ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing
    )
      return false;
    const members = this.sorted().filter(
      (item) => item.group === group && item.available(),
    );
    const index = members.indexOf(entry);
    const orientation = group.options.orientation ?? 'horizontal';
    let direction = 0;
    if (orientation !== 'vertical') {
      const sign = group.options.dir === 'rtl' ? -1 : 1;
      if (event.key === 'ArrowRight') direction = sign;
      if (event.key === 'ArrowLeft') direction = -sign;
    }
    if (orientation !== 'horizontal') {
      if (event.key === 'ArrowDown') direction = 1;
      if (event.key === 'ArrowUp') direction = -1;
    }
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = members.length - 1;
    else if (direction) {
      next += direction;
      if (group.options.loop !== false)
        next = (next + members.length) % members.length;
      else next = Math.max(0, Math.min(members.length - 1, next));
    } else return false;
    event.preventDefault();
    if (members[next]) this.focus(members[next]);
    return true;
  }

  refresh() {
    untrack(() => this.refreshEntries());
  }

  private refreshEntries() {
    if (this.disposed || this.refreshing) return;
    this.refreshing = true;
    try {
      const sorted = this.sorted();
      // Adopt only after Pixi attached a positioned wrapper. display:contents
      // keeps the original DOMPipe containing block and world matrix intact.
      for (const entry of sorted) {
        const wrapper = entry.binding.hostElement;
        const parent = wrapper.parentElement;
        if (!parent) continue;
        let scopeHost = [...this.hosts.values()].find(
          (host) => host === parent || host.contains(wrapper),
        );
        if (!scopeHost) {
          scopeHost = this.hosts.get(parent);
          if (!scopeHost) {
            scopeHost = parent.ownerDocument.createElement('div');
            scopeHost.style.display = 'contents';
            parent.append(scopeHost);
            this.hosts.set(parent, scopeHost);
          }
        }
        const target = entry.group?.element ?? scopeHost;
        if (entry.group && target.parentElement !== scopeHost)
          scopeHost.append(target);
        if (wrapper.parentElement !== target) target.append(wrapper);
      }
      for (const scopeHost of this.hosts.values()) {
        const ordered: HTMLElement[] = [];
        for (const entry of sorted) {
          const wrapper = entry.binding.hostElement;
          if (!scopeHost.contains(wrapper)) continue;
          const item = entry.group?.element ?? wrapper;
          if (!ordered.includes(item)) ordered.push(item);
        }
        this.orderChildren(scopeHost, ordered);
        for (const group of this.groups) {
          if (group.element.parentElement === scopeHost)
            this.orderChildren(
              group.element,
              sorted
                .filter((entry) => entry.group === group)
                .map((entry) => entry.binding.hostElement),
            );
        }
      }
      for (const group of this.groups) {
        if (
          !group.current?.available() ||
          !this.entries.includes(group.current)
        )
          group.current = sorted.find(
            (entry) => entry.group === group && entry.available(),
          );
        if (!sorted.some((entry) => entry.group === group))
          group.element.remove();
      }
      for (const entry of sorted) {
        const tabIndex =
          entry.available() && (!entry.group || entry.group.current === entry)
            ? 0
            : -1;
        if (entry.binding.element.tabIndex !== tabIndex)
          entry.binding.element.tabIndex = tabIndex;
      }
      if (this.active && !this.active.available()) {
        const entry = this.active;
        entry.cancel();
        entry.updateFocus(false);
        this.active = undefined;
        this.setFocused(null);
        this.recover(sorted, sorted.indexOf(entry), entry.group);
      } else if (this.active) {
        if (this.doc?.activeElement === this.active.binding.element) {
          this.active.updateFocus(this.windowActive);
          this.setFocused(
            this.windowActive ? this.active.binding.element : null,
          );
        } else {
          this.active.updateFocus(false);
          this.active = undefined;
          this.setFocused(null);
        }
      }
      for (const [parent, host] of this.hosts) {
        if (!host.childElementCount) {
          host.remove();
          this.hosts.delete(parent);
        }
      }
    } finally {
      this.refreshing = false;
    }
  }

  private orderChildren(parent: HTMLElement, children: HTMLElement[]) {
    const active = this.doc?.activeElement as HTMLElement | null;
    for (let i = 0; i < children.length; i++) {
      if (parent.children[i] !== children[i])
        parent.insertBefore(children[i], parent.children[i] ?? null);
    }
    if (
      active?.isConnected &&
      this.doc?.activeElement !== active &&
      children.some((child) => child.contains(active))
    )
      active.focus({ preventScroll: true });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.observer?.disconnect();
    const doc = this.doc;
    doc?.removeEventListener('focusin', this.onFocus);
    doc?.removeEventListener('focusout', this.onBlur);
    doc?.removeEventListener('keydown', this.onKey, true);
    doc?.removeEventListener('pointerdown', this.onPointer, true);
    doc?.defaultView?.removeEventListener('blur', this.onWindowBlur);
    doc?.defaultView?.removeEventListener('focus', this.onWindowFocus);
    for (const entry of [...this.entries]) entry.dispose();
    for (const group of [...this.groups]) group.dispose();
    for (const host of this.hosts.values()) host.remove();
    this.hosts.clear();
    this.setFocused(null);
  }
}
