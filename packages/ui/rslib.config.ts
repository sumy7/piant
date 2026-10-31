import { createRequire } from 'node:module';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { defineConfig } from '@rslib/core';

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    pluginBabel({
      include: /\.tsx$/,
      babelLoaderOptions: {
        presets: [require.resolve('@piant/babel-preset-piant')],
        parserOpts: { plugins: ['jsx', 'typescript'] },
      },
    }),
  ],
  lib: [
    {
      source: {
        entry: { index: ['./src/**/*.ts', './src/**/*.tsx'] },
        tsconfigPath: './tsconfig.build.json',
      },
      bundle: false,
      dts: true,
      format: 'esm',
    },
  ],
  output: { target: 'web', externals: ['@piant/core'] },
});
