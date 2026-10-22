import type { AllFederatedEventMap, Container, EventMode } from 'pixi.js';
import type { PNode } from '../elements/PNode';
import { cleanup, effect } from '../reactivity/effects';

/**
 * React 风格事件属性到 PIXI.js 事件名称的映射
 */
export const eventMap = {
  onClick: 'pointertap',
  onPointerDown: 'pointerdown',
  onPointerUp: 'pointerup',
  onPointerMove: 'pointermove',
  onPointerEnter: 'pointerenter',
  onPointerLeave: 'pointerleave',
  onPointerOver: 'pointerover',
  onPointerOut: 'pointerout',
  onPointerCancel: 'pointercancel',
  onPointerUpOutside: 'pointerupoutside',
  onPointerTap: 'pointertap',
  onRightClick: 'rightclick',
  onRightDown: 'rightdown',
  onRightUp: 'rightup',
  onRightUpOutside: 'rightupoutside',
  onWheel: 'wheel',
  onGlobalMouseMove: 'globalmousemove',
  onGlobalTouchMove: 'globaltouchmove',
  onGlobalPointerMove: 'globalpointermove',
} as const satisfies Record<string, keyof AllFederatedEventMap>;

export type PixiEventProp = keyof typeof eventMap;

export type PixiEventHandler<
  TNode extends PNode = PNode,
  TEvent extends keyof AllFederatedEventMap = keyof AllFederatedEventMap,
> = (event: AllFederatedEventMap[TEvent], node: TNode) => void;

export type PixiEventProps<TNode extends PNode = PNode> = {
  [Prop in PixiEventProp]?: PixiEventHandler<TNode, (typeof eventMap)[Prop]>;
};

export const EVENT_PROPS = Object.keys(eventMap) as PixiEventProp[];

function createBinding<TNode extends PNode, Prop extends PixiEventProp>(
  node: TNode,
  eventProps: PixiEventProps<TNode>,
  prop: Prop,
) {
  const element = node._view;
  const eventName: (typeof eventMap)[PixiEventProp] = eventMap[prop];
  let handler: PixiEventProps<TNode>[Prop];
  let listening = false;
  // Keep each prop's listener identity, including aliases of the same Pixi event.
  function listener(
    this: Container,
    event: AllFederatedEventMap[(typeof eventMap)[PixiEventProp]],
  ) {
    // The wrapper is registered only for eventMap[prop]; retain that correlation
    // across EventEmitter's union of event argument tuples.
    handler?.call(
      this,
      event as AllFederatedEventMap[(typeof eventMap)[Prop]],
      node,
    );
  }

  return {
    update() {
      const next = eventProps[prop];
      handler = typeof next === 'function' ? next : undefined;
      const enabled = handler !== undefined;
      if (enabled !== listening) {
        if (enabled) element.on(eventName, listener);
        else element.off(eventName, listener);
        listening = enabled;
      }
      return enabled;
    },
    dispose() {
      if (listening) element.off(eventName, listener);
      listening = false;
      handler = undefined;
    },
  };
}

export function bindEventEffects<TNode extends PNode>(
  node: TNode,
  eventProps: PixiEventProps<TNode>,
) {
  const element = node._view;
  const bindings = EVENT_PROPS.filter((prop) =>
    Object.hasOwn(eventProps, prop),
  ).map((prop) => createBinding(node, eventProps, prop));
  let hasHandlers = false;
  let previousMode: EventMode | undefined;

  function restoreEventMode() {
    // Restore only the value we still own; preserve later external mode changes.
    if (previousMode !== undefined && element.eventMode === 'static') {
      element.eventMode = previousMode;
    }
    previousMode = undefined;
  }

  effect(() => {
    let enabled = false;
    for (const binding of bindings) {
      enabled = binding.update() || enabled;
    }
    if (enabled === hasHandlers) return;
    hasHandlers = enabled;
    if (!enabled) {
      restoreEventMode();
    } else if (
      element.eventMode === undefined ||
      element.eventMode === 'passive' ||
      element.eventMode === 'auto'
    ) {
      // Pixi initializes its passive default only when the renderer starts.
      previousMode = element.eventMode ?? 'passive';
      element.eventMode = 'static';
    }
  });

  // This cleanup belongs to the component lifetime, not each effect rerun.
  cleanup(() => {
    for (const binding of bindings) binding.dispose();
    restoreEventMode();
  });
}

/** Register an explicit DOM event map for the current component lifetime. */
export function bindDOMEvents(
  element: HTMLElement,
  listeners: {
    [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void;
  },
) {
  for (const [name, listener] of Object.entries(listeners)) {
    // Each callback is paired with its typed event name in the supplied map.
    const handler = listener as EventListener;
    element.addEventListener(name, handler);
    cleanup(() => element.removeEventListener(name, handler));
  }
}
