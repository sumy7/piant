import type { Matrix, Rectangle } from 'pixi.js';
import type { PNode } from './PNode';

interface Point {
  x: number;
  y: number;
}

const cross = (a: Point, b: Point, p: Point) =>
  (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
const area = (points: Point[]) =>
  points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - p.y * next.x;
  }, 0);

/** Intersect convex polygons; reflected scene transforms can reverse winding. */
function intersect(subject: Point[], clip: Point[]): Point[] {
  const direction = area(clip) < 0 ? -1 : 1;
  for (let i = 0; i < clip.length && subject.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = subject;
    subject = [];
    let previous = input[input.length - 1];
    let previousDistance = direction * cross(a, b, previous);
    for (const point of input) {
      const distance = direction * cross(a, b, point);
      if (distance >= 0 !== previousDistance >= 0) {
        const t = previousDistance / (previousDistance - distance);
        subject.push({
          x: previous.x + t * (point.x - previous.x),
          y: previous.y + t * (point.y - previous.y),
        });
      }
      if (distance >= 0) subject.push(point);
      previous = point;
      previousDistance = distance;
    }
  }
  return subject;
}

function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function roundedRectangle(node: PNode): Point[] {
  const width = node._layoutNode.getComputedWidth();
  const height = node._layoutNode.getComputedHeight();
  const style = node._layoutStyle;
  const radius = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(value, width / 2, height / 2))
      : 0;
  const radii = [
    radius(style.borderTopRightRadius ?? style.borderRadius),
    radius(style.borderBottomRightRadius ?? style.borderRadius),
    radius(style.borderBottomLeftRadius ?? style.borderRadius),
    radius(style.borderTopLeftRadius ?? style.borderRadius),
  ];
  const points: Point[] = [];
  radii.forEach((r, corner) => {
    const cx = corner < 2 ? width - r : r;
    const cy = corner === 0 || corner === 3 ? r : height - r;
    // Inscribed arcs deviate by at most 0.25 node-local px from Pixi's curve.
    // Scene scaling scales that error. Straight edges remain exact.
    const segments =
      r > 0
        ? Math.max(
            1,
            Math.ceil(
              Math.PI / 2 / (2 * Math.acos(Math.max(-1, 1 - 0.25 / r))),
            ),
          )
        : 1;
    for (let step = 0; step <= segments; step++) {
      const angle =
        ((corner - 1) * Math.PI) / 2 + (step * Math.PI) / 2 / segments;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
  });
  return points;
}

/** DOMPipe uses this same world matrix; coordinates are renderer screen pixels. */
export function getDOMElementClip(
  node: PNode,
  transform: Matrix,
  screen: Rectangle,
): Point[] {
  const determinant = transform.a * transform.d - transform.b * transform.c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return [];
  let polygon: Point[] = rectangle(
    0,
    0,
    node._layoutNode.getComputedWidth(),
    node._layoutNode.getComputedHeight(),
  ).map((p) => transform.apply(p));
  polygon = intersect(
    polygon,
    rectangle(screen.x, screen.y, screen.width, screen.height),
  );
  // Include the node itself: its own overflow mask also applies to its DOM child.
  for (
    let ancestor: PNode | null = node;
    ancestor && polygon.length;
    ancestor = ancestor._parent
  ) {
    if (ancestor._layoutStyle.overflow !== 'hidden') continue;
    if (
      ancestor._layoutNode.getComputedWidth() <= 0 ||
      ancestor._layoutNode.getComputedHeight() <= 0
    )
      return [];
    const world = ancestor._view.worldTransform;
    polygon = intersect(
      polygon,
      roundedRectangle(ancestor).map((p) => world.apply(p)),
    );
  }
  if (Math.abs(area(polygon)) < 1e-8) return [];
  return polygon.map((point) => transform.applyInverse(point));
}
