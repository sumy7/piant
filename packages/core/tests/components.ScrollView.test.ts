import { Container } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import { PRoot } from '../src/elements/PRoot';
import { PScrollView } from '../src/elements/PScrollView';
import { PView } from '../src/elements/PView';

function createScrollRoot() {
  return new PRoot(new Container(), {
    width: 100,
    height: 100,
  });
}

/**
 * Build a vertical scroll view (100×100 viewport, 400px tall content) with a
 * child node positioned at the given `top` offset and `height`.
 * Returns { root, scrollView, node } after layout has been computed.
 */
function buildVerticalScrollView(
  nodeTop: number,
  nodeHeight: number,
): { root: PRoot; scrollView: PScrollView; node: PView } {
  const root = createScrollRoot();
  const scrollView = new PScrollView();
  root.appendChild(scrollView);
  scrollView.setStyle({ width: 100, height: 100 });
  scrollView.scrollContent.setStyle({ height: 400 });

  const node = new PView();
  node.setStyle({
    position: 'absolute',
    top: nodeTop,
    left: 0,
    width: '100%',
    height: nodeHeight,
  });
  scrollView.scrollContent.appendChild(node);
  root.doLayout();

  return { root, scrollView, node };
}

/**
 * Build a horizontal scroll view (100×100 viewport, 400px wide content) with a
 * child node positioned at the given `left` offset and `width`.
 * Returns { root, scrollView, node } after layout has been computed.
 */
function buildHorizontalScrollView(
  nodeLeft: number,
  nodeWidth: number,
): { root: PRoot; scrollView: PScrollView; node: PView } {
  const root = createScrollRoot();
  const scrollView = new PScrollView(true);
  root.appendChild(scrollView);
  scrollView.setStyle({ width: 100, height: 100 });
  scrollView.scrollContent.setStyle({ width: 400 });

  const node = new PView();
  node.setStyle({
    position: 'absolute',
    top: 0,
    left: nodeLeft,
    height: '100%',
    width: nodeWidth,
  });
  scrollView.scrollContent.appendChild(node);
  root.doLayout();

  return { root, scrollView, node };
}

