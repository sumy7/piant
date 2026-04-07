import {
  materializeRichInlineLineRange,
  measureRichInlineStats,
  type PreparedRichInline,
  prepareRichInline,
  type RichInlineItem,
  type RichInlineLine,
  type RichInlineLineRange,
  walkRichInlineLineRanges,
} from '@chenglou/pretext/rich-inline';
import { Sprite, Texture, type Container } from 'pixi.js';
import type {
  InlineBaseStyle,
  InlineImageItem,
  InlineItem,
  ImageSource,
  TextLayoutStyle,
  TextRenderSurface,
  VerticalAlign,
} from './types';

type LineBox = {
  y: number;
  height: number;
  baselineOffset: number;
};

const DEFAULT_TEXT_STYLE: TextLayoutStyle = {
  fontSize: 16,
  color: '#000000',
  lineHeight: 'normal',
  verticalAlign: 'baseline',
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  letterSpacing: 0,
  textTransform: 'none',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  textAlign: 'left',
};

const IMAGE_PLACEHOLDER = '\uFFFC';
const IMAGE_PLACEHOLDER_FONT = 'normal 1px Arial';

export class Typesetter {
  private _contents: InlineItem[] = [];
  private _styles: TextLayoutStyle = DEFAULT_TEXT_STYLE;
  private _prepared: PreparedRichInline | null = null;
  private _cachedWidth: number | null = null;
  private _cachedLines: RichInlineLine[] = [];
  private _cachedLineBoxes: LineBox[] = [];
  private _cachedStats: { lineCount: number; maxLineWidth: number } | null =
    null;
  private _measureCtx: CanvasRenderingContext2D | null = null;
  private _imageSpriteSlots: Array<{
    sprite: Sprite;
    texture: Texture | null;
  }> = [];
  private _textMeasureCache = new Map<
    string,
    { width: number; ascent: number; descent: number; height: number }
  >();

  constructor(items: InlineItem[] = [], style: Partial<TextLayoutStyle> = {}) {
    this._contents = items;
    this._styles = { ...DEFAULT_TEXT_STYLE, ...style };
  }

  setStyles(style: Partial<TextLayoutStyle> = {}) {
    this._styles = { ...this._styles, ...style };
    this.invalidate();
  }

  setContents(items: InlineItem[] = []) {
    this._contents = items;
    this.invalidate();
  }

  flow(width: number) {
    const layoutWidth = this.normalizeLayoutWidth(width);
    this.ensureLayout(layoutWidth);

    const stats = this._cachedStats ?? { lineCount: 0, maxLineWidth: 0 };
    const measuredHeight = this.getTotalLayoutHeight();
    const measuredWidth = Number.isFinite(layoutWidth)
      ? Math.min(stats.maxLineWidth, layoutWidth)
      : stats.maxLineWidth;

    return {
      width: measuredWidth,
      height: measuredHeight,
    };
  }

  renderTo(
    container: Container,
    surface: TextRenderSurface,
    bounds?: { width?: number; height?: number },
  ) {
    const layoutWidth = this._cachedWidth ?? Number.POSITIVE_INFINITY;
    this.ensureLayout(layoutWidth);

    const nextChildren: Sprite[] = [];
    let imageSlotIndex = 0;
    const renderWidth = this.resolveRenderWidth(bounds?.width, layoutWidth);
    const renderHeight = this.resolveRenderHeight(bounds?.height);
    let hasText = false;

    this.prepareTextSurface(surface, renderWidth, renderHeight);

    for (let lineIndex = 0; lineIndex < this._cachedLines.length; lineIndex++) {
      const line = this._cachedLines[lineIndex]!;
      const lineBox = this._cachedLineBoxes[lineIndex];
      if (!lineBox) continue;
      const textAlignOffset = this.getTextAlignOffset(renderWidth, line.width);
      let currentX = textAlignOffset;

      for (const fragment of line.fragments) {
        currentX += fragment.gapBefore;
        const sourceItem = this._contents[fragment.itemIndex];
        if (!sourceItem) {
          currentX += fragment.occupiedWidth;
          continue;
        }

        if (sourceItem.type === 'image') {
          const source = this.resolveImageSource(sourceItem);
          if (source) {
            const style = this.resolveItemStyle(sourceItem);
            const imageWidth = this.resolveImageWidth(sourceItem, source);
            const imageHeight = this.resolveImageHeight(sourceItem, source);
            const imageSlot = this.getImageSlot(imageSlotIndex++);
            this.updateImageSlot(
              imageSlot,
              source,
              imageWidth,
              imageHeight,
              currentX,
              this.resolveInlineY(
                style.verticalAlign,
                lineBox,
                imageHeight,
                imageHeight,
              ),
            );
            nextChildren.push(imageSlot.sprite);
          }
        } else {
          const renderedText = fragment.text.replace(/\u200B/g, '');
          if (renderedText.length > 0) {
            const style = this.resolveItemStyle(sourceItem);
            const metrics = this.getTextMetrics(renderedText, style);
            this.drawTextFragment(
              surface,
              renderedText,
              style,
              currentX,
              lineBox,
              metrics,
            );
            hasText = true;
          }
        }

        currentX += fragment.occupiedWidth;
      }
    }

    this.updateTextSurfaceSprite(surface, renderWidth, renderHeight);
    if (hasText) {
      nextChildren.unshift(surface.sprite);
    }

    this.reconcileChildren(container, nextChildren);
  }

