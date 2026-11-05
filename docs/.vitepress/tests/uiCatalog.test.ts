// @vitest-environment node

import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { uiCatalog } from '../uiCatalog';

const components = uiCatalog.flatMap((group) => group.items);
const docs = new URL('../../', import.meta.url);

describe('UI component catalog', () => {
  it('links to each component route only once', () => {
    const slugs = components.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(components)(
    '$text has a page with a runnable preview',
    async (item) => {
      const markdown = await readFile(
        new URL(`ui/${item.slug}.md`, docs),
        'utf8',
      );
      const preview = /<LiveExample\s+example="([^"]+)"/.exec(markdown);
      expect(preview).not.toBeNull();
      await access(new URL(`examples/${preview![1]}.tsx`, docs));
    },
  );
});
