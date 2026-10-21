import { PRoot, render } from '@piant/core';
import type { DevtoolsSession } from '@piant/devtools';
import { Application } from 'pixi.js';
import { createDemo } from './App';
import './index.css';

(async () => {
  const app = new Application();
  await app.init({ background: '#0f172a', resizeTo: window });
  document.body.appendChild(app.canvas);

  const root = new PRoot(app.stage, { width: app.screen.width, height: app.screen.height });
  const demo = createDemo();
  const dispose = render(demo.App, root);
  let tools: DevtoolsSession | null = null;
  let destroyed = false;

  const resize = () => root.setStyle({ width: app.screen.width, height: app.screen.height });
  window.addEventListener('resize', resize);

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    tools?.detach();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', destroy);
    demo.dispose();
    dispose();
    root.destroy();
    app.destroy(true);
    unmount.remove();
  };

  const unmount = document.createElement('button');
  unmount.textContent = 'Unmount application';
  unmount.className = 'unmount';
  unmount.addEventListener('click', destroy, { once: true });
  document.body.appendChild(unmount);
  window.addEventListener('pagehide', destroy, { once: true });

  // Rsbuild replaces NODE_ENV and removes this branch and its chunk in production.
  if (process.env.NODE_ENV === 'development') {
    const { attachDevtools } = await import('@piant/devtools');
    if (!destroyed) {
      tools = attachDevtools({
        enabled: true,
        root,
        app,
        getState: demo.getState,
        animations: demo.animations,
      });
    }
  }
})();
