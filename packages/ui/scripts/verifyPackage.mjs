import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const directory = mkdtempSync(join(tmpdir(), 'piant-ui-package-'));
const run = (args, cwd = root) =>
  execFileSync('pnpm', args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
console.log(`Package smoke: Node ${process.version}; ${directory}`);
run(['--filter', '@piant/core', 'build']);
run(['--filter', '@piant/ui', 'build']);
run(['--filter', '@piant/core', 'pack', '--pack-destination', directory]);
run(['--filter', '@piant/ui', 'pack', '--pack-destination', directory]);
const ui = JSON.parse(
  readFileSync(join(root, 'packages/ui/package.json'), 'utf8'),
);
const core = JSON.parse(
  readFileSync(join(root, 'packages/core/package.json'), 'utf8'),
);
const consumer = join(directory, 'consumer');
cpSync(join(root, 'examples/ui-smoke'), consumer, {
  recursive: true,
  filter: (path) => !['node_modules', 'dist'].includes(path.split('/').at(-1)),
});
const pkg = JSON.parse(readFileSync(join(consumer, 'package.json'), 'utf8'));
pkg.dependencies['@piant/ui'] = `file:../piant-ui-${ui.version}.tgz`;
pkg.dependencies['@piant/core'] = `file:../piant-core-${core.version}.tgz`;
writeFileSync(
  join(consumer, 'package.json'),
  `${JSON.stringify(pkg, null, 2)}\n`,
);
run(
  [
    'install',
    '--strict-peer-dependencies',
    '--config.auto-install-peers=false',
  ],
  consumer,
);
run(['typecheck'], consumer);
run(['build'], consumer);
const dependencyTree = JSON.parse(
  execFileSync(
    'pnpm',
    ['list', '@piant/core', 'mobx', '--depth', 'Infinity', '--json'],
    { cwd: consumer, encoding: 'utf8', env: process.env },
  ),
);
const appCore = dependencyTree[0].dependencies['@piant/core'];
const uiCore =
  dependencyTree[0].dependencies['@piant/ui'].dependencies['@piant/core'];
assert.equal(appCore.path, uiCore.path, 'UI must share the consumer core');
const mobxPaths = new Set();
function collectMobx(dependencies = {}) {
  for (const [name, dependency] of Object.entries(dependencies)) {
    if (name === 'mobx') mobxPaths.add(dependency.path);
    collectMobx(dependency.dependencies);
  }
}
collectMobx(dependencyTree[0].dependencies);
assert.equal(mobxPaths.size, 1, 'MobX must have one installation path');
writeFileSync(
  join(directory, 'dependency-tree.json'),
  JSON.stringify(dependencyTree, null, 2),
);
console.log('PASS: identical core and MobX installation paths');

// Test the production optimizer with a JavaScript entry, so TypeScript cannot
// erase the unused import before the bundler sees the UI package.
writeFileSync(
  join(consumer, 'src/tree.js'),
  `import '@piant/ui';
import { Spacer } from '@piant/ui';
import { View } from '@piant/core';
globalThis.piantTreeView = View;
`,
);
writeFileSync(
  join(consumer, 'tree.config.ts'),
  `import { defineConfig } from '@rsbuild/core';
const control = process.env.PIANT_TREE_SHAKE_CONTROL === '1';
export default defineConfig({
  source: { exclude: [/tree\\.js$/], entry: { index: './src/tree.js' } },
  output: { distPath: { root: control ? 'dist-control' : 'dist-tree' }, minify: false },
  tools: { rspack: { optimization: control ? { sideEffects: false, usedExports: false } : {} } },
});
`,
);
run(['exec', 'rsbuild', 'build', '--config', 'tree.config.ts'], consumer);
execFileSync(
  'pnpm',
  ['exec', 'rsbuild', 'build', '--config', 'tree.config.ts'],
  {
    cwd: consumer,
    stdio: 'inherit',
    env: { ...process.env, PIANT_TREE_SHAKE_CONTROL: '1' },
  },
);
const { readdirSync } = await import('node:fs');
function outputCode(folder) {
  const directory = join(consumer, folder);
  return readdirSync(directory, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFileSync(join(directory, file), 'utf8'))
    .join('\n');
}
assert.ok(
  /function Spacer\(/.test(outputCode('dist-control')),
  'Control must include UI implementation',
);
const optimized = outputCode('dist-tree');
assert.ok(
  !/function Spacer\(/.test(optimized),
  'Unused UI implementation remains',
);
assert.ok(optimized.includes('piantTreeView'), 'Core consumer must remain');
console.log(
  `PASS: strict isolated install, declarations, production build, unused UI removal.\nBrowser fixture: ${consumer}/dist\nTarballs: ${directory}\nThis uses real local core/UI tarballs, not registry release verification.`,
);
