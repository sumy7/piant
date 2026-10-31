import { createEffect, createState, mergeProps, root } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import {
  type ControllableStateOptions,
  createControllableState,
} from '../dist/index.js';

describe('createControllableState', () => {
  it('reads the default once, commits one uncontrolled update, and skips Object.is equal values', () => {
    let defaults = 0;
    const changed = vi.fn();
    const [value, setValue] = createControllableState({
      get defaultValue() {
        defaults++;
        return 1;
      },
      onChange: changed,
    });
    expect(value()).toBe(1);
    expect(setValue((previous) => previous + 1)).toBe(2);
    expect(value()).toBe(2);
    setValue(2);
    expect(changed.mock.calls).toEqual([[2]]);
    expect(defaults).toBe(1);
  });

  it('requests controlled changes without committing them; caller updates do not re-emit onChange', () => {
    const [external, commit] = createState(3);
    const changed = vi.fn();
    let reads = 0;
    const [value, setValue] = createControllableState({
      get value() {
        return external();
      },
      get defaultValue() {
        reads++;
        return 0;
      },
      onChange: changed,
    });
    setValue((previous) => previous + 1);
    expect(value()).toBe(3);
    expect(changed.mock.calls).toEqual([[4]]);
    commit(4);
    expect(value()).toBe(4);
    expect(changed).toHaveBeenCalledTimes(1);
    setValue(4);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(reads).toBe(1);
  });

  it('uses the latest callback and reflects synchronous caller acceptance exactly once', () => {
    const [external, commit] = createState(false);
    const first = vi.fn((next: boolean) => commit(next));
    const second = vi.fn((next: boolean) => commit(next));
    const [callback, changeCallback] =
      createState<(next: boolean) => void>(first);
    const [value, setValue] = createControllableState({
      get value() {
        return external();
      },
      defaultValue: true,
      get onChange() {
        return callback();
      },
    });
    setValue(true);
    expect(value()).toBe(true);
    expect(first.mock.calls).toEqual([[true]]);
    changeCallback(() => second);
    setValue(false);
    expect(value()).toBe(false);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second.mock.calls).toEqual([[false]]);
  });

  it.each([false, 0, null])(
    'treats %s as controlled and preserves the last internal value when control is removed',
    (controlled) => {
      const options: ControllableStateOptions<typeof controlled | string> = {
        value: controlled,
        defaultValue: 'initial',
      };
      const [value, setValue] = createControllableState(options);
      setValue('rejected');
      expect(value()).toBe(controlled);
      options.value = undefined;
      expect(value()).toBe('initial');
      setValue('local');
      options.value = controlled;
      setValue('also rejected');
      options.value = undefined;
      expect(value()).toBe('local');
    },
  );

  it('keeps object identity, NaN equality and updater results without deep wrapping', () => {
    const initial = { selected: false };
    const next = { selected: true };
    const changed = vi.fn();
    const [value, setValue] = createControllableState({
      defaultValue: initial,
      onChange: changed,
    });
    expect(value()).toBe(initial);
    setValue(initial);
    expect(changed).not.toHaveBeenCalled();
    setValue(next);
    expect(value()).toBe(next);
    expect(changed.mock.calls[0][0]).toBe(next);
    setValue(next);
    expect(changed).toHaveBeenCalledTimes(1);
    const numeric = vi.fn();
    const [, setNumeric] = createControllableState({
      defaultValue: Number.NaN,
      onChange: numeric,
    });
    setNumeric(Number.NaN);
    expect(numeric).not.toHaveBeenCalled();
  });

  it('preserves reactive props and callbacks through public mergeProps and explicit checked/open adapters', () => {
    const [checked, setChecked] = createState(false);
    const [open, setOpen] = createState(false);
    const first = vi.fn();
    const second = vi.fn();
    const [useSecond, setSecond] = createState(false);
    const forwarded = mergeProps(
      {},
      {
        get checked() {
          return checked();
        },
        get onCheckedChange() {
          return useSecond() ? second : first;
        },
      },
    ) as { checked: boolean; onCheckedChange: (value: boolean) => void };
    const [selection, requestSelection] = createControllableState({
      get value() {
        return forwarded.checked;
      },
      defaultValue: false,
      get onChange() {
        return forwarded.onCheckedChange;
      },
    });
    const [visible, requestVisible] = createControllableState({
      get value() {
        return open();
      },
      defaultValue: false,
      onChange: setOpen,
    });
    let observations = 0;
    const dispose = root((dispose) => {
      createEffect(() => {
        selection();
        observations++;
      });
      return dispose;
    });
    setChecked(true);
    expect(selection()).toBe(true);
    expect(observations).toBe(2);
    setSecond(true);
    requestSelection(false);
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([[false]]);
    requestVisible(true);
    expect(visible()).toBe(true);
    dispose();
    setChecked(false);
    expect(observations).toBe(2);
  });
  it('does not subscribe an effect to internal state merely by calling an updater setter', () => {
    const [trigger, rerun] = createState(0);
    const [value, setValue] = createControllableState({ defaultValue: 0 });
    let runs = 0;
    const dispose = root((dispose) => {
      createEffect(() => {
        trigger();
        runs++;
        setValue((previous) => previous + 1);
      });
      return dispose;
    });
    try {
      expect(value()).toBe(1);
      rerun(1);
      expect(value()).toBe(2);
      expect(runs).toBe(2);
    } finally {
      dispose();
    }
  });
  it('does not track controlled values, updater reads or callback reads in the calling effect', () => {
    const [trigger, rerun] = createState(0);
    const [external, commit] = createState(0);
    const [increment, changeIncrement] = createState(1);
    const [accept, changeAccept] = createState(true);
    const first = vi.fn((next: number) => {
      if (accept()) commit(next);
    });
    const second = vi.fn((next: number) => {
      if (accept()) commit(next);
    });
    const [callback, changeCallback] = createState(first);
    const [value, setValue] = createControllableState({
      get value() {
        return external();
      },
      defaultValue: 0,
      get onChange() {
        return callback();
      },
    });
    let runs = 0;
    const dispose = root((dispose) => {
      createEffect(() => {
        trigger();
        runs++;
        setValue((previous) => previous + increment());
      });
      return dispose;
    });
    try {
      expect(value()).toBe(1);
      expect(runs).toBe(1);
      commit(10);
      changeIncrement(2);
      changeCallback(() => second);
      changeAccept(false);
      expect(runs).toBe(1);
      rerun(1);
      expect(value()).toBe(10);
      expect(runs).toBe(2);
      expect(second.mock.calls).toEqual([[12]]);
      changeAccept(true);
      rerun(2);
      expect(value()).toBe(12);
      expect(runs).toBe(3);
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(2);
    } finally {
      dispose();
    }
  });
});
