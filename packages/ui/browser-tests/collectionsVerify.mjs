import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.COLLECTIONS_EVIDENCE_DIR ?? '/tmp/piant-cod172/browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1450, height: 1350 },
  hasTouch: true,
});
const checks = [],
  errors = [],
  resources = [];
let completed = false;
page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) resources.push({ url: r.url(), status: r.status() });
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const pause = () => page.waitForTimeout(120);
const call = (method, ...args) =>
  page.evaluate(
    ({ method, args }) => window.collectionFixture[method](...args),
    { method, args },
  );
const info = (i = 0) =>
  page.evaluate((n) => window.collectionFixture.info()[n], i);
const edit = (key) =>
  page.getByRole('textbox', { name: `A 编辑 ${key}`, exact: true });
const list = () => page.getByRole('list', { name: 'A 虚拟列表', exact: true });
const tree = () => page.getByRole('tree', { name: 'B 虚拟树', exact: true });
const active = () =>
  tree().evaluate((e) => {
    const a = document.getElementById(e.getAttribute('aria-activedescendant'));
    return a
      ? {
          label: a.getAttribute('aria-label'),
          level: a.getAttribute('aria-level'),
          pos: a.getAttribute('aria-posinset'),
          size: a.getAttribute('aria-setsize'),
          expanded: a.getAttribute('aria-expanded'),
          selected: a.getAttribute('aria-selected'),
          disabled: a.getAttribute('aria-disabled'),
        }
      : null;
  });
const visibleFirst = () =>
  list().evaluate((e) => {
    const vr = e.getBoundingClientRect();
    return [...e.querySelectorAll('[role=listitem]')]
      .map((e) => ({
        label: e.getAttribute('aria-label'),
        r: e.getBoundingClientRect(),
      }))
      .filter(({ r }) => r.bottom > vr.top + 1 && r.top < vr.bottom - 1)
      .map(({ label, r }) => ({ label, top: r.top - vr.top }))[0];
  });
