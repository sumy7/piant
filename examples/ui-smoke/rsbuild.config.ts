import { defineConfig } from '@rsbuild/core';

// No JSX/Babel plugin: dependencies must already be executable JavaScript.
export default defineConfig({
  html: { tags: [{ tag: 'link', attrs: { rel: 'icon', href: 'data:,' } }] },
  output: { assetPrefix: process.env.PIANT_ASSET_PREFIX || '/' },
});
