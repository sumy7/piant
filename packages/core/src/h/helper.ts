export function dynamicProperty(
  props: Record<string, any>,
  key: string,
): Record<string, any> {
  const src = props[key];
  Object.defineProperty(props, key, {
    get() {
      return src();
    },

    enumerable: true,
  });
  return props;
}

export function mergeProps(...sources: unknown[]): unknown {
  const target = {};
  for (let i = 0; i < sources.length; i++) {
    let source = sources[i];
    if (typeof source === 'function') {
      source = source();
    }
    if (source) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    }
  }
  return target;
}
