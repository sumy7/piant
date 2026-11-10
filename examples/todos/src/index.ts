import { mount } from '@piant/core';
import { App } from './App';
import './index.css';

document.title = 'My tasks · Piant';

void (async () => {
  const mounted = await mount(App, document.body);
  mounted.canvas.setAttribute('aria-label', 'Todo application');
  window.addEventListener('pagehide', () => mounted.destroy(), { once: true });
  if (import.meta.env.DEV) {
    const { initDevtools } = await import('@pixi/devtools');
    await initDevtools({ app: mounted.app });
  }
})();
