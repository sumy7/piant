import { expectTypeOf, it } from 'vitest';
import type { MountedApp, MountOptions } from '../src/renderer/mount';

it('keeps renderer options separate from mount ownership', () => {
  const options: MountOptions = {
    target: document.createElement('canvas'),
    pixi: { background: '#fff', antialias: true },
  };
  expectTypeOf(options.target).toEqualTypeOf<HTMLElement | HTMLCanvasElement>();
  expectTypeOf<MountedApp['destroy']>().toEqualTypeOf<() => void>();
  const invalid: MountOptions = {
    target: document.createElement('div'),
    pixi: {
      // @ts-expect-error Backend options could override the managed canvas and dimensions.
      webgl: { canvas: document.createElement('canvas') },
    },
  };
  void invalid;
});
