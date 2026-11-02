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
// A plain TypeScript consumer exercises the new declarations without a JSX
// transform or source-path imports. It is also a runnable browser fixture.
writeFileSync(
  join(consumer, 'src/overlay.ts'),
  `import { getOwner, type ContextOwner, runWithOwner, useMountSurface, type MountSurface, mount, View } from '@piant/core';
import { UIProvider, OverlayHost, createOverlay, createOverlayAnchor, computeOverlayPosition, Button, Surface, type OverlayAnchor, type OverlayOptions, type OverlayState, type OverlayHostProps, type OverlayRect, type OverlayPlacement, type OverlayPositionOptions, type OverlayPosition, type OverlayDismissReason } from '@piant/ui';
const target = document.createElement('div');
target.style.cssText = 'width:420px;height:260px';
document.body.append(target);
const bounds: OverlayRect = { x: 0, y: 0, width: 420, height: 260 };
const placement: OverlayPlacement = 'bottom-start';
const positioning: OverlayPositionOptions = { placement, flip: true, shift: true };
const result: OverlayPosition = computeOverlayPosition({ x: 24, y: 20, width: 100, height: 36 }, { width: 180, height: 100 }, bounds, positioning);
if (result.x !== 24 || result.y !== 60) throw new Error('Packed positioning failed');
let overlay: OverlayState;
const mounted = await mount(() => UIProvider({ children: () => {
  const surface: MountSurface | undefined = useMountSurface();
  if (surface?.target !== target) throw new Error('Packed mount context failed');
  const owner: ContextOwner | null = getOwner();
  if (!owner || !runWithOwner(owner, () => getOwner() === owner)) throw new Error('Packed owner binding failed');
  const hostProps: OverlayHostProps = { children: () => {
    let anchor: OverlayAnchor | undefined;
    const options: OverlayOptions = {
      get anchor() { return anchor; }, width: 220, height: 100, placement,
      onDismiss(reason: OverlayDismissReason) { target.dataset.dismiss = reason; },
      children: (state) => Surface({ style: { width: '100%', height: '100%' }, children: Button({ children: 'Close overlay', onPress: () => state.setOpen(false) }) }),
    };
    overlay = createOverlay(options);
    return View({ ref: (node) => { anchor = createOverlayAnchor(node); }, style: { width: 180, height: 40 }, children: Button({ children: 'Open overlay', onPress: () => overlay.setOpen(true) }) });
  } };
  return OverlayHost(hostProps);
} }), target);
const destroy = document.createElement('button');
destroy.textContent = 'Unmount overlay fixture';
destroy.onclick = () => mounted.destroy();
document.body.append(destroy);
`,
);
// Exercise SliderProps through the installed declarations and create a browser
// fixture which checks real semantic keyboard editing after the first frame.
writeFileSync(
  join(consumer, 'src/slider.ts'),
  `import { createState, mount, View } from '@piant/core';
import { Slider, type SliderProps, UIProvider } from '@piant/ui';
const target = document.createElement('div');
target.style.cssText = 'width:420px;height:180px';
const status = document.createElement('p');
status.id = 'slider-status';
status.textContent = 'Mounting packed Slider';
document.body.append(target, status);
let value = () => 0;
let changes = 0;
let setDisabled = (_next: boolean) => {};
const mounted = await mount(() => UIProvider({ children: () => {
  const [current, setCurrent] = createState(0.2);
  const [disabled, updateDisabled] = createState(false);
  value = current;
  setDisabled = updateDisabled;
  const props: SliderProps = {
    name: 'Packed playback speed', description: 'Controlled decimal range',
    min: -1, max: 1, step: 0.1,
    get value() { return current(); },
    get disabled() { return disabled(); },
    valueText: (next) => next.toFixed(1) + 'x',
    onValueChange(next) { changes++; setCurrent(next); },
    style: { width: 360, height: 40 },
  };
  return View({ style: { padding: 20 }, children: Slider(props) });
} }), target);
mounted.app.render();
await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
mounted.app.render();
await Promise.resolve();
const semantic = target.querySelector<HTMLElement>('[role="slider"]');
if (!semantic) throw new Error('Packed Slider semantic proxy missing');
if (semantic.getAttribute('aria-valuemin') !== '-1' || semantic.getAttribute('aria-valuemax') !== '1') throw new Error('Packed Slider range semantics failed');
semantic.focus();
semantic.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
if (value() !== 0.3 || changes !== 1 || semantic.getAttribute('aria-valuenow') !== '0.3') throw new Error('Packed Slider controlled keyboard update failed');
setDisabled(true);
semantic.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
if (value() !== 0.3 || changes !== 1 || semantic.tabIndex !== -1) throw new Error('Packed Slider disabled boundary failed');
setDisabled(false);
status.textContent = 'PASS: packed Slider controlled decimals, range semantics, keyboard and disabled state';
const destroy = document.createElement('button');
destroy.textContent = 'Unmount Slider fixture';
destroy.onclick = () => { mounted.destroy(); status.textContent = 'Unmounted packed Slider'; };
document.body.append(destroy);
`,
);
// Container fixtures use plain TS factories and every public props/item type.
// Browser assertions exercise the installed component code and native semantics.
writeFileSync(
  join(consumer, 'src/containers.ts'),
  `import { createState, mount, onCleanup, View } from '@piant/core';
import { Tabs, type TabsProps, type TabsItem, Collapsible, type CollapsibleProps, Accordion, type AccordionProps, type DisclosureItem, type PanelMountStrategy, TextField, UIProvider } from '@piant/ui';
const target = document.createElement('div');
target.style.cssText = 'width:520px;height:620px';
const status = document.createElement('p');
status.id = 'containers-status'; status.textContent = 'Mounting packed containers';
document.body.append(target, status);
let created = 0, disposed = 0;
const content = (name: string) => () => {
  created++;
  onCleanup(() => { disposed++; });
  return TextField({ 'aria-label': name, defaultValue: name });
};
const mounted = await mount(() => UIProvider({ children: () => {
  const [selected, setSelected] = createState<string | null>('first');
  const strategy: PanelMountStrategy = 'lazy';
  const tabItems: readonly TabsItem[] = [
    { value: 'first', label: 'Packed first tab', children: content('Packed first draft') },
    { value: 'second', label: 'Packed second tab', children: content('Packed second draft') },
  ];
  const tabProps: TabsProps = { label: 'Packed tab group', items: tabItems, get value() { return selected(); }, onValueChange: setSelected, mountStrategy: strategy };
  const disclosureProps: CollapsibleProps = { label: 'Packed disclosure', defaultOpen: true, mountStrategy: strategy, children: content('Packed disclosure draft') };
  const accordionItems: readonly DisclosureItem[] = [
    { value: 'a', label: 'Packed accordion A', children: content('Packed accordion A draft') },
    { value: 'b', label: 'Packed accordion B', children: content('Packed accordion B draft') },
  ];
  const accordionProps: AccordionProps = { type: 'multiple', items: accordionItems, defaultValue: ['a'], mountStrategy: 'keepMounted' };
  return View({ style: { padding: 16, gap: 12 }, children: [Tabs(tabProps), Collapsible(disclosureProps), Accordion(accordionProps)] });
} }), target);
async function settle() { mounted.root.doLayout(); mounted.app.render(); await Promise.resolve(); }
await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
await settle();
function named(name: string) {
  const element = target.querySelector<HTMLElement>('[aria-label="' + name + '"]');
  if (!element) throw new Error('Packed container missing ' + name);
  return element;
}
function check(condition: unknown, message: string) { if (!condition) throw new Error(message); }
const first = named('Packed first tab');
const firstDraft = named('Packed first draft') as HTMLInputElement;
const panel = document.getElementById(first.getAttribute('aria-controls')!);
check(panel?.getAttribute('role') === 'tabpanel' && panel.getAttribute('aria-labelledby') === first.id, 'Packed Tabs panel relationship failed');
firstDraft.value = 'retained packed draft';
firstDraft.dispatchEvent(new InputEvent('input', { bubbles: true }));
named('Packed second tab').click(); await settle();
check(named('Packed second tab').getAttribute('aria-selected') === 'true' && firstDraft.tabIndex === -1, 'Packed Tabs switching/hidden focus failed');
first.click(); await settle();
check(named('Packed first draft') === firstDraft && firstDraft.value === 'retained packed draft', 'Packed Tabs lazy draft identity failed');
const disclosure = named('Packed disclosure');
const disclosureDraft = named('Packed disclosure draft');
disclosure.click(); await settle();
check(disclosure.getAttribute('aria-expanded') === 'false' && disclosureDraft.tabIndex === -1, 'Packed Collapsible hidden state failed');
disclosure.click(); await settle();
check(named('Packed disclosure draft') === disclosureDraft, 'Packed Collapsible lazy identity failed');
const accordionADraft = named('Packed accordion A draft');
named('Packed accordion B').click(); await settle();
check(named('Packed accordion A').getAttribute('aria-expanded') === 'true' && named('Packed accordion B').getAttribute('aria-expanded') === 'true', 'Packed multiple Accordion failed');
named('Packed accordion A').click(); await settle();
check(!accordionADraft.isConnected || accordionADraft.tabIndex === -1, 'Packed Accordion hidden focus failed');
status.textContent = 'PASS: packed Tabs, Collapsible, Accordion, hidden focus and retained inputs';
const destroy = document.createElement('button'); destroy.textContent = 'Unmount container fixture';
destroy.onclick = () => {
  mounted.destroy();
  check(created === disposed, 'Packed container content cleanup failed');
  status.textContent = 'Unmounted packed containers; created=' + created + '; disposed=' + disposed;
};
document.body.append(destroy);
`,
);
writeFileSync(
  join(consumer, 'src/dialogs.ts'),
  `import { mount, View } from '@piant/core';
import { UIProvider, OverlayHost, Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose, AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogConfirm, TextField, type DialogProps, type DialogContentProps, type DialogTextProps, type DialogTriggerProps, type DialogCloseProps, type AlertDialogProps, type AlertDialogContentProps, type AlertDialogTextProps, type AlertDialogTriggerProps, type AlertDialogCancelProps, type AlertDialogConfirmProps } from '@piant/ui';
const target = document.createElement('div');
target.style.cssText = 'width:640px;height:480px'; document.body.append(target);
let confirmed = 0;
const close: DialogCloseProps = { children: 'Packed close' };
const cancel: AlertDialogCancelProps = { children: 'Packed cancel' };
const confirm: AlertDialogConfirmProps = { children: 'Packed confirm', onPress: () => { confirmed++; } };
const trigger: DialogTriggerProps = { children: 'Packed dialog' };
const alertTrigger: AlertDialogTriggerProps = { children: 'Packed alert' };
const title: DialogTextProps = { children: 'Packed dialog title' };
const alertTitle: AlertDialogTextProps = { children: 'Packed alert title' };
const content: DialogContentProps = {
  children: () => [DialogTitle(title), DialogDescription({ children: 'Packed description' }), TextField({ 'aria-label': 'Packed dialog input' })],
  actions: () => DialogClose(close),
};
const alertContent: AlertDialogContentProps = {
  children: () => [AlertDialogTitle(alertTitle), AlertDialogDescription({ children: 'Confirm explicitly' })],
  actions: () => [AlertDialogConfirm(confirm), AlertDialogCancel(cancel)],
};
const dialog: DialogProps = { children: () => [DialogTrigger(trigger), DialogContent(content)] };
const alert: AlertDialogProps = { children: () => [AlertDialogTrigger(alertTrigger), AlertDialogContent(alertContent)] };
const mounted = await mount(() => UIProvider({ children: () => OverlayHost({ children: () => View({ style: { gap: 16 }, children: [Dialog(dialog), AlertDialog(alert)] }) }) }), target);
const status = document.createElement('output'); status.id = 'dialog-status';
status.textContent = 'Packed dialogs ready'; document.body.append(status);
const destroy = document.createElement('button'); destroy.textContent = 'Unmount dialogs';
destroy.onclick = () => { mounted.destroy(); status.textContent = 'Unmounted; confirmed=' + confirmed; }; document.body.append(destroy);
`,
);
const consumerConfigPath = join(consumer, 'rsbuild.config.ts');
const consumerConfig = readFileSync(consumerConfigPath, 'utf8');
assert.ok(
  consumerConfig.includes("index: './src/index.ts',"),
  'Missing consumer entry anchor',
);
writeFileSync(
  consumerConfigPath,
  consumerConfig.replace(
    "index: './src/index.ts',",
    "index: './src/index.ts',\n      overlay: './src/overlay.ts',\n      slider: './src/slider.ts',\n      containers: './src/containers.ts',\n      dialogs: './src/dialogs.ts',",
  ),
);
run(['typecheck'], consumer);
run(['build'], consumer);
// Execute pure APIs from installed tarballs, in addition to building the GPU
// browser fixture. This proves executable exports rather than declarations only.
execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    `
import assert from 'node:assert/strict';
import { getOwner, runWithOwner, root, useMountSurface } from '@piant/core';
import * as ui from '@piant/ui';
for (const name of ['OverlayHost', 'createOverlay', 'createOverlayAnchor', 'computeOverlayPosition', 'Slider', 'Tabs', 'Collapsible', 'Accordion', 'Dialog', 'DialogTrigger', 'DialogContent', 'DialogTitle', 'DialogDescription', 'DialogClose', 'AlertDialog', 'AlertDialogTrigger', 'AlertDialogContent', 'AlertDialogTitle', 'AlertDialogDescription', 'AlertDialogCancel', 'AlertDialogConfirm']) assert.equal(typeof ui[name], 'function', name);
assert.equal(getOwner(), null);
assert.equal(useMountSurface(), undefined);
const stop = root((dispose) => {
  const owner = getOwner();
  assert.ok(owner);
  assert.equal(runWithOwner(owner, () => getOwner()), owner);
  return dispose;
});
stop();
const position = ui.computeOverlayPosition({ x: 20, y: 20, width: 60, height: 30 }, { width: 100, height: 80 }, { x: 0, y: 0, width: 400, height: 300 });
assert.equal(position.x, 20);
assert.equal(position.y, 54);
assert.equal(position.placement, 'bottom-start');
console.log('PASS: packed overlay positioning, owner APIs and public runtime exports');
`,
  ],
  { cwd: consumer, stdio: 'inherit', env: process.env },
);
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
for (const name of [
  'Stack',
  'Surface',
  'Separator',
  'Icon',
  'Badge',
  'ProgressBar',
  'Spinner',
  'Button',
  'IconButton',
  'Field',
  'TextField',
  'Checkbox',
  'ToggleSwitch',
  'RadioGroup',
  'Slider',
  'getSliderRange',
  'Tabs',
  'Collapsible',
  'Accordion',
  'Dialog',
  'DialogTrigger',
  'DialogContent',
  'DialogTitle',
  'DialogDescription',
  'DialogClose',
  'AlertDialog',
  'AlertDialogTrigger',
  'AlertDialogContent',
  'AlertDialogTitle',
  'AlertDialogDescription',
  'AlertDialogCancel',
  'AlertDialogConfirm',
  'componentRoot',
  'createCompositePanel',
  'createCompositeTrigger',
  'OverlayHost',
  'createOverlay',
  'createOverlayAnchor',
  'computeOverlayPosition',
]) {
  const implementation = new RegExp(`function ${name}\\(`);
  assert.ok(
    implementation.test(outputCode('dist-control')),
    `Control must include ${name}`,
  );
  assert.ok(
    !implementation.test(optimized),
    `Unused ${name} remains in core-only consumer`,
  );
  assert.ok(!implementation.test(used), `Unused ${name} remains with Spacer`);
}
console.log(
  `PASS: strict isolated install, declarations, production build, unused UI removal.\nBrowser fixture: ${consumer}/dist\nTarballs: ${directory}\nThis uses real local core/UI tarballs after isolated Changesets versioning. Workspace versions/changesets were not changed; this is a release preview, not registry publishing or registry release verification.`,
);
