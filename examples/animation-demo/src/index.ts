import { initDevtools } from '@pixi/devtools';
import { PRoot, render } from '@piant/core';
import { Application } from 'pixi.js';
import { App } from './App';

import './index.css';

(async () => {
  const app = new Application();
  await app.init({ background: '#0f172a', resizeTo: window });
  await initDevtools({ app });

  document.body.appendChild(app.canvas);

  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });

  render(App, root);

  window.onresize = () => {
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  };
})();
