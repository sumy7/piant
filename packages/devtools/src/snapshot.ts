export type SnapshotValue =
  | null
  | boolean
  | number
  | string
  | readonly SnapshotValue[]
  | { readonly [key: string]: SnapshotValue };

/** Copy data without invoking property getters or retaining application objects. */
export function readonlySnapshot(value: unknown): SnapshotValue {
  const seen = new WeakSet<object>();
  let remaining = 1000;
  const copy = (input: unknown, depth: number): SnapshotValue => {
    if (--remaining < 0) return '[Truncated]';
    if (input === null || typeof input === 'boolean') return input;
    if (typeof input === 'string')
      return input.length > 10000
        ? `${input.slice(0, 10000)}[Truncated]`
        : input;
    if (typeof input === 'number')
      return Number.isFinite(input) ? input : String(input);
    if (typeof input !== 'object') return `[${typeof input}]`;
    if (seen.has(input)) return '[Circular]';
    if (depth >= 6) return '[Max depth]';
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        const length = Object.getOwnPropertyDescriptor(input, 'length')!
          .value as number;
        const result: SnapshotValue[] = [];
        for (let index = 0; index < Math.min(length, 100); index++) {
          if (remaining <= 0) break;
          const descriptor = Object.getOwnPropertyDescriptor(
            input,
            String(index),
          );
          result.push(
            !descriptor
              ? copy(null, depth + 1)
              : 'value' in descriptor
                ? copy(descriptor.value, depth + 1)
                : '[Accessor]',
          );
        }
        if (result.length < length) result.push('[Truncated]');
        return Object.freeze(result);
      }
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null)
        return '[Non-plain object]';
      const result: Record<string, SnapshotValue> = Object.create(null);
      const keys = Object.keys(input);
      for (const key of keys.slice(0, 100)) {
        if (remaining <= 0) {
          result['[Truncated]'] = true;
          break;
        }
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        result[key] =
          descriptor && 'value' in descriptor
            ? copy(descriptor.value, depth + 1)
            : '[Accessor]';
      }
      if (keys.length > 100) result['[Truncated]'] = true;
      return Object.freeze(result);
    } catch {
      return '[Unavailable]';
    }
  };
  return copy(value, 0);
}
