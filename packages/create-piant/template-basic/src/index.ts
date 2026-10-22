import { mount } from '@piant/core';
import { App } from './App';

import './index.css';

(async () => {
  await mount(App, {
    target: document.body,
    pixi: { background: '#1099bb' },
  });
})();
