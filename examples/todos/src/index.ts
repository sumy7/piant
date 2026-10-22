import { mount } from '@piant/core';
import { initDevtools } from '@pixi/devtools';
import { App } from './App';

import './index.css';

(async () => {
  const { app } = await mount(App, document.body);
  await initDevtools({ app });
})();
