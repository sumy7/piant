import { describe, expect, it } from 'vitest';
import { computeOverlayPosition } from '../src/primitives/overlayPosition';

const bounds = { x: 0, y: 0, width: 400, height: 300 };
const anchor = { x: 120, y: 100, width: 80, height: 30 };
const content = { width: 100, height: 60 };

describe('computeOverlayPosition', () => {
  it.each([
    ['bottom-start', 120, 134],
    ['bottom', 110, 134],
    ['bottom-center', 110, 134],
    ['bottom-end', 100, 134],
    ['top-start', 120, 36],
    ['top-end', 100, 36],
    ['left-start', 16, 100],
    ['left', 16, 85],
    ['left-end', 16, 70],
    ['right-start', 204, 100],
    ['right', 204, 85],
    ['right-end', 204, 70],
  ] as const)('places %s using viewport CSS pixels', (placement, x, y) => {
    expect(
      computeOverlayPosition(anchor, content, bounds, { placement }),
    ).toMatchObject({
      x,
      y,
      placement,
    });
  });

  it('defaults to bottom-start and reports room after gap and bounds padding', () => {
    expect(computeOverlayPosition(anchor, content, bounds)).toEqual({
      x: 120,
      y: 134,
      placement: 'bottom-start',
      availableHeight: 158,
      availableWidth: 384,
    });
  });

  it('flips overflowing content to the opposite side while retaining alignment', () => {
    expect(
      computeOverlayPosition({ ...anchor, y: 260 }, content, bounds, {
        placement: 'bottom-end',
      }),
    ).toEqual({
      x: 100,
      y: 196,
      placement: 'top-end',
      availableHeight: 248,
      availableWidth: 384,
    });
    expect(
      computeOverlayPosition({ ...anchor, x: 310 }, content, bounds, {
        placement: 'right-start',
      }),
    ).toMatchObject({
      x: 206,
      y: 100,
      placement: 'left-start',
      availableWidth: 298,
    });
  });

  it('keeps the requested side when it fits or the opposite side has no more room', () => {
    expect(computeOverlayPosition(anchor, content, bounds).placement).toBe(
      'bottom-start',
    );
    expect(
      computeOverlayPosition(
        { ...anchor, y: 132, height: 30 },
        { width: 100, height: 300 },
        bounds,
      ).placement,
    ).toBe('bottom-start');
    expect(
      computeOverlayPosition({ ...anchor, y: 260 }, content, bounds, {
        flip: false,
      }).placement,
    ).toBe('bottom-start');
  });

  it('shifts away from every edge and keeps oversized content at the padded start', () => {
    expect(
      computeOverlayPosition({ ...anchor, x: -30 }, content, bounds),
    ).toMatchObject({ x: 8 });
    expect(
      computeOverlayPosition({ ...anchor, x: 380 }, content, bounds),
    ).toMatchObject({ x: 292 });
    expect(
      computeOverlayPosition({ ...anchor, y: 0 }, content, bounds, {
        placement: 'top',
        flip: false,
      }),
    ).toMatchObject({ y: 8, availableHeight: 0 });
    expect(
      computeOverlayPosition({ ...anchor, y: 290 }, content, bounds, {
        flip: false,
      }),
    ).toMatchObject({ y: 232, availableHeight: 0 });
    expect(
      computeOverlayPosition(anchor, { width: 500, height: 500 }, bounds),
    ).toMatchObject({ x: 8, y: 8 });
  });

  it('allows unshifted coordinates and honors explicit gap, padding and offset bounds', () => {
    expect(
      computeOverlayPosition(
        { x: 340, y: 250, width: 20, height: 30 },
        content,
        { x: 100, y: 50, width: 300, height: 250 },
        { flip: false, shift: false, gap: 10, padding: 20 },
      ),
    ).toEqual({
      x: 340,
      y: 290,
      placement: 'bottom-start',
      availableHeight: 0,
      availableWidth: 260,
    });
    expect(
      computeOverlayPosition(
        { x: 340, y: 250, width: 20, height: 30 },
        content,
        { x: 100, y: 50, width: 300, height: 250 },
        { flip: false, gap: 10, padding: 20 },
      ),
    ).toMatchObject({ x: 280, y: 220 });
  });

  it('reports zero rather than negative available space for out-of-bounds anchors and tiny bounds', () => {
    expect(
      computeOverlayPosition({ ...anchor, y: -200 }, content, bounds, {
        placement: 'top',
        flip: false,
      }),
    ).toMatchObject({ availableHeight: 0 });
    expect(
      computeOverlayPosition(anchor, content, {
        x: 10,
        y: 20,
        width: 6,
        height: 4,
      }),
    ).toMatchObject({ x: 13, y: 22, availableWidth: 0, availableHeight: 0 });
  });
});
