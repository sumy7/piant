import { expectTypeOf, it } from 'vitest';
import {
  type MountedApp,
  type MountOptions,
  mount,
} from '../src/renderer/mount';

it('accepts a positional element and only Piant sizing and lifecycle options', () => {
  expectTypeOf<Parameters<typeof mount>[1]>().toEqualTypeOf<
    HTMLElement | HTMLCanvasElement
  >();
  expectTypeOf<keyof MountOptions>().toEqualTypeOf<
    'width' | 'height' | 'resolution' | 'signal'
  >();
  expectTypeOf<MountedApp['destroy']>().toEqualTypeOf<() => void>();
  const checkCalls = () => {
    const element = document.createElement('canvas');
    void mount(() => undefined, element);
    void mount(() => undefined, element, { width: 200, resolution: 2 });
    // @ts-expect-error The element must be passed directly as the second argument.
    void mount(() => undefined, { target: element });
    // @ts-expect-error Sizing follows the mounted element itself.
    void mount(() => undefined, element, { resizeTo: document.body });
    // @ts-expect-error The recommended entry does not expose Pixi options.
    void mount(() => undefined, element, { pixi: { background: '#fff' } });
    // @ts-expect-error Pixi options are not flattened into MountOptions.
    void mount(() => undefined, element, { background: '#fff' });
  };
  void checkCalls;
});
