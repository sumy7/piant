import { afterEach, describe, expect, it, vi } from 'vitest';
import Yoga, { Align } from 'yoga-layout';
import { applyStyle } from '../src/elements/layout/applyStyle';

describe('layout style diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports an invalid layout value while applying the remaining valid styles', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = Yoga.Node.create();
    applyStyle(node, { alignItems: 'invalid' as never, height: 42 });
    expect(warn).toHaveBeenCalledWith(
      '[piant] Ignored invalid layout style "alignItems".',
      'invalid',
    );
    expect(node.getAlignItems()).toBe(Align.Stretch);
    expect(node.getHeight().value).toBe(42);
    node.free();
  });
});
