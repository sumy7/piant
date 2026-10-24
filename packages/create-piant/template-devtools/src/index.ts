import { mount, onCleanup } from '@piant/core';
import type { DevtoolsSession } from '@piant/devtools';
import { App } from './App';
import './index.css';

const controller = new AbortController();
const previous = import.meta.webpackHot?.data as
  { ready?: Promise<void> } | undefined;

const ready = (async () => {
  // A cancelled Pixi initialization must release its target before the next mount.
  await previous?.ready;
  controller.signal.throwIfAborted();
  let tools: DevtoolsSession | null = null;
  const instance = await mount(
    () => {
      onCleanup(() => tools?.detach());
      return App();
    },
    document.body,
    { signal: controller.signal },
  );

  // Rsbuild removes this branch and its dynamic chunk in production builds.
  if (process.env.NODE_ENV === 'development') {
    const { attachDevtools } = await import('@piant/devtools');
    if (!instance.isDestroyed) {
      tools = attachDevtools({
        enabled: true,
        defaultOpen: false,
        root: instance.root,
        app: instance.app,
      });
    }
  }
})().catch((error: unknown) => {
  if (!controller.signal.aborted) console.error(error);
});

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
  import.meta.webpackHot.dispose((data) => {
    controller.abort();
    Object.assign(data, { ready });
  });
}
