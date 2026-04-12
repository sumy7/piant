import { autorun } from 'mobx';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/createStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function waitMicrotask() {
  return new Promise<void>((resolve) => Promise.resolve().then(resolve));
}

// ---------------------------------------------------------------------------
// Basic state creation
// ---------------------------------------------------------------------------

describe('createStore – initial state', () => {
  it('returns the initial state from getState()', () => {
    const useStore = createStore(() => ({ count: 0 }));
    expect(useStore.getState().count).toBe(0);
  });

  it('calling the hook returns the reactive state object', () => {
    const useStore = createStore(() => ({ count: 0 }));
    const state = useStore();
    expect(state.count).toBe(0);
  });

  it('supports string, number, boolean, array and nested object properties', () => {
    const useStore = createStore(() => ({
      name: 'piant',
      version: 1,
      active: true,
      tags: ['a', 'b'],
      meta: { author: 'test' },
    }));
    const s = useStore.getState();
    expect(s.name).toBe('piant');
    expect(s.version).toBe(1);
    expect(s.active).toBe(true);
    expect(s.tags).toEqual(['a', 'b']);
    expect(s.meta.author).toBe('test');
  });
});

// ---------------------------------------------------------------------------
// setState
// ---------------------------------------------------------------------------

describe('createStore – setState', () => {
  it('updates state with a partial object', () => {
    const useStore = createStore(() => ({ count: 0, name: 'hello' }));
    useStore.setState({ count: 5 });
    expect(useStore.getState().count).toBe(5);
    expect(useStore.getState().name).toBe('hello');
  });

  it('updates state with an updater function', () => {
    const useStore = createStore(() => ({ count: 1 }));
    useStore.setState((s) => ({ count: s.count * 10 }));
    expect(useStore.getState().count).toBe(10);
  });

  it('can perform multiple sequential updates', () => {
    const useStore = createStore(() => ({ count: 0 }));
    useStore.setState({ count: 1 });
    useStore.setState({ count: 2 });
    useStore.setState({ count: 3 });
    expect(useStore.getState().count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Actions (functions in the store)
// ---------------------------------------------------------------------------

describe('createStore – actions', () => {
  it('actions defined in the creator can read state via get()', () => {
    interface S {
      count: number;
      double: () => number;
    }
    const useStore = createStore<S>((_set, get) => ({
      count: 5,
      double: () => get().count * 2,
    }));
    expect(useStore.getState().double()).toBe(10);
    useStore.setState({ count: 7 });
    expect(useStore.getState().double()).toBe(14);
  });

  it('actions can update state via set()', () => {
    interface S {
      count: number;
      increment: () => void;
    }
    const useStore = createStore<S>((set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 })),
    }));

    useStore.getState().increment();
    expect(useStore.getState().count).toBe(1);

    useStore.getState().increment();
    expect(useStore.getState().count).toBe(2);
  });

  it('actions support object-spread immutable updates', () => {
    interface Todo {
      id: number;
      text: string;
      done: boolean;
    }
    interface S {
      todos: Todo[];
      addTodo: (text: string) => void;
      toggleTodo: (id: number) => void;
      removeTodo: (id: number) => void;
    }

    let nextId = 1;
    const useStore = createStore<S>((set) => ({
      todos: [],
      addTodo: (text) =>
        set((s) => ({
          todos: [...s.todos, { id: nextId++, text, done: false }],
        })),
      toggleTodo: (id) =>
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done } : t,
          ),
        })),
      removeTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
    }));

    const { addTodo, toggleTodo, removeTodo } = useStore.getState();

    addTodo('Learn Piant');
    addTodo('Build something');

    expect(useStore.getState().todos).toHaveLength(2);
    expect(useStore.getState().todos[0]?.text).toBe('Learn Piant');
    expect(useStore.getState().todos[0]?.done).toBe(false);

    toggleTodo(1);
    expect(useStore.getState().todos[0]?.done).toBe(true);

    removeTodo(1);
    expect(useStore.getState().todos).toHaveLength(1);
    expect(useStore.getState().todos[0]?.text).toBe('Build something');
  });
});

// ---------------------------------------------------------------------------
// MobX reactivity integration
// ---------------------------------------------------------------------------

