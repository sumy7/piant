import { expect, it, vi } from 'vitest';
import { mount } from '../src/renderer/mount';

const observed = vi.hoisted(() => ({
  app: undefined as any,
  renderer: undefined as any,
}));
vi.mock('pixi.js', async (original) => {
  const pixi = await original<typeof import('pixi.js')>();
  return {
    ...pixi,
    Application: class extends pixi.Application {
      constructor() {
        super();
        observed.app = this;
      }
      async init(options: any) {
        // Use the real Application plugins and destroy implementation, with a GPU-free renderer.
        this.renderer = observed.renderer = { destroy: vi.fn() } as any;
        const plugins = (pixi.Application as any)._plugins;
        for (const plugin of plugins) plugin.init.call(this, options);
        throw new Error('later plugin failed');
      }
    },
  };
});

it('releases real Application plugins and their ticker after a later plugin fails', async () => {
  const target = document.createElement('div');
  await expect(
    mount(() => undefined, target, { width: 100, height: 100 }),
  ).rejects.toThrow('later plugin failed');
  expect(observed.app.ticker).toBeNull();
  expect(observed.app.stage).toBeNull();
  expect(observed.renderer.destroy).toHaveBeenCalledExactlyOnceWith(false);
  expect(target.children).toHaveLength(0);
});
