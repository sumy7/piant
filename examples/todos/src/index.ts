import { mount } from '@piant/core';
import { initDevtools } from '@pixi/devtools';
import { App } from './App';

import './index.css';

(async () => {
  const { app } = await mount(App, {
    target: document.body,
    pixi: { background: '#1099bb' },
  });
  await initDevtools({ app });
})();
