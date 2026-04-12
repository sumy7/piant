import { describe, expect, it } from 'vitest';
import {
  eventMap,
  extractEventHandlers,
  getPixiEventName,
} from '../src/events';

describe('events mapping', () => {
  it('keeps the expected react-style to pixi mapping', () => {
    expect(eventMap.onClick).toBe('pointertap');
    expect(eventMap.onPointerTap).toBe('pointertap');
    expect(eventMap.onRightClick).toBe('rightclick');
    expect(eventMap.onGlobalMouseMove).toBe('globalmousemove');
    expect(eventMap.onGlobalTouchMove).toBe('globaltouchmove');
    expect(eventMap.onGlobalPointerMove).toBe('globalpointermove');
  });

  it('resolves pixi event names by prop name', () => {
    expect(getPixiEventName('onClick')).toBe('pointertap');
    expect(getPixiEventName('onPointerDown')).toBe('pointerdown');
    expect(getPixiEventName('onWheel')).toBe('wheel');
    expect(getPixiEventName('unknown-event')).toBeUndefined();
  });

  it('extracts only valid function handlers', () => {
    const onClick = () => undefined;
    const onPointerMove = () => undefined;

    const handlers = extractEventHandlers({
      onClick,
      onPointerMove,
      onPointerDown: undefined,
      onPointerCancel: null as any,
    });

    expect(handlers).toEqual({
      pointertap: onClick,
      pointermove: onPointerMove,
    });
  });
});