  private invalidate() {
    this._prepared = null;
    this._cachedWidth = null;
    this._cachedLines = [];
    this._cachedLineBoxes = [];
    this._cachedStats = null;
  }

  private normalizeLayoutWidth(width: number): number {
    if (!Number.isFinite(width) || width <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    return width;
  }

  private ensurePrepared(): PreparedRichInline {
    if (this._prepared) return this._prepared;

    const items: RichInlineItem[] = this._contents.map((item) => {
      if (item.type === 'image') {
        const source = this.resolveImageSource(item);
        return {
          // Keep a measurable placeholder for rich-inline, but shrink font so
          // image layout effectively depends on extraWidth.
          text: IMAGE_PLACEHOLDER,
          font: IMAGE_PLACEHOLDER_FONT,
          break: 'never',
          extraWidth: this.resolveImageWidth(item, source),
        };
      }

      const style = this.resolveItemStyle(item);
      return {
        text: this.applyTextTransform(item.content ?? '', style.textTransform),
        font: this.toFont(style),
        extraWidth: 0,
      };
    });

    this._prepared = prepareRichInline(items);
    return this._prepared;
  }

  private ensureLayout(width: number) {
    if (this._cachedWidth === width && this._cachedStats) return;

    const prepared = this.ensurePrepared();
    const lines: RichInlineLine[] = [];
    walkRichInlineLineRanges(prepared, width, (range: RichInlineLineRange) => {
      lines.push(materializeRichInlineLineRange(prepared, range));
    });

    this._cachedWidth = width;
    this._cachedLines = lines;
    this._cachedStats = measureRichInlineStats(prepared, width);
    this._cachedLineBoxes = this.buildLineBoxes(lines);
  }

  private resolveItemStyle(item?: InlineBaseStyle): TextLayoutStyle {
    return {
      ...this._styles,
      ...item,
    };
  }

  private toFont(style: TextLayoutStyle): string {
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  }

  private applyTextTransform(
    text: string,
    transform: TextLayoutStyle['textTransform'],
  ) {
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'capitalize') {
      return text.replace(/\b(\p{L})/gu, (m) => m.toUpperCase());
    }
    return text;
  }

  private getResolvedLineHeightForStyle(style: TextLayoutStyle): number {
    const lineHeight = style.lineHeight;
    if (
      typeof lineHeight === 'number' &&
      Number.isFinite(lineHeight) &&
      lineHeight > 0
    ) {
      return lineHeight;
    }

    if (typeof lineHeight === 'string') {
      if (lineHeight.endsWith('x')) {
        const multi = Number.parseFloat(lineHeight);
        if (Number.isFinite(multi) && multi > 0) {
          return style.fontSize * multi;
        }
      }
      if (lineHeight === 'normal') {
        return style.fontSize * 1.2;
      }
      const numeric = Number.parseFloat(lineHeight);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }

    return style.fontSize * 1.2;
  }

  private getResolvedLineHeight(): number {
    return this.getResolvedLineHeightForStyle(this._styles);
  }

  private resolveImageSource(item: InlineImageItem): ImageSource | null {
    return item.source ?? item.src ?? item.content ?? null;
  }

  private resolveImageTexture(source: ImageSource | null): Texture | null {
    if (!source) return null;
    if (source instanceof Sprite) return source.texture;
    return source instanceof Texture ? source : null;
  }

  private resolveImageWidth(
    item: InlineImageItem,
    source: ImageSource | null,
  ): number {
    if (
      typeof item.width === 'number' &&
      Number.isFinite(item.width) &&
      item.width > 0
    ) {
      return item.width;
    }
    if (!source) return this._styles.fontSize;

    const texture = this.resolveImageTexture(source);
    if (texture?.width) return texture.width;
    if (source instanceof Sprite && source.width) return source.width;
    return this._styles.fontSize;
  }

