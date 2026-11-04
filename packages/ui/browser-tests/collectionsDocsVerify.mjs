import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.COLLECTIONS_DOCS_EVIDENCE_DIR ?? '/tmp/piant-cod172/docs';
const base = process.env.COLLECTIONS_DOCS_URL ?? 'http://127.0.0.1:4192';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const checks = [],
  errors = [],
  resources = [];
let completed = false;
page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().endsWith('/favicon.ico'))
    resources.push({ url: r.url(), status: r.status() });
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const pause = () => page.waitForTimeout(150);
const button = (name) => page.getByRole('button', { name, exact: true });
const press = async (name) => {
  await button(name).focus();
  await page.keyboard.press('Enter');
  await pause();
};
const editor = (key) =>
  page.getByRole('textbox', { name: `示例列表 编辑 ${key}`, exact: true });
try {
  await page.goto(`${base}/ui/virtual-list.html`);
  const list = page.getByRole('list', {
    name: '示例列表 虚拟列表',
    exact: true,
  });
  await list.waitFor();
  await editor('item-0').fill('在线保留草稿');
  const first = await editor('item-0').elementHandle();
  await press('示例列表 定位 9000');
  check(
    'production online list constructs distant row and releases old editor',
    (await editor('item-9000').count()) === 1 &&
      (await first.evaluate((e) => !e.isConnected)) &&
      (await page.locator('[role=listitem]').count()) < 20,
  );
  await list.focus();
  await page.keyboard.press('Home');
  await pause();
  check(
    'online keyed draft survives recycling',
    (await editor('item-0').inputValue()) === '在线保留草稿',
  );
  const retained = await editor('item-0').elementHandle();
  await press('切换列表外观');
  check(
    'online theme and density keep native row identity',
    await retained.evaluate((e) => e.isConnected),
  );
  await page.setViewportSize({ width: 390, height: 1200 });
  await pause();
  await page.screenshot({ path: `${output}/list-mobile-dark.png` });
  await press('示例列表 清空');
  check(
    'online empty list has no stale rows/editors',
    (await page.locator('[role=listitem],input').count()) === 0,
  );
  await press('示例列表 复原');
  await editor('item-0').waitFor();
  await press('卸载虚拟列表');
  check(
    'online list unmount releases all owned native editing',
    (await list.count()) === 0 && (await page.locator('input').count()) === 0,
  );
  await press('重挂载虚拟列表');
  await editor('item-0').waitFor();
  check(
    'online list remount starts fresh keyed state',
    (await editor('item-0').inputValue()) === '条目 0',
  );
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(`${base}/ui/tree.html`);
  const tree = page.getByRole('tree', { name: '示例树 虚拟树', exact: true });
  await tree.waitFor();
  await tree.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await pause();
  const readActive = () =>
    tree.evaluate((e) => {
      const a = document.getElementById(
        e.getAttribute('aria-activedescendant'),
      );
      return a
        ? {
            name: a.getAttribute('aria-label'),
            selected: a.getAttribute('aria-selected'),
            level: a.getAttribute('aria-level'),
          }
        : null;
    });
  check(
    'production online tree keyboard selection has real hierarchical active descendant',
    (await readActive()).name === '文件 0-0' &&
      (await readActive()).selected === 'true' &&
      (await readActive()).level === '2',
  );
  await press('示例树 展开全部');
  await tree.focus();
  await page.keyboard.press('End');
  await pause();
  check(
    'online tree End reaches distant expanded node with bounded construction',
    (await readActive()).name === '文件 99-99' &&
      (await page.locator('[role=treeitem]').count()) < 20,
  );
  await press('示例树 折叠全部');
  await pause();
  check(
    'online collapse clears children and recovers active ancestor',
    (await readActive()).name === '文件夹 99',
  );
  const root = await tree.elementHandle();
  await press('切换树外观');
  check(
    'online tree theme preserves root and selection',
    await root.evaluate((e) => e.isConnected),
  );
  await page.setViewportSize({ width: 390, height: 1200 });
  await pause();
  await page.screenshot({ path: `${output}/tree-mobile-dark.png` });
  await press('示例树 清空');
  check(
    'online empty tree releases all semantic rows',
    (await page.locator('[role=treeitem]').count()) === 0 &&
      !(await tree.getAttribute('aria-activedescendant')),
  );
  await press('示例树 复原');
  await pause();
  await press('卸载虚拟树');
  check(
    'online tree unmount releases viewport/rows',
    (await tree.count()) === 0 &&
      (await page.locator('[role=treeitem]').count()) === 0,
  );
  await press('重挂载虚拟树');
  await tree.waitFor();
  check(
    'online tree remount restores fresh hierarchy',
    (await page.locator('[role=treeitem]').count()) > 0,
  );
  check(
    'production collection docs have no runtime/resource errors',
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
          'Actual production online examples with native keyboard/Canvas runtime. VoiceOver and system IME remain separate platform checks.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
