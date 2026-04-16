import { untracked } from 'mobx';
import { effect, memo } from '../reactivity/effects';
import { createState } from '../reactivity/hooks';

export interface TransitionEvents {
  onBeforeEnter?: (el: any) => void;
  onEnter?: (el: any, done: () => void) => void;
  onAfterEnter?: (el: any) => void;
  onBeforeExit?: (el: any) => void;
  onExit?: (el: any, done: () => void) => void;
  onAfterExit?: (el: any) => void;
}

export interface TransitionProps extends TransitionEvents {
  mode?: 'out-in' | 'in-out' | 'parallel';
  appear?: boolean;
  children?: JSX.Element;
}

export function Transition(props: TransitionProps): JSX.Element {
  const [items, setItems] = createState<JSX.Element[]>([]);
  let initialized = false;
  let mainEl: JSX.Element | null = null;

  const doEnter = (el: JSX.Element, onComplete?: () => void) => {
    props.onBeforeEnter?.(el);
    queueMicrotask(() => {
      const done = () => {
        props.onAfterEnter?.(el);
        onComplete?.();
      };
      if (props.onEnter) {
        props.onEnter(el, done);
      } else {
        done();
      }
    });
  };

  const doExit = (el: JSX.Element, onDone: () => void) => {
    props.onBeforeExit?.(el);
    const done = () => {
      props.onAfterExit?.(el);
      onDone();
    };
    if (props.onExit) {
      props.onExit(el, done);
    } else {
      done();
    }
  };

  effect(() => {
    const child = (props.children ?? null) as JSX.Element | null;

    untracked(() => {
      if (!initialized) {
        initialized = true;
        mainEl = child;
        if (child != null) {
          setItems([child]);
          if (props.appear) {
            doEnter(child);
          }
        }
        return;
      }

      // Use Object.is for referential identity: the same JSX element reference
      // means the child has not changed, so no transition should occur.
      if (Object.is(child, mainEl)) return;

      const prev = mainEl;
      mainEl = child;
      const mode = props.mode ?? 'parallel';

      if (mode === 'out-in') {
        if (prev != null) {
          setItems([prev]);
          doExit(prev, () => {
            setItems(child != null ? [child] : []);
            if (child != null) doEnter(child);
          });
        } else {
          setItems(child != null ? [child] : []);
          if (child != null) doEnter(child);
        }
      } else if (mode === 'in-out') {
        if (child != null) {
          const snapshot = prev;
          const combined: JSX.Element[] = [child];
          if (snapshot != null) combined.push(snapshot);
          setItems(combined);
          doEnter(child, () => {
            if (snapshot != null) {
              doExit(snapshot, () => {
                setItems((cur) => cur.filter((i) => i !== snapshot));
              });
            }
          });
        } else {
          if (prev != null) {
            setItems([prev]);
            doExit(prev, () => setItems([]));
          } else {
            setItems([]);
          }
        }
      } else {
        // parallel mode
        const snapshot = prev;
        const newItems: JSX.Element[] = [];
        if (child != null) newItems.push(child);
        if (snapshot != null) newItems.push(snapshot);
        setItems(newItems);
        if (child != null) doEnter(child);
        if (snapshot != null) {
          doExit(snapshot, () => {
            setItems((cur) => cur.filter((i) => i !== snapshot));
          });
        }
      }
    });
  });

  return memo(() => {
    const current = items();
    if (current.length === 0) return null;
    if (current.length === 1) return current[0];
    return current;
  }) as JSX.Element;
}
