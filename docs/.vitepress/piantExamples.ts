import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { transformAsync } from '@babel/core';
import { createMarkdownRenderer } from 'vitepress';

const require = createRequire(import.meta.url);
const examplesRoot = fileURLToPath(
  new URL('../examples/', import.meta.url),
).replaceAll('\\', '/');
const docsRoot = fileURLToPath(new URL('../', import.meta.url));

// Compile only the Piant examples, leaving VitePress's Vue pipeline intact.
export function piantExamples() {
  let markdown: ReturnType<typeof createMarkdownRenderer> | undefined;

  return {
    name: 'piant-doc-examples',
    enforce: 'pre' as const,
    async load(id: string) {
      const [filename, query] = id.replaceAll('\\', '/').split('?');
      if (
        !filename.startsWith(examplesRoot) ||
        !filename.endsWith('.tsx') ||
        !new URLSearchParams(query).has('highlighted')
      )
        return;

      const source = await readFile(filename, 'utf8');
      markdown ??= createMarkdownRenderer(docsRoot);
      const renderer = await markdown;
      // A longer fence also preserves source containing Markdown backticks.
      const fence = '`'.repeat(
        Math.max(
          3,
          ...Array.from(source.matchAll(/`+/g), (match) => match[0].length + 1),
        ),
      );
      const html = renderer.render(`${fence}tsx\n${source}\n${fence}`);
      return `export default ${JSON.stringify(html)}`;
    },
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
