import { PNode } from './PNode';
import { PView } from './PView';
import { Trackpad } from './trackpad/Trackpad';

/** Alignment option for a single scroll axis, modeled after DOM `Element.scrollIntoView`. */
export type ScrollAlignment = 'start' | 'center' | 'end' | 'nearest';

/**
 * Options for {@link PScrollView.scrollIntoView}, controlling how the target node
 * is aligned within the scroll viewport.
 *
 * - `block`  – vertical alignment (used when the scroll view is in vertical mode).
 * - `inline` – horizontal alignment (used when the scroll view is in horizontal mode).
 *
 * Defaults: `{ block: 'start', inline: 'nearest' }`.
 */
export interface ScrollIntoViewOptions {
  block?: ScrollAlignment;
  inline?: ScrollAlignment;
}

export class PScrollView extends PNode {
  _trackpad: Trackpad;
  horizontal = false;

  scrollContentHolder: PView;
  scrollContent: PView;

  constructor(horizontal = false) {
    super();

    this.scrollContentHolder = new PView();
    this.scrollContentHolder.setStyle({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    });

    this.scrollContent = new PView();
    this.scrollContent.setStyle({
      position: 'absolute',
      top: 0,
      left: 0,
    });

    this.appendChild(this.scrollContentHolder);
    this.scrollContentHolder.appendChild(this.scrollContent);

    this._trackpad = new Trackpad({});
    this.setHorizontal(horizontal);
    this.makeScrollable();

    this._trackpad.xAxis.value = 0;
    this._trackpad.yAxis.value = 0;
  }

  setHorizontal(horizontal: boolean) {
    this.horizontal = horizontal;

    this.scrollContent.setStyle({
      position: 'absolute',
      top: 0,
      left: 0,
      width: horizontal ? 'auto' : '100%',
      height: horizontal ? '100%' : 'auto',
    });

    if (horizontal) {
      this._trackpad.yAxis.min = 0;
      this._trackpad.yAxis.max = 0;
      this._trackpad.yAxis.value = 0;
    } else {
      this._trackpad.xAxis.min = 0;
      this._trackpad.xAxis.max = 0;
      this._trackpad.xAxis.value = 0;
    }

    this.markDirty();
  }

  private makeScrollable() {
    this.scrollContentHolder._view.interactive = true;
    this.scrollContentHolder._view.on('pointerdown', (e) => {
      this._trackpad!.pointerDown(e.global);
    });
    this.scrollContentHolder._view.on('pointerup', () => {
      this._trackpad!.pointerUp();
    });
    this.scrollContentHolder._view.on('pointerupoutside', () => {
      this._trackpad!.pointerUp();
    });
    this.scrollContentHolder._view.on('pointermove', (e) => {
      this._trackpad!.pointerMove(e.global);
    });
    this.scrollContentHolder._view.on('pointercancel', () => {
      this._trackpad!.pointerUp();
    });
    this.scrollContentHolder._view.on('wheel', (e) => {
      const axis = this.horizontal
        ? this._trackpad!.xAxis
        : this._trackpad!.yAxis;
      const delta = this.horizontal ? e.deltaX || e.deltaY || 0 : e.deltaY;
      const targetValue = axis.value - delta;

      axis.value = Math.max(axis.max, Math.min(axis.min, targetValue));

      if (this.horizontal) {
        this._trackpad!.yAxis.value = 0;
      } else {
        this._trackpad!.xAxis.value = 0;
      }
    });
  }

  applyLayout() {
    super.applyLayout();

    const width = this.scrollContentHolder._layoutNode.getComputedWidth();
    const height = this.scrollContentHolder._layoutNode.getComputedHeight();
    const contentWidth = this.scrollContent._layoutNode.getComputedWidth();
    const contentHeight = this.scrollContent._layoutNode.getComputedHeight();

    if (this._trackpad) {
      if (this.horizontal) {
        this._trackpad.xAxis.min = 0;
        this._trackpad.xAxis.max = Math.min(width - contentWidth, 0);
        this._trackpad.yAxis.min = 0;
        this._trackpad.yAxis.max = 0;
        if (this._trackpad.yAxis.value !== 0) {
          this._trackpad.yAxis.value = 0;
        }
      } else {
        this._trackpad.xAxis.min = 0;
        this._trackpad.xAxis.max = 0;
        this._trackpad.yAxis.min = 0;
        this._trackpad.yAxis.max = Math.min(height - contentHeight, 0);
        if (this._trackpad.xAxis.value !== 0) {
          this._trackpad.xAxis.value = 0;
        }
      }
    }
  }

  update() {
    if (!this._trackpad) {
      return;
    }

    this._trackpad.update();
    const nextX = this.horizontal ? this._trackpad.x : 0;
    const nextY = this.horizontal ? 0 : this._trackpad.y;

    if (this.scrollContent._view.x !== nextX) {
      this.scrollContent._view.x = nextX;
    }
    if (this.scrollContent._view.y !== nextY) {
      this.scrollContent._view.y = nextY;
    }
  }

