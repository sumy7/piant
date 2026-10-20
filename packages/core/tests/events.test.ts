import 'pixi.js/events';
import {
  Container,
  EventBoundary,
  FederatedPointerEvent,
  Graphics,
} from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { CustomView } from '../src/components/CustomView';
import { Image } from '../src/components/Image';
import { ScrollView } from '../src/components/ScrollView';
import { View, type ViewProps } from '../src/components/View';
import type { PNode } from '../src/elements/PNode';
import type { PView } from '../src/elements/PView';
import { eventMap } from '../src/events';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

describe('events mapping', () => {
  it('preserves the public event aliases and global event names', () => {
    expect(eventMap.onClick).toBe('pointertap');
    expect(eventMap.onPointerTap).toBe('pointertap');
    expect(eventMap.onRightClick).toBe('rightclick');
    expect(eventMap.onGlobalMouseMove).toBe('globalmousemove');
    expect(eventMap.onGlobalTouchMove).toBe('globaltouchmove');
    expect(eventMap.onGlobalPointerMove).toBe('globalpointermove');
  });
});

function mountView(props: ViewProps) {
  let node!: PView;
  const dispose = root((dispose) => {
    const configured = Object.defineProperties(
      {} as ViewProps,
      Object.getOwnPropertyDescriptors(props),
    );
    configured.ref = (node) => {
      // Match the application's initialized default without creating a renderer.
      node._view.eventMode = 'passive';
      props.ref?.(node);
    };
    node = View(configured) as PView;
    return dispose;
  });
  return { node, dispose };
}

function pointerEvent() {
  return new FederatedPointerEvent(new EventBoundary());
}

