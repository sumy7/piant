import { Container } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Show } from '../src/components/Show';
import { View } from '../src/components/View';
import type { PNode } from '../src/elements/PNode';
import { PRoot } from '../src/elements/PRoot';
import type { PView } from '../src/elements/PView';
import { createState, onCleanup, onMount } from '../src/reactivity/hooks';
import { render } from '../src/renderer/runtime';

describe('onMount rendering order', () => {
  let container: PRoot;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = new PRoot(new Container(), { width: 300, height: 200 });
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    container.removeAllChildren();
    container.destroy();
  });

  it('waits for ref assignment and insertion into the render root', async () => {
    let ref: PView | undefined;
    const observations: (PNode | undefined)[] = [];
    dispose = render(() => {
      onMount(() => observations.push(ref, ref?.parentNode ?? undefined));
      return View({
        ref: (node) => {
          ref = node;
        },
      });
    }, container);

    expect(ref).toBeDefined();
    expect(observations).toEqual([]);
    await Promise.resolve();
    expect(observations).toEqual([ref, container]);
  });

  it('mounts nested components after the entire tree is attached', async () => {
    let parent: PView | undefined;
    let child: PView | undefined;
    const mounted: string[] = [];
    const attached: boolean[] = [];
    function Child() {
      onMount(() => {
        mounted.push('child');
        attached.push(
          child?.parentNode === parent && child?._root === container,
        );
      });
      return View({
        ref: (node) => {
          child = node;
        },
      });
    }
    dispose = render(() => {
      onMount(() => {
        mounted.push('parent');
        attached.push(
          parent?.parentNode === container && child?.parentNode === parent,
        );
      });
      return View({
        ref: (node) => {
          parent = node;
        },
        get children() {
          return Child();
        },
      });
    }, container);

    expect(mounted).toEqual([]);
    await Promise.resolve();
    expect(mounted).toEqual(['parent', 'child']);
    expect(attached).toEqual([true, true]);
  });

  it('cancels removed branches and mounts a later branch exactly once', async () => {
    const [visible, setVisible] = createState(false);
    const [value, setValue] = createState(0);
    const mount = vi.fn();
    const cleanup = vi.fn();
    dispose = render(
      () =>
        Show({
          get when() {
            return visible();
          },
          get children() {
            let ref: PView | undefined;
            onMount(() => {
              mount(ref?.parentNode, value());
              onCleanup(cleanup);
            });
            return View({
              ref: (node) => {
                ref = node;
              },
            });
          },
        }),
      container,
    );

    setVisible(true);
    setVisible(false);
    await Promise.resolve();
    expect(mount).not.toHaveBeenCalled();

    setVisible(true);
    expect(mount).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(mount).toHaveBeenCalledExactlyOnceWith(container, 0);
    setValue(1);
    await Promise.resolve();
    expect(mount).toHaveBeenCalledTimes(1);
    setVisible(false);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('cancels callbacks when the renderer is disposed before mounting', async () => {
    const mount = vi.fn();
    dispose = render(() => {
      onMount(mount);
      return View({});
    }, container);
    dispose();
    dispose = undefined;
    await Promise.resolve();
    expect(mount).not.toHaveBeenCalled();
  });
});