  private resolveImageHeight(
    item: InlineImageItem,
    source: ImageSource | null,
  ): number {
    if (
      typeof item.height === 'number' &&
      Number.isFinite(item.height) &&
      item.height > 0
    ) {
      return item.height;
    }
    if (!source) return this.getResolvedLineHeight();

    const texture = this.resolveImageTexture(source);
    if (texture?.height) return texture.height;
    if (source instanceof Sprite && source.height) return source.height;
    return this.getResolvedLineHeight();
  }

  private getTextAlignOffset(layoutWidth: number, lineWidth: number): number {
    if (!Number.isFinite(layoutWidth)) return 0;
    const remaining = Math.max(0, layoutWidth - lineWidth);
    if (this._styles.textAlign === 'center') return remaining / 2;
    if (this._styles.textAlign === 'right') return remaining;
    return 0;
  }

  private getDevicePixelRatio(): number {
    return typeof window !== 'undefined' && window.devicePixelRatio > 0
      ? window.devicePixelRatio
      : 1;
  }

  private resolveRenderWidth(width: number | undefined, layoutWidth: number) {
    if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
      return width;
    }

    const statsWidth = this._cachedStats?.maxLineWidth ?? 0;
    if (Number.isFinite(layoutWidth)) {
      return Math.max(layoutWidth, statsWidth, 1);
    }

