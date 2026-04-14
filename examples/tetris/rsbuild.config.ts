import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';

const assetPrefix = process.env.PIANT_ASSET_PREFIX || '/';

export default defineConfig({
  output: {
    assetPrefix,
  },
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
      babelLoaderOptions: {
        presets: [[require.resolve('@piant/babel-preset-piant')]],
        parserOpts: {
          plugins: ['jsx', 'typescript'],
        },
      },
    }),
  ],
});
