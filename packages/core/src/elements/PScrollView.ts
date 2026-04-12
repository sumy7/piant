import { PNode } from './PNode';
import { PView } from './PView';
import { Trackpad } from './trackpad/Trackpad';

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
   * 将节点滚动到可见区域，节点需要是当前滚动容器的子节点，否则可能无法正确计算位置
   */
  scrollIntoView(node: PNode) {
    const nodeBounds = node._view.getBounds();
    const scrollContentBounds = this.scrollContent._view.getBounds();
    const scrollContainerBounds = this._view.getBounds();
    // 节点距离容器的上边距
    const offsetTop = nodeBounds.top - scrollContentBounds.top;
    if (offsetTop + nodeBounds.height < scrollContainerBounds.height) {
      // 节点整个在可视区域内
      this.scrollY = 0;
    } else {
      // 节点超出可视区域
      this.scrollY =
        scrollContainerBounds.height - offsetTop - nodeBounds.height;
    }
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
