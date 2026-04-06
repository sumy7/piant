import { type Graphics, Sprite } from 'pixi.js';
import type { ImageStyles } from './layout/viewStyles';
import { PNode } from './PNode';

export class PImage extends PNode {
  _image: Sprite | Graphics | null = null;
  _layoutStyle: ImageStyles = {};

  constructor() {
    super();
  }

  // Remove all children except the image
  private applyImage() {
    if (!this._image) {
      this._viewContent.removeChildren();
      return;
    }
    if (this._viewContent.children.indexOf(this._image) < 0) {
      this._viewContent.addChild(this._image);
    }
    const toRemove = this._viewContent.children.filter(
      (child) => child !== this._image,
    );
    this._viewContent.removeChild(...toRemove);
  }

  private applyObjectFit() {
    const objectFit = this._layoutStyle.objectFit ?? 'contain';

    if (!this._image) {
      return;
    }

    const containerWidth = this._layoutNode.getComputedWidth();
    const containerHeight = this._layoutNode.getComputedHeight();

    let imageWidth = this._image.width;
    let imageHeight = this._image.height;
    if (this._image instanceof Sprite) {
      imageWidth = this._image.texture.width;
      imageHeight = this._image.texture.height;
    }

    if (objectFit === 'cover') {
      const scale = Math.max(
        containerWidth / imageWidth,
        containerHeight / imageHeight,
      );
      this._image.width = imageWidth * scale;
      this._image.height = imageHeight * scale;
      this._image.x = (containerWidth - this._image.width) / 2;
      this._image.y = (containerHeight - this._image.height) / 2;
    } else if (objectFit === 'contain') {
      const scale = Math.min(
        containerWidth / imageWidth,
        containerHeight / imageHeight,
      );
      this._image.width = imageWidth * scale;
      this._image.height = imageHeight * scale;
      this._image.x = (containerWidth - this._image.width) / 2;
      this._image.y = (containerHeight - this._image.height) / 2;
    } else if (objectFit === 'fill') {
      this._image.width = containerWidth;
      this._image.height = containerHeight;
      this._image.x = 0;
      this._image.y = 0;
    } else {
      // 'none' or undefined
      this._image.width = imageWidth;
      this._image.height = imageHeight;
      this._image.x = 0;
      this._image.y = 0;
    }
  }

  applyLayout() {
    super.applyLayout();
    this.applyImage();
    this.applyObjectFit();
  }

  setImage(image: Sprite | Graphics) {
    this._image = image;
    this.markDirty();
  }
}
