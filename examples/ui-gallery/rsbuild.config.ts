import { createRequire } from 'node:module';
import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';

const require = createRequire(import.meta.url);
export default defineConfig({
  source: { entry: { index: './src/index.ts', workflow: './src/workflow.ts' } },
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions: {
        presets: [require.resolve('@piant/babel-preset-piant')],
        parserOpts: { plugins: ['jsx', 'typescript'] },
      },
    }),
  ],
  html: {
    title: 'Piant UI Gallery',
    tags: [{ tag: 'link', attrs: { rel: 'icon', href: 'data:,' } }],
  },
  output: { assetPrefix: process.env.PIANT_ASSET_PREFIX || '/' },
});
