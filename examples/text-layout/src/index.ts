import { Application } from 'pixi.js';
import { PRoot, render } from 'piant';
import { App } from './App';

import './index.css';

(async () => {
  const app = new Application();
  await app.init({ background: '#0b1120', resizeTo: window });

  document.body.appendChild(app.canvas);

  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });

  render(App, root);
  // @ts-ignore
  globalThis.__PIXI_APP__ = app;

  window.onresize = () => {
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  };
})();
