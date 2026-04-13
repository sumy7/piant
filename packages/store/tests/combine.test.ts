import { autorun } from 'mobx';
import { describe, expect, it } from 'vitest';
import { createStore } from '../src/createStore';
import { combine } from '../src/middleware/combine';

describe('combine middleware', () => {
  it('merges plain initial state with actions into one store', () => {
    const useStore = createStore(
      combine({ count: 0, name: 'piant' }, (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        setName: (name: string) => set({ name }),
      })),
    );

    const state = useStore.getState();
    expect(state.count).toBe(0);
    expect(state.name).toBe('piant');
    expect(typeof state.increment).toBe('function');
    expect(typeof state.setName).toBe('function');
  });

  it('initial state values are accessible via getState()', () => {
    const useStore = createStore(
      combine({ x: 10, y: 20 }, () => ({})),
    );

    expect(useStore.getState().x).toBe(10);
    expect(useStore.getState().y).toBe(20);
  });

  it('actions can update state via set()', () => {
    const useStore = createStore(
      combine({ count: 0 }, (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        reset: () => set({ count: 0 }),
      })),
    );

    useStore.getState().increment();
    useStore.getState().increment();
    expect(useStore.getState().count).toBe(2);

    useStore.getState().reset();
    expect(useStore.getState().count).toBe(0);
  });

  it('actions can read current state via get()', () => {
    const useStore = createStore(
      combine({ value: 5 }, (_set, get) => ({
        doubled: () => get().value * 2,
      })),
    );

    expect(useStore.getState().doubled()).toBe(10);
    useStore.setState({ value: 7 });
    expect(useStore.getState().doubled()).toBe(14);
  });

  it('combined state is reactive via MobX autorun', () => {
    const useStore = createStore(
      combine({ count: 0 }, (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      })),
    );

    const state = useStore();
    const observed: number[] = [];
    const dispose = autorun(() => {
      observed.push(state.count);
    });

    useStore.getState().increment();
    useStore.getState().increment();
    dispose();

    expect(observed).toEqual([0, 1, 2]);
  });

  it('works with empty actions object', () => {
    const useStore = createStore(combine({ a: 1, b: 'hello' }, () => ({})));
    expect(useStore.getState().a).toBe(1);
    expect(useStore.getState().b).toBe('hello');
  });

  it('works with empty initial state', () => {
    const useStore = createStore(
      combine({}, (set) => ({
        count: 0,
        inc: () => set((s) => ({ count: (s as { count: number }).count + 1 })),
      })),
    );
    expect(useStore.getState().count).toBe(0);
    useStore.getState().inc();
    expect(useStore.getState().count).toBe(1);
  });

  it('supports setState() alongside combined actions', () => {
    const useStore = createStore(
      combine({ score: 0 }, (set) => ({
        addPoints: (n: number) => set((s) => ({ score: s.score + n })),
      })),
    );

    useStore.getState().addPoints(5);
    useStore.setState({ score: 100 });
    expect(useStore.getState().score).toBe(100);
  });
});
