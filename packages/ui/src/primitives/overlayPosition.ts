/** A rectangle in viewport CSS pixels; never pass Canvas-local coordinates. */
export interface OverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type OverlaySide = 'top' | 'bottom' | 'left' | 'right';
type OverlayAlign = 'start' | 'center' | 'end';
export type OverlayPlacement = OverlaySide | `${OverlaySide}-${OverlayAlign}`;

export interface OverlayPositionOptions {
  placement?: OverlayPlacement;
  /** Space between the anchor and the content. Defaults to 4 CSS pixels. */
  gap?: number;
  /** Inset from each bounds edge. Defaults to 8 CSS pixels. */
  padding?: number;
  /** Choose the opposite side when it has more room and this side overflows. */
  flip?: boolean;
  /** Keep the content within padded bounds, including oversized content. */
  shift?: boolean;
}

export interface OverlayPosition {
  x: number;
  y: number;
  placement: OverlayPlacement;
  /** Maximum content height on the selected side, before applying size limits. */
  availableHeight: number;
  availableWidth: number;
}

const opposite: Record<OverlaySide, OverlaySide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function clamp(value: number, start: number, end: number) {
  return Math.max(start, Math.min(value, Math.max(start, end)));
}

/**
 * Compute a position without reading DOM or installing observers. The caller
 * converts anchor geometry into viewport CSS pixels and applies returned sizes
 * before measuring again if the content must shrink.
 */
export function computeOverlayPosition(
  anchor: OverlayRect,
  content: Pick<OverlayRect, 'width' | 'height'>,
  bounds: OverlayRect,
  options: OverlayPositionOptions = {},
): OverlayPosition {
  const requested = options.placement ?? 'bottom-start';
  const [requestedSide, requestedAlign] = requested.split('-') as [
    OverlaySide,
    OverlayAlign | undefined,
  ];
  const align = requestedAlign ?? 'center';
  const gap = options.gap ?? 4;
  const padding = Math.max(0, options.padding ?? 8);
  const left = bounds.x + Math.min(padding, bounds.width / 2);
  const top = bounds.y + Math.min(padding, bounds.height / 2);
  const right = bounds.x + bounds.width - Math.min(padding, bounds.width / 2);
  const bottom =
    bounds.y + bounds.height - Math.min(padding, bounds.height / 2);
  const room: Record<OverlaySide, number> = {
    top: Math.max(0, Math.min(bottom, anchor.y - gap) - top),
    bottom: Math.max(0, bottom - Math.max(top, anchor.y + anchor.height + gap)),
    left: Math.max(0, Math.min(right, anchor.x - gap) - left),
    right: Math.max(0, right - Math.max(left, anchor.x + anchor.width + gap)),
  };
  const vertical = requestedSide === 'top' || requestedSide === 'bottom';
  const size = vertical ? content.height : content.width;
  let side = requestedSide;
  if (
    options.flip !== false &&
    size > room[side] &&
    room[opposite[side]] > room[side]
  )
    side = opposite[side];

  const cross = (start: number, anchorSize: number, contentSize: number) =>
    start +
    (align === 'start'
      ? 0
      : align === 'end'
        ? anchorSize - contentSize
        : (anchorSize - contentSize) / 2);
  let x = vertical
    ? cross(anchor.x, anchor.width, content.width)
    : side === 'left'
      ? anchor.x - gap - content.width
      : anchor.x + anchor.width + gap;
  let y = vertical
    ? side === 'top'
      ? anchor.y - gap - content.height
      : anchor.y + anchor.height + gap
    : cross(anchor.y, anchor.height, content.height);
  if (options.shift !== false) {
    x = clamp(x, left, right - content.width);
    y = clamp(y, top, bottom - content.height);
  }
  return {
    x,
    y,
    placement: requestedAlign ? `${side}-${align}` : side,
    availableHeight: vertical ? room[side] : bottom - top,
    availableWidth: vertical ? right - left : room[side],
  };
}
