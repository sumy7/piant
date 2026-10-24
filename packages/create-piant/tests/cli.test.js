import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let sandbox;
let cli;
let sequence = 0;

before(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'create-piant-test-'));
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', sandbox], {
      cwd: packageDir,
      encoding: 'utf8',
    }),
  );
  const publishedFiles = new Set(packed[0].files.map((file) => file.path));
  for (const file of [
    'index.js',
    'template-basic/_package.json',
    'template-basic/_gitignore',
    'template-basic/src/App.tsx',
    'template-basic/src/index.ts',
    'template-basic/src/index.css',
    'template-basic/src/env.d.ts',
    'template-basic/tsconfig.json',
    'template-basic/rsbuild.config.ts',
    'template-router/src/App.tsx',
    'template-devtools/src/index.ts',
  ]) {
    assert.ok(publishedFiles.has(file), `missing packed file: ${file}`);
  }
  execFileSync('tar', [
    '-xzf',
    join(sandbox, packed[0].filename),
    '-C',
    sandbox,
  ]);
  cli = join(sandbox, 'package', 'index.js');
});

after(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

function workingDirectory() {
  const cwd = join(sandbox, `run-${sequence++}`);
  mkdirSync(cwd);
  return cwd;
}

function run(args, cwd = workingDirectory()) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.ifError(result.error);
  return { ...result, cwd, output: result.stdout + result.stderr };
}

function readTree(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = join(prefix, entry.name);
    return entry.isDirectory()
      ? readTree(join(directory, entry.name), relative)
      : [[relative, readFileSync(join(directory, entry.name), 'utf8')]];
  });
}

for (const template of ['basic', 'router']) {
  for (const devtools of [false, true]) {
    test(`packed CLI generates standalone ${template}, DevTools ${devtools ? 'on' : 'off'}`, () => {
      const result = run([
        'My Piant App',
        '--template',
        template,
        devtools ? '--devtools' : '--no-devtools',
      ]);
      assert.equal(result.status, 0, result.output);
      const directory = join(result.cwd, 'My Piant App');
      const files = new Map(readTree(directory));
      for (const file of [
        'package.json',
        '.gitignore',
        'tsconfig.json',
        'rsbuild.config.ts',
        'src/App.tsx',
        'src/index.ts',
        'src/index.css',
        'src/env.d.ts',
      ]) {
        assert.ok(files.has(file), `missing published template file: ${file}`);
      }
      assert.ok(!files.has('_package.json'));
      assert.ok(!files.has('_gitignore'));
      const pkg = JSON.parse(files.get('package.json'));
      assert.equal(pkg.name, 'my-piant-app');
      assert.equal(pkg.private, true);
      assert.equal(pkg.scripts.dev, 'rsbuild dev');
      assert.equal(pkg.scripts.typecheck, 'tsc --noEmit');
      assert.equal(pkg.scripts.build, 'rsbuild build');
      assert.equal(pkg.scripts.preview, 'rsbuild preview');
      assert.ok(pkg.dependencies['@piant/core']);
      assert.ok(pkg.dependencies['pixi.js']);
      assert.ok(pkg.devDependencies['@piant/babel-preset-piant']);
      assert.equal(
        Boolean(pkg.dependencies['@piant/router']),
        template === 'router',
      );
      assert.equal(Boolean(pkg.devDependencies['@piant/devtools']), devtools);
      assert.equal(Boolean(pkg.dependencies['@piant/devtools']), false);
      assert.equal(
        files.get('src/App.tsx').includes('@piant/router'),
        template === 'router',
      );
      assert.equal(
        files.get('src/index.ts').includes('@piant/devtools'),
        devtools,
      );
      if (template === 'router') {
        assert.match(files.get('src/App.tsx'), /\/users\/:id/);
        assert.match(files.get('src/App.tsx'), /RouteView/);
      }
      if (devtools) {
        assert.match(
          files.get('src/index.ts'),
          /process\.env\.NODE_ENV === 'development'/,
        );
        assert.match(files.get('src/index.ts'), /import\('@piant\/devtools'\)/);
      }
      for (const [file, content] of files) {
        assert.doesNotMatch(
          content,
          /piant-app-template|workspace:|["']file:|\.\.\/.*packages\/|packages\/core\/dist/,
          file,
        );
      }
    });
  }
}

test('non-interactive defaults create basic piant-app without DevTools', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.output);
  const pkg = JSON.parse(
    readFileSync(join(result.cwd, 'piant-app', 'package.json'), 'utf8'),
  );
  assert.equal(pkg.name, 'piant-app');
  assert.equal(pkg.dependencies['@piant/router'], undefined);
  assert.equal(pkg.devDependencies['@piant/devtools'], undefined);
});

