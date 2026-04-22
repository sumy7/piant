import { cleanup, effect } from '../reactivity/effects';

type EventCallback = (...args: object[]) => void;

type EventTargetLike = {
  on: (eventName: string, handler: EventCallback) => void;
  off: (eventName: string, handler: EventCallback) => void;
  interactive?: boolean;
};

export type PixiEventHandler = (event: object) => void;

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
} as const;

export type PixiEventProp = keyof typeof eventMap;

export type PixiEventProps = Partial<Record<PixiEventProp, PixiEventHandler>>;

export const EVENT_PROPS = Object.keys(eventMap) as PixiEventProp[];
/**
 * 获取 PIXI.js 事件名称
 * @param reactEventName React 风格的事件属性名
 * @returns PIXI.js 事件名称
 */
export function getPixiEventName(reactEventName: string): string | undefined {
  return eventMap[reactEventName as PixiEventProp];
}

/**
 * 检查是否为事件属性
 * @param propName 属性名
 * @returns 是否为事件属性
 */
export function isEventProp(propName: string): boolean {
  return propName in eventMap;
}

/**
 * 从 props 中提取事件处理器
 * @param props 组件属性
 * @returns 事件处理器映射
 */
export function extractEventHandlers(
  props: PixiEventProps,
): Partial<Record<string, PixiEventHandler>> {
  const eventHandlers: Partial<Record<string, PixiEventHandler>> = {};
  for (const [propName, handler] of Object.entries(props)) {
    if (isEventProp(propName) && typeof handler === 'function') {
      const pixiEventName = getPixiEventName(propName);
      if (pixiEventName) {
        eventHandlers[pixiEventName] = handler;
      }
    }
  }

  return eventHandlers;
}

export function bindEventEffects(
  element: EventTargetLike,
  eventProps: PixiEventProps,
) {
  effect(() => {
    const keys = Object.keys(eventProps);

    const eventHandlers: Partial<Record<string, EventCallback>> = {};
    let hasPixiEvent = false;
    keys.forEach((key) => {
      const newFn = eventProps[key as PixiEventProp];
      const pixiEventName = getPixiEventName(key);
      if (!pixiEventName) {
        console.warn(`[piant] "${key}" is not a valid event property.`);
        return;
      }

      if (newFn) {
        hasPixiEvent = true;

        element.on(pixiEventName, newFn);
        eventHandlers[pixiEventName] = newFn;
      }
    });
    element.interactive = hasPixiEvent;

    cleanup(() => {
      Object.keys(eventHandlers).forEach((pixiEventName) => {
        const handler = eventHandlers[pixiEventName];
        if (handler) {
          element.off(pixiEventName, handler);
        }
      });
    });
  });
}
