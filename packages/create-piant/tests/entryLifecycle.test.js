import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let sandbox;
const entries = new Map();

before(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'create-piant-entry-test-'));
  const [packed] = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', sandbox], {
      cwd: packageDir,
      encoding: 'utf8',
    }),
  );
  execFileSync('tar', ['-xzf', join(sandbox, packed.filename), '-C', sandbox]);
  for (const devtools of [false, true]) {
    const target = join(sandbox, devtools ? 'with-tools' : 'without-tools');
    execFileSync(process.execPath, [
      join(sandbox, 'package/index.js'),
      target,
      '--template=router',
      devtools ? '--devtools' : '--no-devtools',
    ]);
    const source = readFileSync(join(target, 'src/index.ts'), 'utf8');
    const { outputText, diagnostics } = ts.transpileModule(
      source.replaceAll('import.meta.webpackHot', 'hot'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
        reportDiagnostics: true,
      },
    );
    assert.deepEqual(diagnostics, []);
    entries.set(devtools, outputText);
  }
});

after(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function flush() {
  await new Promise((resolveValue) => setImmediate(resolveValue));
}

function harness(devtools) {
  const mounts = [];
  const errors = [];
  let reserved = false;
  let live = 0;
  let panels = 0;
  let attaches = 0;
  let cleanupOwner;
  let onImportTools;
  const core = {
    onCleanup(callback) {
      assert.ok(cleanupOwner);
      cleanupOwner.push(callback);
    },
    async mount(render, _target, { signal }) {
      assert.equal(
        reserved,
        false,
        'the previous initialization still owns the canvas target',
      );
      reserved = true;
      const gate = deferred();
      const record = { gate, signal, isDestroyed: false, callbacks: [] };
      mounts.push(record);
      let initialized = false;
      const destroy = () => {
        if (record.isDestroyed) return;
        record.isDestroyed = true;
        reserved = false;
        if (initialized) live--;
        for (const callback of record.callbacks) callback();
      };
      // Pixi cannot release an initializing application until its init promise settles.
      signal.addEventListener(
        'abort',
        () => {
          if (initialized) destroy();
        },
        { once: true },
      );
      try {
        await gate.promise;
        signal.throwIfAborted();
        cleanupOwner = record.callbacks;
        try {
          render();
        } finally {
          cleanupOwner = undefined;
        }
        initialized = true;
        live++;
        return {
          get isDestroyed() {
            return record.isDestroyed;
          },
          root: {},
          app: {},
        };
      } catch (error) {
        destroy();
        throw error;
      }
    },
  };
  function execute(data = {}) {
    let dispose;
    let accepted = false;
    const hot = {
      data,
      accept: () => {
        accepted = true;
      },
      dispose: (callback) => {
        dispose = callback;
      },
    };
    runInNewContext(entries.get(devtools), {
      exports: {},
      hot,
      AbortController,
      document: { body: {} },
      process: { env: { NODE_ENV: 'development' } },
      console: { error: (error) => errors.push(error) },
      require(specifier) {
        if (specifier === '@piant/core') return core;
        if (specifier === './App') return { App: () => ({}) };
        if (specifier === './index.css') return {};
        if (specifier === '@piant/devtools') {
          onImportTools?.();
          return {
            attachDevtools: () => {
              attaches++;
              panels++;
              return {
                detach: () => {
                  panels--;
                },
              };
            },
          };
        }
        throw new Error(`Unexpected entry dependency: ${specifier}`);
      },
    });
    assert.equal(accepted, true);
    assert.equal(typeof dispose, 'function');
    return () => {
      const nextData = {};
      dispose(nextData);
      assert.equal(typeof nextData.ready?.then, 'function');
      return nextData;
    };
  }
  return {
    mounts,
    errors,
    execute,
    get live() {
      return live;
    },
    get panels() {
      return panels;
    },
    get attaches() {
      return attaches;
    },
    set onImportTools(callback) {
      onImportTools = callback;
    },
  };
}

for (const devtools of [false, true]) {
  for (const settlement of ['resolve', 'reject']) {
    test(`HMR waits for cancelled initialization to ${settlement}, DevTools ${devtools ? 'on' : 'off'}`, async () => {
      const app = harness(devtools);
      const disposeOld = app.execute();
      await flush();
      assert.equal(app.mounts.length, 1);
      const nextData = disposeOld();
      assert.equal(app.mounts[0].signal.aborted, true);
      const disposeNew = app.execute(nextData);
      await flush();
      assert.equal(
        app.mounts.length,
        1,
        'replacement waits while old Pixi initialization is pending',
      );
      if (settlement === 'resolve') app.mounts[0].gate.resolve();
      else
        app.mounts[0].gate.reject(
          new Error('cancelled Pixi initialization failed'),
        );
      await flush();
      assert.equal(app.mounts.length, 2);
      assert.equal(app.live, 0);
      app.mounts[1].gate.resolve();
      await flush();
      assert.equal(app.live, 1);
      assert.equal(app.attaches, devtools ? 1 : 0);
      assert.equal(app.panels, devtools ? 1 : 0);
      const finalData = disposeNew();
      await finalData.ready;
      assert.equal(app.live, 0);
      assert.equal(app.panels, 0);
      assert.deepEqual(app.errors, []);
    });
  }
}

test('a replacement disposed while waiting never reserves the target', async () => {
  const app = harness(true);
  const disposeOld = app.execute();
  await flush();
  const disposeNew = app.execute(disposeOld());
  const finalData = disposeNew();
  app.mounts[0].gate.resolve();
  await finalData.ready;
  assert.equal(app.mounts.length, 1);
  assert.equal(app.live, 0);
  assert.equal(app.attaches, 0);
  assert.deepEqual(app.errors, []);
});

test('DevTools import finishing after disposal does not attach a panel', async () => {
  const app = harness(true);
  const dispose = app.execute();
  await flush();
  app.onImportTools = dispose;
  app.mounts[0].gate.resolve();
  await flush();
  assert.equal(app.live, 0);
  assert.equal(app.panels, 0);
  assert.equal(app.attaches, 0);
  assert.deepEqual(app.errors, []);
});