test('short template option and equals syntax select Router', () => {
  for (const args of [
    ['app', '-t', 'router'],
    ['--template=router', 'app'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 0, result.output);
    const pkg = JSON.parse(
      readFileSync(join(result.cwd, 'app', 'package.json'), 'utf8'),
    );
    assert.ok(pkg.dependencies['@piant/router']);
  }
});

for (const args of [
  ['app', '--template', 'unknown'],
  ['app', '--template'],
  ['app', '--template='],
  ['app', '--unknown'],
  ['app', '--devtools', '--no-devtools'],
  ['app', '--no-devtools', '--devtools'],
  ['app', 'another-app'],
]) {
  test(`invalid arguments fail without writing: ${args.join(' ')}`, () => {
    const result = run(args);
    assert.notEqual(result.status, 0, result.output);
    assert.deepEqual(readdirSync(result.cwd), []);
    assert.match(result.output, /错误/);
  });
}

for (const help of ['--help', '-h']) {
  test(`${help} documents options without creating a project`, () => {
    const result = run(['unused-project', help]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.stdout, /basic\|router/);
    assert.match(result.stdout, /--devtools/);
    assert.match(result.stdout, /--no-devtools/);
    assert.deepEqual(readdirSync(result.cwd), []);
  });
}

test('nonempty directories and files are preserved', () => {
  for (const kind of ['directory', 'file']) {
    const cwd = workingDirectory();
    const target = join(cwd, 'existing');
    const sentinel = kind === 'directory' ? join(target, 'keep.txt') : target;
    if (kind === 'directory') mkdirSync(target);
    writeFileSync(sentinel, 'keep this content');
    const result = run(['existing', '--template=router', '--devtools'], cwd);
    assert.notEqual(result.status, 0, result.output);
    assert.equal(readFileSync(sentinel, 'utf8'), 'keep this content');
    if (kind === 'directory')
      assert.deepEqual(readdirSync(target), ['keep.txt']);
  }
});

test('symlink target directories are protected even when empty', () => {
  const cwd = workingDirectory();
  const target = join(cwd, 'destination');
  mkdirSync(target);
  symlinkSync(target, join(cwd, 'linked'), 'dir');
  const result = run(['linked'], cwd);
  assert.notEqual(result.status, 0, result.output);
  assert.deepEqual(readdirSync(target), []);
});

test('empty and .git-only directories can be populated without replacing Git metadata', () => {
  for (const withGit of [false, true]) {
    const cwd = workingDirectory();
    const target = join(cwd, 'existing');
    mkdirSync(target);
    if (withGit) {
      mkdirSync(join(target, '.git'));
      writeFileSync(join(target, '.git', 'config'), 'keep git config');
    }
    const result = run(['existing'], cwd);
    assert.equal(result.status, 0, result.output);
    assert.ok(existsSync(join(target, 'package.json')));
    if (withGit)
      assert.equal(
        readFileSync(join(target, '.git', 'config'), 'utf8'),
        'keep git config',
      );
  }
});

test('current directory can be populated without printing a cd instruction', () => {
  const result = run(['.']);
  assert.equal(result.status, 0, result.output);
  assert.ok(existsSync(join(result.cwd, 'package.json')));
  assert.doesNotMatch(result.stdout, /\n {2}cd /);
});

test('package names are sanitized and printed cd handles spaces and apostrophes', () => {
  const name = "My Team's App!";
  const result = run([name]);
  assert.equal(result.status, 0, result.output);
  const target = join(result.cwd, name);
  const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'my-team-s-app');
  const cdLine = result.stdout
    .split('\n')
    .find((line) => line.startsWith('  cd '));
  assert.ok(cdLine);
  const shell = spawnSync('/bin/sh', ['-c', `${cdLine.trim()} && pwd -P`], {
    cwd: result.cwd,
    encoding: 'utf8',
  });
  assert.equal(shell.status, 0, shell.stderr);
  // macOS resolves /var to /private/var in pwd -P.
  assert.equal(
    shell.stdout.trim(),
    execFileSync('/bin/pwd', ['-P'], { cwd: target, encoding: 'utf8' }).trim(),
  );
});

test('a directory with no valid package-name characters uses a valid fallback', () => {
  const result = run(['!!!']);
  assert.equal(result.status, 0, result.output);
  const pkg = JSON.parse(
    readFileSync(join(result.cwd, '!!!', 'package.json'), 'utf8'),
  );
  assert.equal(pkg.name, 'piant-app');
});
