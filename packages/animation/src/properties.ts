import type { PNode } from '@piant/core';
import type { AnimatableProps, NormalizedKeyframe } from './types';

/** Restoration retains layout expressions; tween samples remain numeric. */
export type PropertySnapshot = Omit<AnimatableProps, 'width' | 'height'> &
  Pick<PNode['_layoutStyle'], 'width' | 'height'>;

/**
 * Snapshot the current animated properties of a node for "fill: none" restore.
 */
export function captureInitialProps(
  node: PNode,
  keyframes: NormalizedKeyframe[],
): PropertySnapshot {
  const initial: PropertySnapshot = {
    x: node._animTranslate.x,
    y: node._animTranslate.y,
    alpha: node._animAlpha ?? undefined,
    scaleX: node._view.scale.x,
    scaleY: node._view.scale.y,
    rotation: node._view.rotation,
    opacity: node._layoutStyle.opacity,
    backgroundColor: node._layoutStyle.backgroundColor,
    borderRadius: node._layoutStyle.borderRadius,
    borderTopLeftRadius: node._layoutStyle.borderTopLeftRadius,
    borderTopRightRadius: node._layoutStyle.borderTopRightRadius,
    borderBottomRightRadius: node._layoutStyle.borderBottomRightRadius,
    borderBottomLeftRadius: node._layoutStyle.borderBottomLeftRadius,
    width: node._layoutStyle.width,
    height: node._layoutStyle.height,
  };
  const animatedKeys = new Set(keyframes.flatMap((frame) => Object.keys(frame)));
  if (animatedKeys.has('scale')) {
    animatedKeys.add('scaleX');
    animatedKeys.add('scaleY');
  }
  // Restoring one animation must not reset independent animations on this node.
  return Object.fromEntries(
    Object.entries(initial).filter(([key]) => animatedKeys.has(key)),
  );
}

/**
 * Apply a set of AnimatableProps to a PNode.
 * Transform props are set on the Pixi Container directly;
 * style props go through PNode.setStyle() to trigger layout.
 */
export function applyProps(node: PNode, props: PropertySnapshot): void {
  let needsDirty = false;

  if (props.x !== undefined || props.y !== undefined) {
    node._animTranslate.x = props.x ?? node._animTranslate.x;
    node._animTranslate.y = props.y ?? node._animTranslate.y;
    needsDirty = true;
  }

  if (props.alpha !== undefined) {
    node._animAlpha = props.alpha;
    needsDirty = true;
  }

  if (props.scale !== undefined) {
    node._view.scale.x = props.scale;
    node._view.scale.y = props.scale;
  }
  if (props.scaleX !== undefined) node._view.scale.x = props.scaleX;
  if (props.scaleY !== undefined) node._view.scale.y = props.scaleY;
  if (props.rotation !== undefined) node._view.rotation = props.rotation;

  // Style props that go through layout
  const styleKeys: Array<keyof AnimatableProps> = [
    'opacity',
    'backgroundColor',
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
    'width',
    'height',
  ];
  const styleUpdate: Record<string, unknown> = {};
  let hasStyle = false;
  for (const key of styleKeys) {
    // Check own properties so that restore calls with undefined-valued keys (i.e.
    // props that were unset initially) still call setStyle() and clear any
    // animated value — preventing stale values after fill:'none' or cancel().
    if (Object.hasOwn(props, key)) {
      styleUpdate[key] = props[key];
      hasStyle = true;
    }
  }
  if (hasStyle) {
    node.setStyle(styleUpdate as Parameters<PNode['setStyle']>[0]);
    needsDirty = false; // setStyle already marks dirty
  }

  if (needsDirty) {
    node.markDirty();
  }
}

/** Read effective current values for the properties controlled by a target. */
export function readAnimatedProps(node: PNode, target: AnimatableProps): AnimatableProps {
  const { width, height, ...rest } = captureInitialProps(node, [{ ...target, offset: 0, easing: 'linear' }]);
  const values: AnimatableProps = rest;
  if (Object.hasOwn(target, 'alpha')) values.alpha = node._animAlpha ?? node._layoutStyle.opacity ?? 1;
  if (Object.hasOwn(target, 'opacity')) values.opacity = node._layoutStyle.opacity ?? 1;
  if (Object.hasOwn(target, 'backgroundColor')) values.backgroundColor ??= 'transparent';
  if (Object.hasOwn(target, 'borderRadius')) values.borderRadius ??= 0;
  for (const key of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'] as const) {
    if (Object.hasOwn(target, key)) values[key] ??= node._layoutStyle.borderRadius ?? 0;
  }
  if (Object.hasOwn(target, 'width')) values.width = typeof width === 'number' ? width : node._layoutNode?.getComputedWidth();
  if (Object.hasOwn(target, 'height')) values.height = typeof height === 'number' ? height : node._layoutNode?.getComputedHeight();
  return values;
}

/** Expand uniform scale so independent axis snapshots interpolate correctly. */
export function expandScale(props: AnimatableProps): AnimatableProps {
  const { scale, ...rest } = props;
  return scale === undefined ? rest : { ...rest, scaleX: rest.scaleX ?? scale, scaleY: rest.scaleY ?? scale };
}