const key = async (value) => {
  await tree().focus();
  await page.keyboard.press(value);
  await pause();
};
try {
  await page.goto(
    process.env.COLLECTIONS_URL ?? 'http://127.0.0.1:4177/collections.html',
  );
  await list().waitFor();
  await tree().waitFor();
  await pause();
  check(
    '10k list and 10.1k source tree mount only bounded windows',
    (await info()).count === 10000 &&
      (await info(1)).count === 10100 &&
      (await page.locator('[role=listitem]').count()) < 20 &&
      (await page.locator('[role=treeitem]').count()) < 20,
  );
  const initial = await edit('item-0').elementHandle();
  await edit('item-0').fill('外部保存的中文草稿');
  await edit('item-0').evaluate((e) => e.setSelectionRange(0, 4));
  await call('scroll', 0, 9000);
  await pause();
  check(
    'distant jump destroys offscreen editor and recovers focus to stable viewport',
    (await initial.evaluate((e) => !e.isConnected)) &&
      (await list().evaluate((e) => document.activeElement === e)) &&
      (await page.locator('input').count()) < 20,
  );
  check(
    'distant target is actually constructed',
    (await edit('item-9000').count()) === 1,
  );
  await call('key', 0, 'item-0');
  await pause();
  check(
    'keyed external draft survives row destruction and reconstruction',
    (await edit('item-0').inputValue()) === '外部保存的中文草稿',
  );
  await call('key', 0, 'item-5000');
  await pause();
  const before = await visibleFirst();
  const retained = await edit('item-5000').elementHandle();
  await call('action', 0, 'prepend');
  await pause();
  const inserted = await visibleFirst();
  check(
    'prepend preserves first visible key inset and retained input identity',
    before.label === inserted.label &&
      Math.abs(before.top - inserted.top) < 2 &&
      (await retained.evaluate((e) => e.isConnected)),
  );
  await call('action', 0, 'changeHeights');
  await pause();
  const resized = await visibleFirst();
  check(
    'height re-estimation and measurement keep keyed scroll anchor',
    inserted.label === resized.label &&
      Math.abs(inserted.top - resized.top) < 2,
  );
  await call('action', 0, 'reverse');
  await pause();
  check(
    'reorder preserves anchored row and reactive item identity',
    (await visibleFirst()).label === resized.label &&
      (await retained.evaluate((e) => e.isConnected)),
  );
  await call('action', 0, 'remove', 'item-5000');
  await pause();
  check(
    'deleted anchor has deterministic surviving fallback and no stale row',
    (await retained.evaluate((e) => !e.isConnected)) &&
      (await edit('item-5000').count()) === 0 &&
      (await page.locator('[role=listitem]').count()) < 20,
  );
  await call('action', 0, 'restore');
  await call('key', 0, 'item-0');
  await pause();
  let r = await list().boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 420);
  await pause();
  check(
    'actual wheel scroll advances virtual window',
    (await call('range', 0)).offset > 0,
  );
  await list().focus();
  await page.keyboard.press('End');
  await pause();
  check(
    'list End reaches final row without constructing whole data',
    (await call('range', 0)).end === 10000 &&
      (await page.locator('[role=listitem]').count()) < 20,
  );
  await page.keyboard.press('Home');
  await pause();
  check(
    'list Home returns to first item',
    (await call('range', 0)).start === 0,
  );
  await call('scale', 0, 0.75);
  await pause();
  r = await list().boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.wheel(0, 300);
  await pause();
  check(
    'scaled parent keeps native row hit geometry aligned',
    await page.locator('input').evaluateAll((es) =>
      es.some((e) => {
        const r = e.getBoundingClientRect();
        return (
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e
        );
      }),
    ),
  );
  await call('scale', 0, 1);
  await call('width', 0, 300);
  await call('appearance', 0, true);
  await pause();
  check(
    'narrow dark large-font list retains bounded live nodes',
    (await page.locator('[role=listitem]').count()) < 20 &&
      (await page
        .locator('input')
        .first()
        .evaluate((e) => Number.parseFloat(e.style.fontSize) >= 24)),
  );
  await page.screenshot({ path: `${output}/list-narrow-dark.png` });
  await call('appearance', 0, false);
  await call('width', 0, 680);
  await call('action', 0, 'clear');
  await pause();
  check(
    'empty list releases rows and clamps offset',
    (await page.locator('[role=listitem]').count()) === 0 &&
      (await call('range', 0)).offset === 0,
  );
  await call('action', 0, 'restore');
  await pause();
  await tree().focus();
  await pause();
  check(
    'tree has single stable root focus with a real active descendant',
    (await tree().evaluate((e) => document.activeElement === e)) &&
      Boolean(await active()),
  );
  await key('Home');
  await key('ArrowRight');
  check(
    'Right on expanded parent navigates to first child',
    (await active()).label === '文件 0-0' &&
      (await active()).level === '2' &&
      (await active()).pos === '1' &&
      (await active()).size === '100',
  );
  check(
    'navigation does not select implicitly',
    (await info(1)).value === null,
  );
  await key('Enter');
  check(
    'Enter explicitly commits selected key',
    (await info(1)).value === 'leaf-0-0' &&
      (await active()).selected === 'true',
  );
  await key('ArrowDown');
  await key('ArrowDown');
  await key('ArrowDown');
  const selected = (await info(1)).value;
  await key('Enter');
  check(
    'disabled tree item is discoverable but not selectable',
    (await active()).label === '文件 0-3' &&
      (await active()).disabled === 'true' &&
      (await info(1)).value === selected,
  );
  await key('ArrowLeft');
  check(
    'Left from child navigates to parent',
    (await active()).label === '文件夹 0',
  );
  await key('ArrowLeft');
  check(
    'Left collapses parent while keeping focus',
    (await active()).expanded === 'false' &&
      (await info(1)).expanded.length === 0,
  );
  await key('ArrowRight');
  check(
    'Right expands collapsed parent without changing selected value',
    (await active()).expanded === 'true' && (await info(1)).value === selected,
  );
  await call('action', 1, 'expandAll');
  await pause();
  await key('End');
  check(
    'End crosses 10.1k expanded nodes using bounded tree window',
    (await active()).label === '文件 99-99' &&
      (await page.locator('[role=treeitem]').count()) < 20 &&
      (await call('range', 1)).total === 10100,
  );
  await key('Home');
  await key('PageDown');
  check(
    'PageDown reveals later tree nodes while retaining root focus',
    (await active()).label !== '文件夹 0' &&
      (await tree().evaluate((e) => document.activeElement === e)),
  );
  await call('key', 1, 'leaf-90-0');
  await pause();
  check(
    'manual offscreen scroll clears dangling active descendant without losing root focus',
    (await active()) === null &&
      (await tree().evaluate((e) => document.activeElement === e)),
  );
  await key('ArrowDown');
  check(
    'next keyboard navigation reveals logical active successor',
    Boolean(await active()),
  );
  await key('Home');
  await key('ArrowRight');
  await key('Enter');
  await call('action', 1, 'collapseAll');
  await pause();
  check(
    'collapsing active descendant recovers nearest visible ancestor and preserves selection',
    (await active()).label === '文件夹 0' &&
      (await info(1)).value === 'leaf-0-0',
  );
  await call('action', 1, 'remove', 'folder-0');
  await pause();
  check(
    'removing active subtree selects surviving navigation fallback without changing committed value',
    (await active()).label === '文件夹 1' &&
      (await info(1)).value === 'leaf-0-0',
  );
  await call('action', 1, 'restore');
  await call('action', 1, 'collapseAll');
  await pause();
  await key('Home');
  let row = page.getByRole('treeitem', { name: '文件夹 0', exact: true });
  r = await row.boundingBox();
  await page.mouse.click(r.x + 16, r.y + r.height / 2);
  await pause();
  check(
    'real Canvas disclosure pointer expands without implicit selection',
    (await info(1)).expanded.includes('folder-0') &&
      (await info(1)).value === 'leaf-0-0',
  );
  row = page.getByRole('treeitem', { name: '文件 0-1', exact: true });
  r = await row.boundingBox();
  await page.mouse.click(r.x + 130, r.y + r.height / 2);
  await pause();
  check(
    'real Canvas row pointer selects and retains tree root focus',
    (await info(1)).value === 'leaf-0-1' &&
      (await tree().evaluate((e) => document.activeElement === e)),
  );
  const treeHandle = await tree().elementHandle();
  await call('appearance', 1, true);
  await call('width', 1, 300);
  await pause();
  check(
    'tree typography and container changes retain root identity and selected state',
    (await treeHandle.evaluate((e) => e.isConnected)) &&
      (await info(1)).value === 'leaf-0-1' &&
      (await call('range', 1)).totalHeight / (await call('range', 1)).total >
        32,
  );
  await page.screenshot({ path: `${output}/tree-narrow-dark.png` });
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(`${output}/accessibility.json`, JSON.stringify(ax, null, 2));
  check(
    'Chrome AX exposes named list/tree and explicit hierarchy metadata',
    ax.nodes.some(
      (n) =>
        !n.ignored && n.role?.value === 'tree' && n.name?.value === 'B 虚拟树',
    ) &&
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === 'treeitem' &&
          n.properties?.some((p) => p.name === 'level' && p.value?.value === 2),
      ),
  );
  const oldList = await list().elementHandle();
  await call('stop', 0);
  await pause();
  check(
    'unmount A releases editors and semantics without affecting tree',
    (await oldList.evaluate((e) => !e.isConnected)) &&
      (await page
        .locator('[data-instance=A] input,[data-instance=A] canvas')
        .count()) === 0 &&
      (await info(1)).value === 'leaf-0-1',
  );
  for (let i = 0; i < 3; i++) {
    await call('start', 0);
    await list().waitFor();
    await call('scroll', 0, 9000);
    await pause();
    await call('stop', 0);
    await pause();
    check(
      `recycle/unmount cycle ${i + 1} leaves no owned rows`,
      (await page
        .locator(
          '[data-instance=A] input,[data-instance=A] canvas,[data-instance=A] [role=list]',
        )
        .count()) === 0,
    );
  }
  await call('stop', 1);
  await pause();
  check(
    'all collection hosts dispose Canvas native fields and semantic rows',
    (await page
      .locator(
        'canvas,input,[role=list],[role=tree],[role=listitem],[role=treeitem]',
      )
      .count()) === 0,
  );
  check(
    'no browser runtime or resource errors',
    errors.length === 0 && resources.length === 0,
  );
  completed = true;
} catch (error) {
  errors.push(error.stack ?? String(error));
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(
      {
        completed,
        browser: browser.version(),
        checks,
        errors,
        resources,
        limits: [
          'Chrome keyboard/AX and Canvas mouse/wheel; not VoiceOver or system IME certification.',
          'Window counts include overscan; transient keyed reconciliation may construct two windows before old rows dispose.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
