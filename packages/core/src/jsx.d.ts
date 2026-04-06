// PIXI.js 事件处理器类型
type PixiEventHandler = (event: any) => void;

// 事件属性接口 - 基于 eventMap 定义
interface PixiEventHandlers {
  // 鼠标事件
  onClick?: PixiEventHandler;
  onMouseDown?: PixiEventHandler;
  onMouseUp?: PixiEventHandler;
  onMouseMove?: PixiEventHandler;
  onMouseEnter?: PixiEventHandler;
  onMouseLeave?: PixiEventHandler;
  onMouseOver?: PixiEventHandler;
  onMouseOut?: PixiEventHandler;
  onRightClick?: PixiEventHandler;
  onRightDown?: PixiEventHandler;
  onRightUp?: PixiEventHandler;
  onRightUpOutside?: PixiEventHandler;
  onWheel?: PixiEventHandler;

  // 触摸事件
  onTouchStart?: PixiEventHandler;
  onTouchEnd?: PixiEventHandler;
  onTouchMove?: PixiEventHandler;
  onTouchCancel?: PixiEventHandler;
  onTouchEndOutside?: PixiEventHandler;
  onTap?: PixiEventHandler;

  // 指针事件
  onPointerDown?: PixiEventHandler;
  onPointerUp?: PixiEventHandler;
  onPointerMove?: PixiEventHandler;
  onPointerEnter?: PixiEventHandler;
  onPointerLeave?: PixiEventHandler;
  onPointerOver?: PixiEventHandler;
  onPointerOut?: PixiEventHandler;
  onPointerCancel?: PixiEventHandler;
  onPointerUpOutside?: PixiEventHandler;
  onPointerTap?: PixiEventHandler;

  // 全局事件
  onGlobalMouseMove?: PixiEventHandler;
  onGlobalTouchMove?: PixiEventHandler;
  onGlobalPointerMove?: PixiEventHandler;
}

declare global {
  namespace JSX {
    type Element = any;
    interface ArrayElement extends Array<Element> {}
    interface FunctionElement {
      (): Element;
    }
    interface ElementClass {
      // empty, libs can define requirements downstream
    }
    interface ElementAttributesProperty {
      // empty, libs can define requirements downstream
    }
    interface ElementChildrenAttribute {
      children: unknown;
    }

    // 为所有 JSX 元素添加事件属性
    interface IntrinsicElements {
      [elemName: string]: PixiEventHandlers & {
        [key: string]: any;
      };
    }
  }
}

export { JSX };
