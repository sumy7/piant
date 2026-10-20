import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';

const require = createRequire(import.meta.url);
const examplesRoot = fileURLToPath(
  new URL('../examples/', import.meta.url),
).replaceAll('\\', '/');

// Compile only the Piant examples, leaving VitePress's Vue pipeline intact.
export function piantExamples() {
  return {
    name: 'piant-doc-examples',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      const filename = id.replaceAll('\\', '/');
      if (!filename.startsWith(examplesRoot) || !filename.endsWith('.tsx'))
        return;

      const result = await transformAsync(code, {
        filename,
        babelrc: false,
        configFile: false,
        presets: [require.resolve('@piant/babel-preset-piant')],
        parserOpts: { plugins: ['typescript', 'jsx'] },
        sourceMaps: true,
      });
      if (!result?.code)
        throw new Error(`Cannot compile Piant example: ${filename}`);
      return { code: result.code, map: result.map };
    },
  };
}