describe('event bindings', () => {
  it('keeps aliases independent across updates and disposes both', () => {
    const [version, setVersion] = createState(0);
    const first = vi.fn();
    const second = vi.fn();
    const tap = vi.fn();
    const { node, dispose } = mountView({
      get onClick() {
        return version() === 0 ? first : second;
      },
      onPointerTap: tap,
    });
    const event = pointerEvent();
    node._view.emit('pointertap', event);
    expect(first).toHaveBeenCalledTimes(1);
    expect(tap).toHaveBeenCalledTimes(1);
    setVersion(1);
    setVersion(2);
    expect(node._view.listenerCount('pointertap')).toBe(2);
    node._view.emit('pointertap', event);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(tap).toHaveBeenCalledTimes(2);
    dispose();
    expect(node._view.listenerCount('pointertap')).toBe(0);
    node._view.emit('pointertap', event);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('updates callbacks without re-registering unchanged or changed listeners', () => {
    const [version, setVersion] = createState(0);
    const first = vi.fn();
    const second = vi.fn();
    const wheel = vi.fn();
    const { node, dispose } = mountView({
      get onClick() {
        return version() === 0 ? first : second;
      },
      onWheel: wheel,
    });
    const on = vi.spyOn(node._view, 'on');
    const off = vi.spyOn(node._view, 'off');
    const originalListener = node._view.listeners('pointertap')[0];
    setVersion(1);
    expect(node._view.listeners('pointertap')[0]).toBe(originalListener);
    expect(on).not.toHaveBeenCalled();
    expect(off).not.toHaveBeenCalled();
    node._view.emit('pointertap', pointerEvent());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('enables, disables and re-enables a stable listener from an initially empty prop', () => {
    const [enabled, setEnabled] = createState(false);
    const handler = vi.fn();
    const { node, dispose } = mountView({
      get onClick() {
        return enabled() ? handler : undefined;
      },
    });
    expect(node._view.listenerCount('pointertap')).toBe(0);
    expect(node._view.eventMode).toBe('passive');
    setEnabled(true);
    const listener = node._view.listeners('pointertap')[0];
    expect(node._view.eventMode).toBe('static');
    setEnabled(false);
    expect(node._view.listenerCount('pointertap')).toBe(0);
    expect(node._view.eventMode).toBe('passive');
    setEnabled(true);
    expect(node._view.listeners('pointertap')[0]).toBe(listener);
    node._view.emit('pointertap', pointerEvent());
    expect(handler).toHaveBeenCalledTimes(1);
    dispose();
    expect(node._view.eventMode).toBe('passive');
  });

  it('passes the native event and Piant node while preserving emitter this', () => {
    const handler = vi.fn(function (this: Container, ..._args: unknown[]) {
      return this;
    });
    const { node, dispose } = mountView({ onClick: handler });
    const event = pointerEvent();
    const child = new Container();
    event.target = child;
    event.currentTarget = node._view;
    node._view.emit('pointertap', event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]).toHaveLength(2);
    expect(handler.mock.calls[0][0]).toBe(event);
    expect(handler.mock.calls[0][1]).toBe(node);
    expect(handler.mock.results[0].value).toBe(node._view);
    expect(event.target).toBe(child);
    expect(event.currentTarget).toBe(node._view);
    dispose();
  });

  it('does not remove external listeners even when they use the same callback', () => {
    const handler = vi.fn();
    const { node, dispose } = mountView({
      ref(node) {
        node._view.on('pointertap', handler);
      },
      onClick: handler,
      onPointerTap: handler,
    });
    expect(node._view.listenerCount('pointertap')).toBe(3);
    dispose();
    expect(node._view.listenerCount('pointertap')).toBe(1);
    node._view.emit('pointertap', pointerEvent());
    expect(handler).toHaveBeenCalledTimes(1);
    node._view.off('pointertap', handler);
  });

  it.each(['static', 'dynamic', 'none'] as const)(
    'preserves an explicit %s eventMode',
    (mode) => {
      const [enabled, setEnabled] = createState(true);
      const handler = vi.fn();
      const { node, dispose } = mountView({
        ref(node) {
          node._view.eventMode = mode;
        },
        get onClick() {
          return enabled() ? handler : undefined;
        },
      });
      expect(node._view.eventMode).toBe(mode);
      setEnabled(false);
      expect(node._view.eventMode).toBe(mode);
      setEnabled(true);
      expect(node._view.eventMode).toBe(mode);
      dispose();
      expect(node._view.eventMode).toBe(mode);
    },
  );

  it.each(['passive', 'auto'] as const)(
    'temporarily promotes %s and restores it on disposal',
    (mode) => {
      const { node, dispose } = mountView({
        ref(node) {
          node._view.eventMode = mode;
        },
        onClick: vi.fn(),
      });
      expect(node._view.eventMode).toBe('static');
      dispose();
      expect(node._view.eventMode).toBe(mode);
    },
  );

  it.each(['none', 'passive', 'auto', 'static', 'dynamic'] as const)(
    'does not change %s when no handlers exist',
    (mode) => {
      const { node, dispose } = mountView({
        ref(node) {
          node._view.eventMode = mode;
        },
        onClick: undefined,
      });
      expect(node._view.eventMode).toBe(mode);
      dispose();
      expect(node._view.eventMode).toBe(mode);
    },
  );

  it('keeps automatic interaction enabled until the last handler is removed', () => {
    const [enabled, setEnabled] = createState(true);
    const click = vi.fn();
    const { node, dispose } = mountView({
      onClick: click,
      get onPointerTap() {
        return enabled() ? click : undefined;
      },
    });
    setEnabled(false);
    expect(node._view.eventMode).toBe('static');
    expect(node._view.listenerCount('pointertap')).toBe(1);
    dispose();
    expect(node._view.eventMode).toBe('passive');
  });

  it.each(['dynamic', 'none', 'auto', 'passive'] as const)(
    'preserves a later external change to %s',
    (mode) => {
      const [version, setVersion] = createState(0);
      const handlers = [vi.fn(), vi.fn()];
      const { node, dispose } = mountView({
        get onClick() {
          return handlers[version()];
        },
      });
      node._view.eventMode = mode;
      setVersion(1);
      expect(node._view.eventMode).toBe(mode);
      setVersion(2);
      expect(node._view.eventMode).toBe(mode);
      dispose();
      expect(node._view.eventMode).toBe(mode);
    },
  );
});

describe('event initialization and aliases', () => {
  it('enables nodes created before Pixi initializes its default eventMode', () => {
    expect(new Container().eventMode).toBeUndefined();
    root((dispose) => {
      const node = View({ onClick: vi.fn() }) as PView;
      expect(node._view.eventMode).toBe('static');
      dispose();
      expect(node._view.eventMode).toBe('passive');
    });
  });

  it('disables aliases independently when both share the same callback', () => {
    const [enabled, setEnabled] = createState(true);
    const handler = vi.fn();
    const { node, dispose } = mountView({
      onClick: handler,
      get onPointerTap() {
        return enabled() ? handler : undefined;
      },
    });
    node._view.emit('pointertap', pointerEvent());
    expect(handler).toHaveBeenCalledTimes(2);
    setEnabled(false);
    node._view.emit('pointertap', pointerEvent());
    expect(handler).toHaveBeenCalledTimes(3);
    expect(node._view.listenerCount('pointertap')).toBe(1);
    setEnabled(true);
    node._view.emit('pointertap', pointerEvent());
    expect(handler).toHaveBeenCalledTimes(5);
    dispose();
    expect(node._view.listenerCount('pointertap')).toBe(0);
  });
});

describe('component event integration', () => {
  const components: [string, (handler: () => void) => PNode][] = [
    ['View', (onClick) => View({ onClick }) as PView],
    ['Image', (onClick) => Image({ src: new Graphics(), onClick })],
    ['ScrollView', (onClick) => ScrollView({ onClick })],
    ['CustomView', (onClick) => CustomView({ onClick })],
  ];

  it.each(components)(
    'passes the bound %s node and cleans up its listener',
    (_name, create) => {
      const handler = vi.fn<(...args: unknown[]) => void>();
      root((dispose) => {
        const node = create(handler);
        const event = pointerEvent();
        node._view.emit('pointertap', event);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler.mock.calls[0][0]).toBe(event);
        expect(handler.mock.calls[0][1]).toBe(node);
        dispose();
        expect(node._view.listenerCount('pointertap')).toBe(0);
      });
    },
  );

  it('ignores invalid handlers supplied by untyped callers', () => {
    const { node, dispose } = mountView({
      onClick: 'invalid',
    } as unknown as ViewProps);
    expect(node._view.listenerCount('pointertap')).toBe(0);
    expect(node._view.eventMode).toBe('passive');
    dispose();
  });
});
