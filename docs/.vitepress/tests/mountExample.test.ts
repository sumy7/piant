import { beforeEach, expect, it, vi } from 'vitest';
import { mountExample } from '../theme/mountExample';

const mocks = vi.hoisted(() => ({
  mount: vi.fn(),
  onError: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('@piant/core', () => ({ mount: mocks.mount, onError: mocks.onError }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mount.mockImplementation(async (component) => {
    component();
    return { destroy: mocks.destroy };
  });
});

it('uses the shared mount lifecycle and registers example error handling in the owner', async () => {
  const host = document.createElement('div');
  const controller = new AbortController();
  const component = vi.fn();
  const report = vi.fn();
  const destroy = await mountExample(
    host,
    component,
    controller.signal,
    report,
  );
  expect(mocks.mount).toHaveBeenCalledWith(
    expect.any(Function),
    expect.objectContaining({ target: host, signal: controller.signal }),
  );
  expect(mocks.onError).toHaveBeenCalledWith(report);
  expect(component).toHaveBeenCalledOnce();
  expect(destroy).toBe(mocks.destroy);
});

it('propagates mount failures to the example host', async () => {
  mocks.mount.mockRejectedValueOnce(new Error('WebGL unavailable'));
  await expect(
    mountExample(
      document.createElement('div'),
      vi.fn(),
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow('WebGL unavailable');
});
