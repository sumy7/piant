import { mount } from '@piant/core';
import { App } from './App';

import './index.css';

(async () => {
  await mount(App, document.body);
})();