describe('createStore – MobX reactivity', () => {
  it('state properties are reactive (autorun tracks them)', () => {
    const useStore = createStore(() => ({ count: 0 }));
    const state = useStore();

    const observed: number[] = [];
    const dispose = autorun(() => {
      observed.push(state.count);
    });

    useStore.setState({ count: 1 });
    useStore.setState({ count: 2 });
    dispose();

    expect(observed).toEqual([0, 1, 2]);

    // After dispose, further changes must not be tracked
    useStore.setState({ count: 99 });
    expect(observed).toEqual([0, 1, 2]);
  });

  it('array property is reactive', () => {
    const useStore = createStore(() => ({ items: ['a'] }));
    const state = useStore();

    const lengths: number[] = [];
    const dispose = autorun(() => {
      lengths.push(state.items.length);
    });

    useStore.setState({ items: ['a', 'b'] });
    useStore.setState({ items: ['a', 'b', 'c'] });
    dispose();

    expect(lengths).toEqual([1, 2, 3]);

    // After dispose, further changes must not be tracked
    useStore.setState({ items: [] });
    expect(lengths).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe('createStore – subscribe', () => {
  it('listener is called when state changes', async () => {
    const useStore = createStore(() => ({ count: 0 }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(listener);
    useStore.setState({ count: 1 });

    await waitMicrotask();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].count).toBe(1);
    expect(listener.mock.calls[0][1].count).toBe(0);

    unsub();
  });

  it('listener is not called after unsubscribe', async () => {
    const useStore = createStore(() => ({ count: 0 }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(listener);
    unsub();

    useStore.setState({ count: 99 });
    await waitMicrotask();

    expect(listener).not.toHaveBeenCalled();
  });

  it('listener is not called when state does not change (structural equality – primitive)', async () => {
    const useStore = createStore(() => ({ count: 0 }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(listener);
    // Set same primitive value – should not trigger listener
    useStore.setState({ count: 0 });

    await waitMicrotask();

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it('listener is not called for new reference that is deep-equal (structural equality)', async () => {
    const useStore = createStore(() => ({ items: ['a'] as string[] }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(listener);
    // Replace array with a new reference that is structurally identical
    useStore.setState({ items: ['a'] });

    await waitMicrotask();

    expect(listener).not.toHaveBeenCalled();
    unsub();
  });

  it('multiple listeners can subscribe independently', async () => {
    const useStore = createStore(() => ({ count: 0 }));
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    const unsubA = useStore.subscribe(listenerA);
    const unsubB = useStore.subscribe(listenerB);

    useStore.setState({ count: 1 });
    await waitMicrotask();

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);

    unsubA();
    useStore.setState({ count: 2 });
    await waitMicrotask();

    expect(listenerA).toHaveBeenCalledTimes(1); // not called again
    expect(listenerB).toHaveBeenCalledTimes(2);

    unsubB();
  });
});

// ---------------------------------------------------------------------------
// getState / setState as static methods
// ---------------------------------------------------------------------------

describe('createStore – static API methods', () => {
  it('getState() always returns the latest state', () => {
    const useStore = createStore(() => ({ value: 'initial' }));
    expect(useStore.getState().value).toBe('initial');
    useStore.setState({ value: 'updated' });
    expect(useStore.getState().value).toBe('updated');
  });

  it('setState() via static method is the same as via returned hook', () => {
    const useStore = createStore(() => ({ x: 1 }));
    const state = useStore();
    useStore.setState({ x: 42 });
    expect(state.x).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Safe set/get during creator initialization
// ---------------------------------------------------------------------------

describe('createStore – safe set/get during creator', () => {
  it('get() called during creator does not throw', () => {
    // Creator calls get() to derive an initial value – state is pre-initialized
    const useStore = createStore((_set, get) => {
      // get() returns the pre-initialized empty observable; no crash
      const _early = get();
      return { count: 0, ready: _early !== undefined };
    });
    expect(useStore.getState().count).toBe(0);
    expect(useStore.getState().ready).toBe(true);
  });

  it('set() called during creator does not throw', () => {
    // Creator calls set() as a side-effect during initialization
    const useStore = createStore((set) => {
      // set() is safe even before the initial state object is returned
      set({ count: 5 });
      return { count: 0 };
    });
    // Initial state (count: 0) is merged after, so it wins over the early set
    expect(useStore.getState().count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Selector-based subscribe
// ---------------------------------------------------------------------------

describe('createStore – selector-based subscribe', () => {
  it('fires listener only when selected slice changes', async () => {
    const useStore = createStore(() => ({ a: 1, b: 10 }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(
      (s) => s.a,
      (curr, prev) => listener(curr, prev),
    );

    // Change unselected field – listener must not fire
    useStore.setState({ b: 99 });
    await waitMicrotask();
    expect(listener).not.toHaveBeenCalled();

    // Change selected field – listener fires
    useStore.setState({ a: 2 });
    await waitMicrotask();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]).toEqual([2, 1]);

    unsub();
  });

  it('does not fire after unsubscribe', async () => {
    const useStore = createStore(() => ({ count: 0 }));
    const listener = vi.fn();

    const unsub = useStore.subscribe(
      (s) => s.count,
      listener,
    );
    unsub();

    useStore.setState({ count: 5 });
    await waitMicrotask();
    expect(listener).not.toHaveBeenCalled();
  });

  it('accepts a custom equals function', async () => {
    const useStore = createStore(() => ({ value: 1 }));
    const listener = vi.fn();

    // Treat any change less than 10 as equal (listener stays silent)
    const unsub = useStore.subscribe(
      (s) => s.value,
      listener,
      { equals: (a, b) => Math.abs(a - b) < 10 },
    );

    useStore.setState({ value: 5 }); // diff = 4, within threshold
    await waitMicrotask();
    expect(listener).not.toHaveBeenCalled();

    useStore.setState({ value: 20 }); // diff = 15, above threshold
    await waitMicrotask();
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
  });
});
