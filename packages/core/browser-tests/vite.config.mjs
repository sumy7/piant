import { fileURLToPath } from 'node:url';

// Run from the repository root:
// pnpm --dir docs exec vite --config ../packages/core/browser-tests/vite.config.mjs
export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      'pixi.js': fileURLToPath(
        new URL('../node_modules/pixi.js/lib/index.mjs', import.meta.url),
      ),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4176,
    fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] },
  },
};
