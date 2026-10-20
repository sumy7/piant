import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['.vitepress/tests/**/*.test.ts'],
  },
});