describe('PScrollView', () => {
  // Track the root created in each test so it can be destroyed after the test,
  // removing its Ticker.shared callback and preventing cross-test leaks.
  let testRoot: PRoot | undefined;
  afterEach(() => {
    testRoot?.destroy();
    testRoot = undefined;
  });

  it('scrolls vertically by default and clamps wheel updates to the y axis', () => {
    const root = createScrollRoot();
    testRoot = root;
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
    testRoot = root;
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

  describe('scrollIntoView – vertical (block)', () => {
    // Node at y=200, height=50, viewport=100, content=400 → axis.max=-300

    it('block:start aligns node top to viewport top', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      scrollView.scrollIntoView(node, { block: 'start' });
      expect(scrollView.scrollY).toBe(-200);
      // X axis must not be affected
      expect(scrollView.scrollX).toBe(0);
    });

    it('block:end aligns node bottom to viewport bottom', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      // target = -(200 + 50 - 100) = -150
      scrollView.scrollIntoView(node, { block: 'end' });
      expect(scrollView.scrollY).toBe(-150);
      expect(scrollView.scrollX).toBe(0);
    });

    it('block:center aligns node center to viewport center', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      // target = -(200 + 25 - 50) = -175
      scrollView.scrollIntoView(node, { block: 'center' });
      expect(scrollView.scrollY).toBe(-175);
      expect(scrollView.scrollX).toBe(0);
    });

    it('block:nearest scrolls to end when node is below viewport', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      // scrollY=0 → visible [0,100], node [200,250] → below → align end → -150
      scrollView.scrollIntoView(node, { block: 'nearest' });
      expect(scrollView.scrollY).toBe(-150);
    });

    it('block:nearest scrolls to start when node is above viewport', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      // Scroll past the node first (node [200,250] now above visible range)
      scrollView.scrollY = -300;
      scrollView.scrollIntoView(node, { block: 'nearest' });
      expect(scrollView.scrollY).toBe(-200);
    });

    it('block:nearest makes no change when node is already visible', () => {
      const { root, scrollView, node } = buildVerticalScrollView(20, 50);
      testRoot = root;
      // scrollY=0 → visible [0,100], node [20,70] → fully visible
      scrollView.scrollIntoView(node, { block: 'nearest' });
      expect(scrollView.scrollY).toBe(0);
    });

    it('default options use block:start', () => {
      const { root, scrollView, node } = buildVerticalScrollView(200, 50);
      testRoot = root;
      scrollView.scrollIntoView(node);
      expect(scrollView.scrollY).toBe(-200);
    });

    it('clamps to axis max when block:start target exceeds max', () => {
      // Node at y=350, height=50, axis.max=-300
      const { root, scrollView, node } = buildVerticalScrollView(350, 50);
      testRoot = root;
      scrollView.scrollIntoView(node, { block: 'start' });
      expect(scrollView.scrollY).toBe(-300);
    });

    it('clamps to axis min (0) when block:end target is positive', () => {
      // Node at y=0, height=50; target = -(0+50-100) = 50 → clamped to 0
      const { root, scrollView, node } = buildVerticalScrollView(0, 50);
      testRoot = root;
      scrollView.scrollIntoView(node, { block: 'end' });
      expect(scrollView.scrollY).toBe(0);
    });

    it('does nothing when node is not a descendant of scrollContent', () => {
      const { root, scrollView } = buildVerticalScrollView(200, 50);
      testRoot = root;
      const outsideNode = new PView();
      scrollView.scrollY = -100;
      scrollView.scrollIntoView(outsideNode, { block: 'start' });
      // scroll position must be unchanged
      expect(scrollView.scrollY).toBe(-100);
    });
  });

  describe('scrollIntoView – horizontal (inline)', () => {
    // Node at x=200, width=50, viewport=100, content=400 → axis.max=-300

    it('inline:start aligns node left to viewport left', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(200, 50);
      testRoot = root;
      scrollView.scrollIntoView(node, { inline: 'start' });
      expect(scrollView.scrollX).toBe(-200);
      // Y axis must not be affected
      expect(scrollView.scrollY).toBe(0);
    });

    it('inline:end aligns node right to viewport right', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(200, 50);
      testRoot = root;
      // target = -(200 + 50 - 100) = -150
      scrollView.scrollIntoView(node, { inline: 'end' });
      expect(scrollView.scrollX).toBe(-150);
      expect(scrollView.scrollY).toBe(0);
    });

    it('inline:center aligns node center to viewport center', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(200, 50);
      testRoot = root;
      // target = -(200 + 25 - 50) = -175
      scrollView.scrollIntoView(node, { inline: 'center' });
      expect(scrollView.scrollX).toBe(-175);
    });

    it('inline:nearest scrolls to end when node is beyond viewport', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(200, 50);
      testRoot = root;
      // scrollX=0 → visible [0,100], node [200,250] → beyond → align end → -150
      scrollView.scrollIntoView(node, { inline: 'nearest' });
      expect(scrollView.scrollX).toBe(-150);
    });

    it('inline:nearest makes no change when node is already visible', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(20, 50);
      testRoot = root;
      // scrollX=0 → visible [0,100], node [20,70] → fully visible
      scrollView.scrollIntoView(node, { inline: 'nearest' });
      expect(scrollView.scrollX).toBe(0);
    });

    it('default options use inline:nearest – scrolls when node is not visible', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(200, 50);
      testRoot = root;
      // scrollX=0 → visible [0,100], node [200,250] → beyond → align end → -150
      scrollView.scrollIntoView(node);
      expect(scrollView.scrollX).toBe(-150);
    });

    it('default options use inline:nearest – no change when already visible', () => {
      const { root, scrollView, node } = buildHorizontalScrollView(20, 50);
      testRoot = root;
      // node [20,70] already visible → no change
      scrollView.scrollIntoView(node);
      expect(scrollView.scrollX).toBe(0);
    });
  });
});
