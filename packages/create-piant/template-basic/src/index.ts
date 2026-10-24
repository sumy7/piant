import { mount } from '@piant/core';
import { App } from './App';
import './index.css';

const controller = new AbortController();
const previous = import.meta.webpackHot?.data as
  { ready?: Promise<void> } | undefined;
const ready = (async () => {
  // A cancelled Pixi initialization must release its target before the next mount.
  await previous?.ready;
  controller.signal.throwIfAborted();
  await mount(App, document.body, { signal: controller.signal });
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
