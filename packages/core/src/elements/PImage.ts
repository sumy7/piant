import { Container, Graphics, Sprite } from 'pixi.js';
import type { ImageStyles } from './layout/viewStyles';
import { PNode } from './PNode';

export class PImage extends PNode {
  _image: Sprite | Graphics | null = null;
  _layoutStyle: ImageStyles = {};
  _imageContent = new Container({
    label: 'image-content',
  });
  private _imageMask = new Graphics({ label: 'image-mask' });

  constructor() {
    super();

    // add image content before _viewContent
    const viewContentIndex = this._view.getChildIndex(this._viewContent);
    this._view.addChildAt(this._imageContent, viewContentIndex);
    this._view.addChildAt(this._imageMask, viewContentIndex + 1);
  }

  // Remove all children except the image
  private applyImage() {
    if (!this._image) {
      this._imageContent.removeChildren();
      return;
    }
    if (this._imageContent.children.indexOf(this._image) < 0) {
      this._imageContent.addChild(this._image);
    }
    const toRemove = this._imageContent.children.filter(
      (child) => child !== this._image,
    );
    this._imageContent.removeChild(...toRemove);
  }

  private applyObjectFit() {
    const objectFit = this._layoutStyle.objectFit ?? 'contain';
    const containerWidth = this._layoutNode.getComputedWidth();
    const containerHeight = this._layoutNode.getComputedHeight();

    // Clip only the image. PNode's overflow mask still controls the whole view.
    this._imageMask.clear();
    if (objectFit === 'cover') {
      this.drawRoundedRect(
        this._imageMask,
        0,
        0,
        containerWidth,
        containerHeight,
      );
      this._imageMask.fill({ color: 'white' });
      this._imageContent.mask = this._imageMask;
    } else {
      this._imageContent.mask = null;
    }

    if (!this._image) {
      return;
    }

    // Renderable bounds exclude the display object's scale and masks. Read them
    // on every layout so Graphics edits and texture changes cannot leave stale
    // dimensions, even after a previous fit collapsed or stretched the image.
    // Read Sprite.orig directly: a non-dynamic texture resize can leave the
    // Sprite's cached bounds stale even when its texture has new dimensions.
    const bounds =
      this._image instanceof Sprite
        ? {
            width: this._image.texture.orig.width,
            height: this._image.texture.orig.height,
            minX: -this._image.anchor.x * this._image.texture.orig.width,
            minY: -this._image.anchor.y * this._image.texture.orig.height,
          }
        : this._image.bounds;
    const { width: imageWidth, height: imageHeight, minX, minY } = bounds;
    this._imageContent.visible =
      imageWidth > 0 &&
      imageHeight > 0 &&
      [imageWidth, imageHeight, minX, minY].every(Number.isFinite);
    if (!this._imageContent.visible) {
      return;
    }

    let scaleX = 1;
    let scaleY = 1;
    let x = 0;
    let y = 0;
    if (objectFit === 'cover' || objectFit === 'contain') {
      const scaleToFit = objectFit === 'cover' ? Math.max : Math.min;
      scaleX = scaleY = scaleToFit(
        containerWidth / imageWidth,
        containerHeight / imageHeight,
      );
      x = (containerWidth - imageWidth * scaleX) / 2;
      y = (containerHeight - imageHeight * scaleY) / 2;
    } else if (objectFit === 'fill') {
      scaleX = containerWidth / imageWidth;
      scaleY = containerHeight / imageHeight;
    }
    this._image.scale.set(scaleX, scaleY);
    // Normalize Graphics origins and Sprite anchors to the fitted top-left.
    this._image.position.set(
      x + (this._image.pivot.x - minX) * scaleX,
      y + (this._image.pivot.y - minY) * scaleY,
    );
  }

  applyLayout() {
    super.applyLayout();
    if (this.isDestroyed) return;
    this.applyImage();
    this.applyObjectFit();
  }

  setImage(image: Sprite | Graphics) {
    this._image = image;
    this.markDirty();
  }

  protected getDestroyTasks() {
    return [
      () => {
        if (!this._imageContent.destroyed) {
          this._imageContent.mask = null;
          this._imageContent.removeChildren();
          this._imageContent.destroy();
        }
      },
      () => {
        if (!this._imageMask.destroyed) this._imageMask.destroy();
      },
      () => {
        this._image = null;
      },
    ];
  }
}
