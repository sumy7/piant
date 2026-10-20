import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import LiveExample from './LiveExample.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveExample', LiveExample);
  },
} satisfies Theme;
