import { createRequire } from 'node:module';
import { defineConfig } from '@rslib/core';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const external = [
  'esbuild',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: ['./src/**/*.ts'],
        },
        tsconfigPath: './tsconfig.build.json',
      },
      bundle: false,
      dts: true,
      format: 'esm',
    },
    {
      source: {
        entry: {
          index: ['./src/index.ts'],
        },
        tsconfigPath: './tsconfig.build.json',
      },
      bundle: true,
      dts: false,
      format: 'cjs',
    },
  ],
  output: {
    target: 'web',
    externals: external,
  },
});
