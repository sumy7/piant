import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { PRoot } from '../src/elements/PRoot';
import { PScrollView } from '../src/elements/PScrollView';

function createScrollRoot() {
  return new PRoot(new Container(), {
    width: 100,
    height: 100,
  });
}

describe('PScrollView', () => {
  it('scrolls vertically by default and clamps wheel updates to the y axis', () => {
    const root = createScrollRoot();
    const scrollView = new PScrollView();

    root.appendChild(scrollView);
    scrollView.setStyle({ width: 100, height: 100 });
    scrollView.scrollContent.setStyle({ height: 280 });

    root.doLayout();

    expect(scrollView.horizontal).toBe(false);
    expect(scrollView._trackpad.yAxis.max).toBe(-180);
    expect(scrollView._trackpad.xAxis.max).toBe(0);
    scrollView.scrollContentHolder._view.emit('wheel', { deltaY: 40 });
    scrollView.update();

    expect(scrollView.scrollY).toBe(-40);
    expect(scrollView.scrollX).toBe(0);
    expect(scrollView.scrollContent._view.y).toBe(-40);
    expect(scrollView.scrollContent._view.x).toBe(0);
  });

  it('supports horizontal mode and only updates the x axis', () => {
    const root = createScrollRoot();
    const scrollView = new PScrollView(true);

    root.appendChild(scrollView);
    scrollView.setStyle({ width: 100, height: 100 });
    scrollView.scrollContent.setStyle({ width: 260 });

    root.doLayout();

    expect(scrollView.horizontal).toBe(true);
    expect(scrollView._trackpad.xAxis.max).toBe(-160);
    expect(scrollView._trackpad.yAxis.max).toBe(0);
    scrollView.scrollContentHolder._view.emit('wheel', {
      deltaX: 30,
      deltaY: 0,
    });
    scrollView.update();

    expect(scrollView.scrollX).toBe(-30);
    expect(scrollView.scrollY).toBe(0);
    expect(scrollView.scrollContent._view.x).toBe(-30);
    expect(scrollView.scrollContent._view.y).toBe(0);
  });
});
