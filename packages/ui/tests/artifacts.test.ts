import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('ships executable ESM with external core imports and no JSX or bundled runtime', () => {
  const directory = resolve(import.meta.dirname, '../dist');
  const files = readdirSync(directory, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.js'));
  expect(files.sort()).toEqual([
    'components/Spacer.js',
    'index.js',
    'primitives/createControllableState.js',
    'primitives/createFocusable.js',
    'primitives/createPressable.js',
    'primitives/focusScope.js',
    'theme/UIProvider.js',
    'theme/createTheme.js',
    'theme/tokens.js',
  ]);
  for (const file of files) {
    const source = readFileSync(`${directory}/${file}`, 'utf8');
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JSX,
    );
    function inspect(node: ts.Node) {
      expect(
        ts.isJsxElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxFragment(node),
      ).toBe(false);
      if (ts.isImportDeclaration(node)) {
        const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
        expect(specifier === '@piant/core' || specifier.startsWith('.')).toBe(
          true,
        );
      }
      ts.forEachChild(node, inspect);
    }
    inspect(ast);
  }
  const spacer = readFileSync(`${directory}/components/Spacer.js`, 'utf8');
  expect(spacer).toContain('createComponent');
  expect(spacer).toContain('from "@piant/core"');
});
