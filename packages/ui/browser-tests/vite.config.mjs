import { fileURLToPath } from 'node:url';

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { dedupe: ['@piant/core', 'pixi.js'] },
  server: {
    host: '127.0.0.1',
    port: 4177,
    fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] },
  },
};
