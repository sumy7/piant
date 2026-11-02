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
    'components/Accordion.js',
    'components/Badge.js',
    'components/Button.js',
    'components/Checkbox.js',
    'components/Collapsible.js',
    'components/Field.js',
    'components/Icon.js',
    'components/IconButton.js',
    'components/ProgressBar.js',
    'components/RadioGroup.js',
    'components/Separator.js',
    'components/Slider.js',
    'components/Spacer.js',
    'components/Spinner.js',
    'components/Stack.js',
    'components/Surface.js',
    'components/Tabs.js',
    'components/TextField.js',
    'components/ToggleSwitch.js',
    'components/internal/componentRoot.js',
    'components/internal/compositeParts.js',
    'components/internal/createButton.js',
    'components/internal/createCheckable.js',
    'components/internal/displaySemantics.js',
    'components/internal/fieldContext.js',
    'components/internal/motion.js',
    'components/internal/sliderValue.js',
    'index.js',
    'primitives/OverlayHost.js',
    'primitives/createControllableState.js',
    'primitives/createFocusable.js',
    'primitives/createPressable.js',
    'primitives/focusScope.js',
    'primitives/overlayAnchor.js',
    'primitives/overlayPosition.js',
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

it('ships the overlay root exports and matching public declarations', () => {
  const directory = resolve(import.meta.dirname, '../dist');
  const entry = readFileSync(`${directory}/index.js`, 'utf8');
  const declarations = readFileSync(`${directory}/index.d.ts`, 'utf8');
  for (const name of [
    'OverlayHost',
    'createOverlay',
    'createOverlayAnchor',
    'computeOverlayPosition',
  ]) {
    expect(entry).toContain(name);
    expect(declarations).toContain(name);
  }
  for (const name of [
    'OverlayOptions',
    'OverlayState',
    'OverlayHostProps',
    'OverlayAnchor',
    'OverlayRect',
    'OverlayPlacement',
    'OverlayPositionOptions',
    'OverlayPosition',
    'OverlayDismissReason',
  ]) {
    expect(declarations).toContain(name);
  }
  const host = readFileSync(`${directory}/primitives/OverlayHost.js`, 'utf8');
  expect(host).toContain('from "@piant/core"');
  expect(host).not.toMatch(/from ["']@piant\/core\//);
});

it('ships the Slider root export and complete public props declaration', () => {
  const directory = resolve(import.meta.dirname, '../dist');
  expect(readFileSync(`${directory}/index.js`, 'utf8')).toContain('Slider');
  expect(readFileSync(`${directory}/index.d.ts`, 'utf8')).toContain(
    'SliderProps',
  );
  const declaration = readFileSync(
    `${directory}/components/Slider.d.ts`,
    'utf8',
  );
  for (const name of [
    'name',
    'value',
    'defaultValue',
    'onValueChange',
    'min',
    'max',
    'step',
    'orientation',
    'dir',
    'disabled',
    'description',
    'valueText',
    'style',
    'ref',
  ]) {
    expect(declaration).toMatch(new RegExp(`\\b${name}\\??:`));
  }
  expect(declaration).toContain('Getter<ReturnType<typeof CustomView>>');
  const implementation = readFileSync(
    `${directory}/components/Slider.js`,
    'utf8',
  );
  expect(implementation).toContain('from "@piant/core"');
  expect(implementation).not.toMatch(/from ["']@piant\/core\//);
});

it('ships the container exports, props and shared panel declarations', () => {
  const directory = resolve(import.meta.dirname, '../dist');
  const entry = readFileSync(`${directory}/index.js`, 'utf8');
  const declarations = readFileSync(`${directory}/index.d.ts`, 'utf8');
  for (const name of ['Tabs', 'Collapsible', 'Accordion']) {
    expect(entry).toContain(name);
    expect(declarations).toContain(`${name}Props`);
    const source = readFileSync(`${directory}/components/${name}.js`, 'utf8');
    expect(source).toContain('from "@piant/core"');
    expect(source).not.toMatch(/from ["']@piant\/core\//);
  }
  for (const name of ['PanelMountStrategy', 'DisclosureItem', 'TabsItem'])
    expect(declarations).toContain(name);
  const parts = readFileSync(
    `${directory}/components/internal/compositeParts.d.ts`,
    'utf8',
  );
  expect(parts).toContain("'unmount' | 'lazy' | 'keepMounted'");
  const accordion = readFileSync(
    `${directory}/components/Accordion.d.ts`,
    'utf8',
  );
  expect(accordion).toContain("type: 'single'");
  expect(accordion).toContain("type: 'multiple'");
});
