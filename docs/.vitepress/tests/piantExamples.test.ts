// @vitest-environment node

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { piantExamples } from '../piantExamples';

const exampleFile = fileURLToPath(
  new URL('../../examples/counter.tsx', import.meta.url),
);

async function transform(code: string, id: string) {
  const hook = piantExamples().transform;
  if (typeof hook !== 'function') throw new Error('Expected a transform hook');
  return hook.call({} as never, code, id);
}

describe('Piant examples compiler', () => {
  it('uses the Piant runtime for TSX while preserving types for the Vite pipeline', async () => {
    const result = await transform(
      `
      import { Text } from '@piant/core';
      export default function App() {
        const label: string = 'Hello Piant';
        return <Text>{label}</Text>;
      }
    `,
      exampleFile,
    );
    expect(result && typeof result === 'object' && result.map).toBeTruthy();
    const code = typeof result === 'object' && result ? result.code : '';
    expect(code).toContain('@piant/core');
    expect(code).toContain('createComponent');
    expect(code).toContain(': string');
    expect(code).not.toContain('<Text>');
    expect(code).not.toContain('React');
  });

  it('does not transform raw source requests, Vue files or TSX outside the examples', async () => {
    expect(await transform('<Text />', `${exampleFile}?raw`)).toBeUndefined();
    expect(
      await transform('<template />', exampleFile.replace('.tsx', '.vue')),
    ).toBeUndefined();
    expect(await transform('<Text />', '/outside/App.tsx')).toBeUndefined();
  });
});