    return Math.max(statsWidth, 1);
  }

  private resolveRenderHeight(height: number | undefined) {
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
      return height;
    }

    return this.getTotalLayoutHeight();
  }

  private getTotalLayoutHeight() {
    if (this._cachedLineBoxes.length === 0) {
      return Math.max(1, this.getResolvedLineHeight());
    }
    const last = this._cachedLineBoxes[this._cachedLineBoxes.length - 1]!;
    return Math.max(1, last.y + last.height);
  }

  private buildLineBoxes(lines: RichInlineLine[]): LineBox[] {
    const result: LineBox[] = [];
    let y = 0;

    for (const line of lines) {
      let maxLineHeight = Math.max(1, this.getResolvedLineHeight());
      let maxBaselineOffset = 0;

      for (const fragment of line.fragments) {
        const sourceItem = this._contents[fragment.itemIndex];
        if (!sourceItem) continue;

        const style = this.resolveItemStyle(sourceItem);
        maxLineHeight = Math.max(
          maxLineHeight,
          this.getResolvedLineHeightForStyle(style),
        );

        if (sourceItem.type === 'image') {
          const imageSource = this.resolveImageSource(sourceItem);
          const imageHeight = this.resolveImageHeight(sourceItem, imageSource);
          maxLineHeight = Math.max(maxLineHeight, imageHeight);
          if (style.verticalAlign === 'baseline') {
            maxBaselineOffset = Math.max(maxBaselineOffset, imageHeight);
          }
        } else {
          const text = fragment.text.replace(/\u200B/g, '');
          if (text.length === 0) continue;
          const metrics = this.getTextMetrics(text, style);
          maxLineHeight = Math.max(maxLineHeight, metrics.height);
          if (style.verticalAlign === 'baseline') {
            maxBaselineOffset = Math.max(maxBaselineOffset, metrics.ascent);
          }
        }
      }

      const baselineOffset =
        maxBaselineOffset > 0
          ? Math.min(maxLineHeight, maxBaselineOffset)
          : Math.min(maxLineHeight, Math.ceil(maxLineHeight * 0.8));

      result.push({
        y,
        height: maxLineHeight,
        baselineOffset,
      });
      y += maxLineHeight;
    }

    return result;
  }

  private prepareTextSurface(
    surface: TextRenderSurface,
    width: number,
    height: number,
  ) {
    const dpr = this.getDevicePixelRatio();
    const pixelWidth = Math.max(1, Math.ceil(width * dpr));
    const pixelHeight = Math.max(1, Math.ceil(height * dpr));

    if (
      surface.canvas.width !== pixelWidth ||
      surface.canvas.height !== pixelHeight
    ) {
      surface.canvas.width = pixelWidth;
      surface.canvas.height = pixelHeight;
    }

    if (typeof surface.ctx.setTransform === 'function') {
      surface.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (typeof surface.ctx.clearRect === 'function') {
      surface.ctx.clearRect(0, 0, width, height);
    }
  }

  private getTextMetrics(text: string, style: TextLayoutStyle) {
    const font = this.toFont(style);
    const cacheKey = `${font}|${style.letterSpacing}|${text}`;
    const cached = this._textMeasureCache.get(cacheKey);
    if (cached) return cached;

    const measureCtx = this.getMeasureContext();
    if (!measureCtx) {
      return {
        width: text.length * style.fontSize * 0.5,
        ascent: style.fontSize * 0.8,
        descent: style.fontSize * 0.2,
        height: style.fontSize,
      };
    }

    measureCtx.font = font;
    const metrics = measureCtx.measureText(text);
    const measuredTextWidth = metrics.width;
    const letterSpacingWidth =
      Math.max(0, text.length - 1) * style.letterSpacing;
    const ascent = Math.max(
      1,
      Math.ceil(metrics?.actualBoundingBoxAscent ?? style.fontSize * 0.8),
    );
    const descent = Math.max(
      1,
      Math.ceil(metrics?.actualBoundingBoxDescent ?? style.fontSize * 0.2),
    );
    const resolved = {
      width: Math.max(1, Math.ceil(measuredTextWidth + letterSpacingWidth)),
      ascent,
      descent,
      height: Math.max(1, ascent + descent),
    };
    this._textMeasureCache.set(cacheKey, resolved);
    return resolved;
  }

  private drawTextFragment(
    surface: TextRenderSurface,
    text: string,
    style: TextLayoutStyle,
    x: number,
    lineBox: LineBox,
    metrics: { width: number; ascent: number; descent: number; height: number },
  ) {
    const { ctx } = surface;
    const font = this.toFont(style);
    const drawY = this.resolveInlineY(
      style.verticalAlign,
      lineBox,
      metrics.height,
      metrics.ascent,
    );

    ctx.font = font;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (typeof ctx.fillText === 'function') {
      if (style.letterSpacing > 0) {
        let currentX = x;
        for (const ch of text) {
          ctx.fillText(ch, currentX, drawY + metrics.ascent);
          const w =
            typeof ctx.measureText === 'function'
              ? ctx.measureText(ch).width
              : style.fontSize * 0.5;
          currentX += w + style.letterSpacing;
        }
      } else {
        ctx.fillText(text, x, drawY + metrics.ascent);
      }
    }
  }

  private resolveInlineY(
    align: VerticalAlign,
    lineBox: LineBox,
    boxHeight: number,
    baselineAscent: number,
  ) {
    if (align === 'top') return lineBox.y;
    if (align === 'middle') {
      return lineBox.y + Math.max(0, (lineBox.height - boxHeight) / 2);
    }
    if (align === 'bottom') {
      return lineBox.y + Math.max(0, lineBox.height - boxHeight);
    }

    // baseline
    return lineBox.y + Math.max(0, lineBox.baselineOffset - baselineAscent);
  }

  private getMeasureContext() {
    if (this._measureCtx) return this._measureCtx;
    const canvas = document.createElement('canvas');
    this._measureCtx = canvas.getContext('2d');
    return this._measureCtx;
  }

  private getImageSlot(index: number): {
    sprite: Sprite;
    texture: Texture | null;
  } {
    const existed = this._imageSpriteSlots[index];
    if (existed) return existed;

    const slot = {
      sprite: new Sprite(Texture.EMPTY),
      texture: null,
    };
    slot.sprite.roundPixels = true;
    this._imageSpriteSlots.push(slot);
    return slot;
  }

  private updateImageSlot(
    slot: { sprite: Sprite; texture: Texture | null },
    source: ImageSource,
    width: number,
    height: number,
    x: number,
    y: number,
  ) {
    const texture = this.resolveImageTexture(source);
    if (texture && slot.texture !== texture) {
      slot.sprite.texture = texture;
      slot.texture = texture;
    }

    slot.sprite.width = width;
    slot.sprite.height = height;
    slot.sprite.x = x;
    slot.sprite.y = y;
  }

  private updateTextSurfaceSprite(
    surface: TextRenderSurface,
    width: number,
    height: number,
  ) {
    const source = (surface.sprite.texture as any).source;
    if (source && typeof source.update === 'function') {
      source.update();
    }
    surface.sprite.x = 0;
    surface.sprite.y = 0;
    surface.sprite.width = width;
    surface.sprite.height = height;
  }

  private reconcileChildren(container: Container, nextChildren: Sprite[]) {
    const nextSet = new Set(nextChildren);

    for (const child of [...container.children]) {
      if (!nextSet.has(child as Sprite)) {
        container.removeChild(child);
      }
    }

    for (let i = 0; i < nextChildren.length; i++) {
      const child = nextChildren[i]!;
      if (child.parent !== container) {
        container.addChildAt(child, i);
      } else if (container.getChildIndex(child) !== i) {
        container.setChildIndex(child, i);
      }
    }
  }
}

export type * from './types';
