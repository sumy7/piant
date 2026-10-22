import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { View } from '../src/components/View';
import { PNode } from '../src/elements/PNode';
import { createComponent } from '../src/h/node';
import {
  createEffect,
  createState,
  onCleanup,
  onError,
} from '../src/reactivity/hooks';
import { getOwner, runWithOwner } from '../src/reactivity/owner';
import { render } from '../src/renderer/runtime';

// The preset compiles <ErrorBoundary><View><Child /></View></ErrorBoundary>
// to nested createComponent calls with children getters, as used below.
function Leaf(props: { name: string }): JSX.Element {
  const node = new PNode();
  node.displayName = props.name;
  return node as JSX.Element;
}

function names(node: PNode): string[] {
  return [node.displayName, ...node._children.flatMap(names)];
}

describe('ErrorBoundary with compiled JSX children', () => {
  let container: PNode;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    container = new PNode();
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    container.removeAllChildren();
    container.destroy();
  });

  it('captures initial child construction failures and reconstructs on repeated reset', () => {
    let shouldThrow = true;
    let reset: (() => void) | undefined;
    const outerError = vi.fn();
    const constructed = vi.fn();
    const cleaned = vi.fn();
    function Child() {
      constructed();
      onCleanup(cleaned);
      if (shouldThrow) throw new Error('construction failed');
      return createComponent(Leaf, { name: 'healthy' });
    }

    dispose = render(() => {
      onError(outerError);
      return createComponent(ErrorBoundary, {
        fallback: (error: Error, retry: () => void) => {
          expect(error.message).toBe('construction failed');
          reset = retry;
          return createComponent(Leaf, { name: 'fallback' });
        },
        get children() {
          return createComponent(View, {
            get children() {
              return createComponent(Child, {});
            },
          });
        },
      });
    }, container);

    for (let cycle = 0; cycle < 3; cycle++) {
      expect(names(container)).toContain('fallback');
      expect(names(container)).not.toContain('healthy');
      expect(reset).toBeTypeOf('function');
      reset!();
    }
    expect(names(container)).toContain('fallback');
    shouldThrow = false;
    reset!();
    expect(names(container)).toContain('healthy');
    expect(names(container)).not.toContain('fallback');
    expect(constructed).toHaveBeenCalledTimes(5);
    expect(cleaned).toHaveBeenCalledTimes(4);
    expect(outerError).not.toHaveBeenCalled();
  });

  it('captures reactive child effects, disposes failed branches and recovers repeatedly', () => {
    const [fail, setFail] = createState(false);
    const [tick, setTick] = createState(0);
    let reset: (() => void) | undefined;
    const outerError = vi.fn();
    const constructed = vi.fn();
    const cleaned = vi.fn();
    const observed = vi.fn();
    function Child() {
      constructed();
      onCleanup(cleaned);
      createEffect(() => {
        observed(tick());
        if (fail()) throw new Error('effect failed');
      });
      return createComponent(Leaf, { name: 'healthy' });
    }
    dispose = render(() => {
      onError(outerError);
      return createComponent(ErrorBoundary, {
        fallback: (_error: Error, retry: () => void) => {
          reset = retry;
          return createComponent(Leaf, { name: 'fallback' });
        },
        get children() {
          return createComponent(View, {
            get children() {
              return createComponent(Child, {});
            },
          });
        },
      });
    }, container);

    for (let cycle = 0; cycle < 3; cycle++) {
      expect(names(container)).toContain('healthy');
      setFail(true);
      expect(names(container)).toContain('fallback');
      expect(names(container)).not.toContain('healthy');
      expect(cleaned).toHaveBeenCalledTimes(cycle + 1);
      observed.mockClear();
      setTick(cycle + 1);
      expect(observed).not.toHaveBeenCalled();
      setFail(false);
      expect(names(container)).toContain('fallback');
      reset!();
      expect(names(container)).toContain('healthy');
      expect(names(container)).not.toContain('fallback');
    }
    expect(constructed).toHaveBeenCalledTimes(4);
    expect(outerError).not.toHaveBeenCalled();
    dispose!();
    dispose = undefined;
    expect(cleaned).toHaveBeenCalledTimes(4);
    observed.mockClear();
    setTick(4);
    expect(observed).not.toHaveBeenCalled();
  });

  it('isolates sibling boundaries and sends nested failures to the nearest boundary', () => {
    const [failLeft, setFailLeft] = createState(false);
    const [failInner, setFailInner] = createState(false);
    const outerError = vi.fn();
    function Child(props: { failed: boolean; name: string }) {
      createEffect(() => {
        if (props.failed) throw new Error(props.name);
      });
      return createComponent(Leaf, { name: props.name });
    }
    dispose = render(() => {
      onError(outerError);
      return createComponent(View, {
        get children() {
          return [
            createComponent(ErrorBoundary, {
              fallback: () => createComponent(Leaf, { name: 'left fallback' }),
              get children() {
                return createComponent(Child, {
                  name: 'left healthy',
                  get failed() {
                    return failLeft();
                  },
                });
              },
            }),
            createComponent(ErrorBoundary, {
              fallback: () => createComponent(Leaf, { name: 'outer fallback' }),
              get children() {
                return createComponent(ErrorBoundary, {
                  fallback: () =>
                    createComponent(Leaf, { name: 'inner fallback' }),
                  get children() {
                    return createComponent(Child, {
                      name: 'inner healthy',
                      get failed() {
                        return failInner();
                      },
                    });
                  },
                });
              },
            }),
          ];
        },
      });
    }, container);

    setFailLeft(true);
    expect(names(container)).toContain('left fallback');
    expect(names(container)).toContain('inner healthy');
    setFailInner(true);
    expect(names(container)).toContain('left fallback');
    expect(names(container)).toContain('inner fallback');
    expect(names(container)).not.toContain('outer fallback');
    expect(outerError).not.toHaveBeenCalled();
  });

  it('propagates errors thrown by its fallback to an outer boundary', () => {
    const outerFallback = vi.fn((_error: Error) =>
      createComponent(Leaf, { name: 'outer fallback' }),
    );
    const fallbackError = new Error('fallback failed');
    function Broken() {
      throw new Error('child failed');
    }
    dispose = render(
      () =>
        createComponent(ErrorBoundary, {
          fallback: outerFallback,
          get children() {
            return createComponent(ErrorBoundary, {
              fallback: (_error: Error) => {
                throw fallbackError;
              },
              get children() {
                return createComponent(Broken, {});
              },
            });
          },
        }),
      container,
    );

    expect(names(container)).toContain('outer fallback');
    expect(outerFallback).toHaveBeenCalledTimes(1);
    expect(outerFallback.mock.calls[0][0]).toBe(fallbackError);
  });

  it('keeps stable accessor siblings mounted when a dynamic sibling updates', () => {
    const [version, setVersion] = createState(0);
    let setLocal: ((value: number) => number) | undefined;
    let stableNode: PNode | undefined;
    const constructed = vi.fn();
    const cleaned = vi.fn();
    function StableText() {
      constructed();
      onCleanup(cleaned);
      const [local, updateLocal] = createState(0);
      setLocal = updateLocal;
      stableNode = new PNode();
      const node = stableNode;
      createEffect(() => {
        node.displayName = `stable ${local()}`;
      });
      return node as JSX.Element;
    }
    dispose = render(
      () =>
        createComponent(ErrorBoundary, {
          fallback: () =>
            createComponent(Leaf, { name: 'unexpected fallback' }),
          get children() {
            return [
              () => createComponent(StableText, {}),
              () => createComponent(Leaf, { name: `dynamic ${version()}` }),
            ];
          },
        }),
      container,
    );

    const initialNode = stableNode;
    setLocal!(42);
    for (let version = 1; version <= 3; version++) {
      setVersion(version);
      expect(names(container)).toContain(`dynamic ${version}`);
      expect(names(container)).toContain('stable 42');
      expect(stableNode).toBe(initialNode);
      expect(constructed).toHaveBeenCalledTimes(1);
      expect(cleaned).not.toHaveBeenCalled();
    }
    dispose!();
    dispose = undefined;
    expect(cleaned).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'captures deferred child getters (initially failing: %s)',
    (initiallyFailing) => {
      const [fail, setFail] = createState(initiallyFailing);
      const outerError = vi.fn();
      dispose = render(() => {
        onError(outerError);
        return createComponent(ErrorBoundary, {
          fallback: (error: Error) =>
            createComponent(Leaf, { name: error.message }),
          get children() {
            return () => {
              if (fail()) throw new Error('deferred failure');
              return createComponent(Leaf, { name: 'healthy' });
            };
          },
        });
      }, container);

      if (!initiallyFailing) expect(names(container)).toContain('healthy');
      setFail(true);
      expect(names(container)).toContain('deferred failure');
      expect(names(container)).not.toContain('healthy');
      expect(outerError).not.toHaveBeenCalled();
    },
  );

  it('propagates a deferred fallback getter failure to the outer boundary', () => {
    const fallbackError = new Error('deferred fallback failed');
    const outerFallback = vi.fn((error: Error) =>
      createComponent(Leaf, { name: error.message }),
    );
    function Broken() {
      throw new Error('child failed');
    }
    dispose = render(
      () =>
        createComponent(ErrorBoundary, {
          fallback: outerFallback,
          get children() {
            return createComponent(ErrorBoundary, {
              fallback: (_error: Error) => () => {
                throw fallbackError;
              },
              get children() {
                return createComponent(Broken, {});
              },
            });
          },
        }),
      container,
    );

    expect(names(container)).toContain('deferred fallback failed');
    expect(outerFallback).toHaveBeenCalledTimes(1);
    expect(outerFallback.mock.calls[0][0]).toBe(fallbackError);
  });

  it('preserves stabilized getters for ordinary components', () => {
    const [value, setValue] = createState(0);
    const childrenGetter = vi.fn(() =>
      createComponent(Leaf, { name: 'stable child' }),
    );
    const valueGetter = vi.fn(value);
    const constructed = vi.fn();
    const observed: number[] = [];
    const childReads: JSX.Element[] = [];
    function Ordinary(props: { value: number; children: JSX.Element }) {
      constructed();
      childReads.push(props.children, props.children);
      createEffect(() => observed.push(props.value + props.value));
      return props.children;
    }
    dispose = render(
      () =>
        createComponent(Ordinary, {
          get value() {
            return valueGetter();
          },
          get children() {
            return childrenGetter();
          },
        }),
      container,
    );

    expect(childrenGetter).toHaveBeenCalledTimes(1);
    expect(valueGetter).toHaveBeenCalledTimes(1);
    expect(constructed).toHaveBeenCalledTimes(1);
    expect(childReads[0]).toBeInstanceOf(PNode);
    expect(childReads[0]).toBe(childReads[1]);
    expect(names(container)).toContain('stable child');
    setValue(2);
    expect(observed).toEqual([0, 4]);
    expect(valueGetter).toHaveBeenCalledTimes(2);
    expect(childrenGetter).toHaveBeenCalledTimes(1);
    expect(constructed).toHaveBeenCalledTimes(1);
    expect(names(container)).toContain('stable child');
  });

  it.each([null, false, 'render failed'])(
    'normalizes a thrown %s for the fallback',
    (cause) => {
      const captured: Error[] = [];
      const outerError = vi.fn();
      function Broken() {
        throw cause;
      }
      dispose = render(() => {
        onError(outerError);
        return createComponent(ErrorBoundary, {
          fallback: (error: Error) => {
            captured.push(error);
            return createComponent(Leaf, { name: 'fallback' });
          },
          get children() {
            return createComponent(Broken, {});
          },
        });
      }, container);

      expect(names(container)).toContain('fallback');
      expect(captured).toHaveLength(1);
      expect(captured[0]).toBeInstanceOf(Error);
      expect(captured[0].cause).toBe(cause);
      expect(captured[0].message).toBe(
        typeof cause === 'string' ? cause : 'Unknown error',
      );
      expect(outerError).not.toHaveBeenCalled();
    },
  );

  it('ignores cleanup and queued errors from a disposed branch after reset', async () => {
    const [fail, setFail] = createState(false);
    const outerError = vi.fn();
    const captured: Error[] = [];
    let attempt = 0;
    let reset: (() => void) | undefined;
    const currentError = new Error('new branch failed');
    function Child() {
      if (++attempt > 1) throw currentError;
      const owner = getOwner();
      const staleFailure = () =>
        runWithOwner(owner, () => {
          throw new Error('stale failure');
        });
      onCleanup(staleFailure);
      queueMicrotask(staleFailure);
      createEffect(() => {
        if (fail()) throw new Error('first failure');
      });
      return createComponent(Leaf, { name: 'healthy' });
    }
    dispose = render(() => {
      onError(outerError);
      return createComponent(ErrorBoundary, {
        fallback: (error: Error, retry: () => void) => {
          captured.push(error);
          reset = retry;
          return createComponent(Leaf, { name: error.message });
        },
        get children() {
          return createComponent(Child, {});
        },
      });
    }, container);

    setFail(true);
    expect(names(container)).toContain('first failure');
    reset!();
    expect(names(container)).toContain('new branch failed');
    await Promise.resolve();
    expect(names(container)).toContain('new branch failed');
    expect(captured.map((error) => error.message)).toEqual([
      'first failure',
      'new branch failed',
    ]);
    expect(captured[1]).toBe(currentError);
    expect(outerError).not.toHaveBeenCalled();
  });
});
