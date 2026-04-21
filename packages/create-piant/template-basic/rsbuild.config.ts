import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';

export default defineConfig({
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
