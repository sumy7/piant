import { defineConfig } from 'vitest/config';
import { piantExamples } from './piantExamples.ts';

export default defineConfig({
  plugins: [piantExamples()],
  test: {
    environment: 'happy-dom',
    include: ['.vitepress/tests/**/*.test.ts'],
  },
});
