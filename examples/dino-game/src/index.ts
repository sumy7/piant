import { PRoot, render } from '@piant/core';
import { initDevtools } from '@pixi/devtools';
import { Application } from 'pixi.js';
import { App } from './App';
import { setGameDimensions } from './gameLogic';

import './index.css';

(async () => {
  const app = new Application();
  await app.init({ background: '#f7f7f7', resizeTo: window });
  await initDevtools({ app });

  document.body.appendChild(app.canvas);

  setGameDimensions(app.screen.width, app.screen.height);

  const root = new PRoot(app.stage, {
    width: app.screen.width,
    height: app.screen.height,
  });

  render(App, root);

  window.onresize = () => {
    setGameDimensions(app.screen.width, app.screen.height);
    root.setStyle({ width: app.screen.width, height: app.screen.height });
  };
})();
