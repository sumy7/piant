import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // TanStack and Solid default to SSR no-op entries under Node. Exercise their
  // actual MainPanel, theme and Button primitives in happy-dom.
  resolve: { conditions: ['browser', 'development'] },
  test: {
    server: {
      deps: {
        inline: [/@tanstack\//, /solid-js/, /@solid-primitives\//],
      },
    },
    globals: true,
    environment: 'happy-dom',
    include: ['**/tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.d.ts', 'rslib.config.ts'],
    },
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