  scrollTop() {
    if (this._trackpad) {
      if (this.horizontal) {
        this._trackpad.xAxis.value = 0;
      } else {
        this._trackpad.yAxis.value = 0;
      }
    }
  }

  /**
   * 将节点滚动到可见区域，节点需要是当前滚动容器的子节点，否则可能无法正确计算位置。
   *
   * @param node    - 目标节点（需在 scrollContent 子树内）
   * @param options - 对齐方式，参考 DOM `Element.scrollIntoView` 的 block/inline 语义。
   *                  垂直滚动视图使用 `block`，水平滚动视图使用 `inline`。
   *                  默认值：`{ block: 'start', inline: 'nearest' }`。
   */
  scrollIntoView(node: PNode, options: ScrollIntoViewOptions = {}) {
    if (!this._trackpad) return;

    const { block = 'start', inline = 'nearest' } = options;

    const offset = this.getNodeOffsetInContent(node);
    const nodeWidth = node._layoutNode.getComputedWidth();
    const nodeHeight = node._layoutNode.getComputedHeight();
    const viewportWidth =
      this.scrollContentHolder._layoutNode.getComputedWidth();
    const viewportHeight =
      this.scrollContentHolder._layoutNode.getComputedHeight();

    if (!this.horizontal) {
      // Vertical mode: apply block alignment to the Y axis
      this._trackpad.yAxis.value = this.computeScrollTarget(
        block,
        offset.y,
        nodeHeight,
        viewportHeight,
        this._trackpad.yAxis.value,
        this._trackpad.yAxis.max,
        this._trackpad.yAxis.min,
      );
    } else {
      // Horizontal mode: apply inline alignment to the X axis
      this._trackpad.xAxis.value = this.computeScrollTarget(
        inline,
        offset.x,
        nodeWidth,
        viewportWidth,
        this._trackpad.xAxis.value,
        this._trackpad.xAxis.max,
        this._trackpad.xAxis.min,
      );
    }
  }

  /**
   * Compute the target axis value that satisfies the requested alignment.
   *
   * Axis convention (matches existing trackpad usage):
   *   - min = 0   (no over-scroll past the beginning)
   *   - max ≤ 0   (e.g. -300 when content is 300 px taller than viewport)
   *   - value ≤ 0 (negative = scrolled towards the end of the content)
   *
   * @param alignment    - Desired scroll alignment
   * @param nodeOffset   - Node's offset from the start of the scroll content (px)
   * @param nodeSize     - Node's size along the axis (px)
   * @param viewportSize - Viewport size along the axis (px)
   * @param currentValue - Current axis value (≤ 0)
   * @param axisMax      - Axis maximum constraint (≤ 0)
   * @param axisMin      - Axis minimum constraint (≥ 0, typically 0)
   */
  private computeScrollTarget(
    alignment: ScrollAlignment,
    nodeOffset: number,
    nodeSize: number,
    viewportSize: number,
    currentValue: number,
    axisMax: number,
    axisMin: number,
  ): number {
    let target: number;

    switch (alignment) {
      case 'start':
        target = -nodeOffset;
        break;
      case 'center':
        target = -(nodeOffset + nodeSize / 2 - viewportSize / 2);
        break;
      case 'end':
        target = -(nodeOffset + nodeSize - viewportSize);
        break;
      case 'nearest': {
        // Visible content range in content coordinates: [scrollStart, scrollEnd]
        const scrollStart = -currentValue;
        const scrollEnd = scrollStart + viewportSize;
        const nodeEnd = nodeOffset + nodeSize;

        if (nodeOffset >= scrollStart && nodeEnd <= scrollEnd) {
          // Node is already fully visible – no adjustment needed
          return currentValue;
        }
        if (nodeOffset < scrollStart) {
          // Node is (partially) above/before the viewport – align start
          target = -nodeOffset;
        } else {
          // Node is (partially) below/after the viewport – align end
          target = -(nodeEnd - viewportSize);
        }
        break;
      }
    }

    // Clamp to valid axis range
    return Math.max(axisMax, Math.min(axisMin, target));
  }

  /**
   * Walk up the PNode parent chain from `node` to `scrollContent` and accumulate
   * the yoga-computed offsets, giving the node's position within the scroll content.
   */
  private getNodeOffsetInContent(node: PNode): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let current: PNode | null = node;

    while (current && current !== this.scrollContent) {
      x += current._layoutNode.getComputedLeft();
      y += current._layoutNode.getComputedTop();
      current = current._parent;
    }

    return { x, y };
  }

  get scrollY(): number {
    return this._trackpad?.yAxis.value ?? 0;
  }

  set scrollY(value: number) {
    if (this._trackpad) {
      this._trackpad.yAxis.value = value;
    }
  }

  get scrollX(): number {
    return this._trackpad?.xAxis.value ?? 0;
  }

  set scrollX(value: number) {
    if (this._trackpad) {
      this._trackpad.xAxis.value = value;
    }
  }
}
