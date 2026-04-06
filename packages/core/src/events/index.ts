import { cleanup, effect, memo } from '../reactivity/effects';

/**
 * React 风格事件属性到 PIXI.js 事件名称的映射
 */
export const eventMap: Record<string, string> = {
  // 鼠标事件
  onClick: 'click',
  onMouseDown: 'mousedown',
  onMouseUp: 'mouseup',
  onMouseMove: 'mousemove',
  onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave',
  onMouseOver: 'mouseover',
  onMouseOut: 'mouseout',
  onRightClick: 'rightclick',
  onRightDown: 'rightdown',
  onRightUp: 'rightup',
  onRightUpOutside: 'rightupoutside',
  onWheel: 'wheel',

  // 触摸事件
  onTouchStart: 'touchstart',
  onTouchEnd: 'touchend',
  onTouchMove: 'touchmove',
  onTouchCancel: 'touchcancel',
  onTouchEndOutside: 'touchendoutside',
  onTap: 'tap',

  // 指针事件
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

  // 全局事件
  onGlobalMouseMove: 'globalmousemove',
  onGlobalTouchMove: 'globaltouchmove',
  onGlobalPointerMove: 'globalpointermove',
};

export const EVENT_PROPS = Object.keys(eventMap);
/**
 * 获取 PIXI.js 事件名称
 * @param reactEventName React 风格的事件属性名
 * @returns PIXI.js 事件名称
 */
export function getPixiEventName(reactEventName: string): string | undefined {
  return eventMap[reactEventName];
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
  props: Record<string, any>,
): Record<string, Function> {
  const eventHandlers: Record<string, Function> = {};
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
  element: any,
  eventProps: Record<string, any>,
) {
  effect(() => {
    const keys = Object.keys(eventProps);

    const eventHandlers: Record<string, () => void> = {};
    let hasPixiEvent = false;
    keys.forEach((key) => {
      const newFn = eventProps[key];
      const pixiEventName = getPixiEventName(key);
      if (!pixiEventName) {
        console.warn('bindEventEffects', key, 'is not a valid event property');
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
        element.off(pixiEventName, eventHandlers[pixiEventName]);
      });
    });
  });
}
