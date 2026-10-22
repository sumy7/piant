import { untracked } from 'mobx';
import { cleanup, effect } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';

export interface TransitionEvents {
  onBeforeEnter?: (el: any) => void;
  /** Return a disposer to cancel work when this phase is interrupted or unmounted. */
  onEnter?: (el: any, done: () => void) => void | (() => void);
  onAfterEnter?: (el: any) => void;
  onBeforeExit?: (el: any) => void;
  onExit?: (el: any, done: () => void) => void | (() => void);
  onAfterExit?: (el: any) => void;
}

export interface TransitionProps extends TransitionEvents {
  mode?: 'out-in' | 'in-out' | 'parallel';
  appear?: boolean;
  /** A node or a reactive accessor, such as the output of Show. */
  children?: JSX.Element;
}

function toEl(raw: unknown): JSX.Element | null {
  if (raw == null || typeof raw === 'boolean') return null;
  if (Array.isArray(raw) && raw.length === 0) return null;
  return raw as JSX.Element;
}

/** Coordinates switching content; hooks receive the resolved child. */
export function Transition(props: TransitionProps): JSX.Element {
  const [displayItems, setDisplayItems] = createState<JSX.Element[]>([]);
  let initialized = false;
  let mainEl: JSX.Element | null = null;
  let disposed = false;
  let generation = 0;
  const phases = new Set<() => void>();

  const cancelPhases = () => {
    generation += 1;
    const pending = [...phases];
    phases.clear();
    for (const cancel of pending) cancel();
  };
  cleanup(() => {
    disposed = true;
    cancelPhases();
  });

  const phase = (el: JSX.Element, entering: boolean, complete?: () => void) => {
    const current = generation;
    let active = true;
    let dispose: void | (() => void);
    const cancel = () => {
      active = false;
      dispose?.();
    };
    phases.add(cancel);
    const valid = () => active && !disposed && generation === current;
    const done = () => {
      if (!valid()) return;
      active = false;
      phases.delete(cancel);
      if (entering) props.onAfterEnter?.(el);
      else props.onAfterExit?.(el);
      // After hooks may synchronously switch children or dispose the owner.
      if (!disposed && generation === current) complete?.();
    };
    if (entering) props.onBeforeEnter?.(el);
    else props.onBeforeExit?.(el);
    const start = () => {
      if (!valid()) return;
      const hook = entering ? props.onEnter : props.onExit;
      if (hook) {
        dispose = hook(el, done);
        // A synchronous hook can trigger replacement before returning cleanup.
        if (disposed || generation !== current) dispose?.();
      } else done();
    };
    // Enter runs after the renderer has attached the new node.
    if (entering) queueMicrotask(start);
    else start();
  };

  effect(() => {
    const raw = props.children ?? null;
    const resolved =
      typeof raw === 'function' && raw.length === 0 ? raw() : raw;
    const child = toEl(resolved);
    const mode = props.mode ?? 'parallel';
    untracked(() => {
      if (!initialized) {
        initialized = true;
        mainEl = child;
        if (child != null) {
          setDisplayItems([child]);
          if (props.appear) phase(child, true);
        }
        return;
      }
      if (Object.is(child, mainEl)) return;
      // In out-in mode mainEl can be a pending, never-mounted child. Always
      // leave the currently visible node, skipping superseded pending pages.
      const visible = displayItems();
      const previous = visible.includes(mainEl as JSX.Element)
        ? mainEl
        : (visible[0] ?? null);
      mainEl = child;
      cancelPhases();
      const enter = () => {
        setDisplayItems(child != null ? [child] : []);
        if (child != null) phase(child, true);
      };
      const exit = () => {
        if (previous == null || previous === child) return;
        phase(previous, false, () => {
          setDisplayItems((items) => items.filter((item) => item !== previous));
        });
      };
      if (mode === 'out-in' && previous != null && previous !== child) {
        setDisplayItems([previous]);
        phase(previous, false, enter);
      } else if (mode === 'in-out' && child != null) {
        setDisplayItems(
          previous != null && previous !== child ? [child, previous] : [child],
        );
        phase(child, true, exit);
      } else {
        setDisplayItems([
          ...(child != null ? [child] : []),
          ...(previous != null && previous !== child ? [previous] : []),
        ]);
        if (child != null) phase(child, true);
        exit();
      }
    });
  });
  return displayItems as unknown as JSX.Element;
}
