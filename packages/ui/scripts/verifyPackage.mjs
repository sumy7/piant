import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
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

// Version only a metadata copy outside the repository. Changesets computes the
// real release versions and peer updates; source versions remain untouched.
const preview = join(directory, 'release-preview');
mkdirSync(preview);
const originals = new Map();
function copyMetadata(source, destination) {
  originals.set(source, readFileSync(source, 'utf8'));
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}
for (const filename of ['package.json', 'pnpm-workspace.yaml', 'LICENSE']) {
  copyMetadata(join(root, filename), join(preview, filename));
}
const projects = JSON.parse(
  execFileSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  }),
);
const stagedPackages = new Map();
for (const project of projects) {
  const location = relative(root, project.path);
  assert.ok(
    !isAbsolute(location) && !location.startsWith('..'),
    'Workspace must be inside the repository',
  );
  stagedPackages.set(project.name, join(preview, location));
  copyMetadata(
    join(project.path, 'package.json'),
    join(preview, location, 'package.json'),
  );
}
const changesetsRoot = join(root, '.changeset');
const changesetFiles = readdirSync(changesetsRoot, { recursive: true })
  .map(String)
  .filter((filename) => /\.(?:md|json)$/.test(filename))
  .sort();
for (const filename of changesetFiles) {
  copyMetadata(
    join(changesetsRoot, filename),
    join(preview, '.changeset', filename),
  );
}
const changesetCLI = join(root, 'node_modules/@changesets/cli/bin.js');
assert.ok(
  existsSync(changesetCLI),
  'Install workspace dependencies before package verification',
);
const changeset = (args) =>
  execFileSync(process.execPath, [changesetCLI, ...args], {
    cwd: preview,
    stdio: 'inherit',
    env: process.env,
  });
// `changeset status` compares against baseBranch even without --since. Give
// only this disposable metadata copy a baseline; never commit in the source repo.
const previewConfig = JSON.parse(
  readFileSync(join(preview, '.changeset/config.json'), 'utf8'),
);
const previewGit = (args) =>
  execFileSync(
    'git',
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgSign=false',
      '-c',
      'user.name=Piant package verification',
      '-c',
      'user.email=package-verification@localhost',
      ...args,
    ],
    { cwd: preview, stdio: 'pipe', env: process.env },
  );
previewGit(['init', '--quiet', '--initial-branch', previewConfig.baseBranch]);
previewGit(['add', '--all']);
previewGit(['commit', '--quiet', '-m', 'Baseline release preview metadata']);
changeset(['status', '--output', join(directory, 'release-plan.json')]);
changeset(['version']);
for (const [filename, contents] of originals) {
  assert.equal(
    readFileSync(filename, 'utf8'),
    contents,
    `Release preview changed source metadata: ${filename}`,
  );
}
assert.deepEqual(
  readdirSync(changesetsRoot, { recursive: true })
    .map(String)
    .filter((filename) => /\.(?:md|json)$/.test(filename))
    .sort(),
  changesetFiles,
  'Changesets must only be consumed in the release preview',
);
const ui = JSON.parse(
  readFileSync(join(preview, 'packages/ui/package.json'), 'utf8'),
);
const core = JSON.parse(
  readFileSync(join(preview, 'packages/core/package.json'), 'utf8'),
);
for (const name of ['core', 'ui']) {
  const source = join(root, 'packages', name);
  const destination = join(preview, 'packages', name);
  cpSync(join(source, 'dist'), join(destination, 'dist'), { recursive: true });
  cpSync(join(source, 'README.md'), join(destination, 'README.md'));
}
// pnpm pack rewrites workspace: references through installed workspace links.
// Link only staged metadata, never the source checkout or its node_modules.
for (const name of ['core', 'ui']) {
  const packageRoot = join(preview, 'packages', name);
  const manifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );
  const references = new Set();
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    for (const [dependency, range] of Object.entries(manifest[section] ?? {})) {
      if (range.startsWith('workspace:')) references.add(dependency);
    }
  }
  for (const dependency of references) {
    const target = stagedPackages.get(dependency);
    assert.ok(target, `Missing staged workspace package: ${dependency}`);
    const link = join(packageRoot, 'node_modules', dependency);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link, 'dir');
  }
}
run(['pack', '--pack-destination', directory], join(preview, 'packages/core'));
run(['pack', '--pack-destination', directory], join(preview, 'packages/ui'));
const coreTarball = join(directory, `piant-core-${core.version}.tgz`);
const uiTarball = join(directory, `piant-ui-${ui.version}.tgz`);
const packedManifest = (tarball) =>
  JSON.parse(
    execFileSync('tar', ['-xOf', tarball, 'package/package.json'], {
      encoding: 'utf8',
    }),
  );
const packedUI = packedManifest(uiTarball);
assert.equal(packedManifest(coreTarball).version, core.version);
assert.equal(packedUI.version, ui.version);
assert.equal(
  packedUI.peerDependencies['@piant/core'],
  `^${core.version}`,
  'Published UI peer must require the core version computed by Changesets',
);
writeFileSync(
  join(directory, 'release-preview.json'),
  JSON.stringify(
    {
      ui: { version: ui.version, peerDependencies: packedUI.peerDependencies },
      core: { version: core.version },
      preview,
    },
    null,
    2,
  ),
);
console.log(
  `Release preview: @piant/ui ${ui.version}; @piant/core ${core.version}; UI core peer ${packedUI.peerDependencies['@piant/core']}`,
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
  join(consumer, 'src/tree-used.js'),
  `import { Spacer } from '@piant/ui';
globalThis.piantTreeGap = Spacer;
`,
);
writeFileSync(
  join(consumer, 'tree.config.ts'),
  `import { defineConfig } from '@rsbuild/core';
const control = process.env.PIANT_TREE_SHAKE_CONTROL === '1';
const used = process.env.PIANT_TREE_USE_SPACER === '1';
export default defineConfig({
  source: { exclude: [/tree\\.js$/], entry: { index: used ? './src/tree-used.js' : './src/tree.js' } },
  output: { distPath: { root: control ? 'dist-control' : used ? 'dist-used' : 'dist-tree' }, minify: false },
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
execFileSync(
  'pnpm',
  ['exec', 'rsbuild', 'build', '--config', 'tree.config.ts'],
  {
    cwd: consumer,
    stdio: 'inherit',
    env: { ...process.env, PIANT_TREE_USE_SPACER: '1' },
  },
);
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
const used = outputCode('dist-used');
assert.ok(/function Spacer\(/.test(used), 'Used Spacer must remain');
assert.ok(
  !/function UIProvider\(/.test(used),
  'Unused theme provider remains with Spacer',
);
assert.ok(
  /function createPressable\(/.test(outputCode('dist-control')),
  'Control must include pressable implementation',
);
assert.ok(
  !/function createPressable\(/.test(used),
  'Unused pressable remains with Spacer',
);
assert.ok(
  !/function createControllableState\(/.test(used),
  'Unused state utility remains with Spacer',
);
console.log(
  `PASS: strict isolated install, declarations, production build, unused UI removal.\nBrowser fixture: ${consumer}/dist\nTarballs: ${directory}\nThis uses real local core/UI tarballs after isolated Changesets versioning. Workspace versions/changesets were not changed; this is a release preview, not registry publishing or registry release verification.`,
);
