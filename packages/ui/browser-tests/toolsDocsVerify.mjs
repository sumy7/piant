import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = process.env.TOOLS_DOCS_EVIDENCE_DIR ?? '/tmp/piant-cod171/docs';
const base = process.env.TOOLS_DOCS_URL ?? 'http://127.0.0.1:4192';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
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
const button = (name) => page.getByRole('button', { name, exact: true });
const pause = () => page.waitForTimeout(100);
const activate = async (name) => {
  await button(name).focus();
  await page.keyboard.press('Enter');
  await pause();
};
try {
  await page.goto(`${base}/ui/search-field.html`);
  const search = page.getByRole('searchbox', { name: '搜索示例', exact: true });
  await search.waitFor();
  await search.fill('中文搜索');
  await page.keyboard.press('Enter');
  check(
    'production SearchField online example submits actual editing',
    (await search.getAttribute('placeholder')) === '已搜索：中文搜索',
  );
  await activate('清除搜索示例');
  check(
    'SearchField online clear retains focus',
    (await search.inputValue()) === '' &&
      (await search.evaluate((e) => document.activeElement === e)),
  );
  await activate('切换搜索只读');
  check(
    'SearchField online readonly is native',
    await search.evaluate((e) => e.readOnly),
  );
  await page.screenshot({ path: `${output}/search.png` });
  await page.goto(`${base}/ui/number-field.html`);
  const number = page.getByRole('spinbutton', {
    name: '数字示例',
    exact: true,
  });
  await number.waitFor();
  await number.fill('-');
  await page.keyboard.press('Enter');
  check(
    'NumberField online invalid temporary input restores committed value',
    (await number.inputValue()) === '0.2',
  );
  await page.keyboard.press('ArrowUp');
  check(
    'NumberField online decimal step',
    (await number.inputValue()) === '0.3',
  );
  await activate('设为空值');
  check('NumberField online null value', (await number.inputValue()) === '');
  await page.screenshot({ path: `${output}/number.png` });
  await page.goto(`${base}/ui/split-pane.html`);
  const separator = page.getByRole('separator', {
    name: '分栏示例',
    exact: true,
  });
  await separator.waitFor();
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  check(
    'SplitPane online keyboard operates actual layout',
    Number(await separator.getAttribute('aria-valuenow')) === 140,
  );
  await activate('切换分栏方向');
  check(
    'SplitPane online orientation updates semantics',
    (await separator.getAttribute('aria-orientation')) === 'horizontal',
  );
  await separator.focus();
  await page.keyboard.press('ArrowDown');
  check(
    'SplitPane vertical keyboard applies logical size',
    Number(await separator.getAttribute('aria-valuenow')) === 150,
  );
  await page.screenshot({ path: `${output}/split.png` });
  await page.goto(`${base}/ui/combobox.html`);
  const combo = page.getByRole('combobox', { name: '候选示例', exact: true });
  await combo.waitFor();
  await combo.fill('Pr');
  await page.keyboard.press('ArrowDown');
  await pause();
  await page.keyboard.press('Enter');
  await pause();
  check(
    'Combobox online filter and select runs installed public API',
    (await combo.inputValue()) === 'Print 印刷',
  );
  await activate('切换空候选');
  await combo.fill('');
  await page.keyboard.press('ArrowDown');
  await pause();
  check(
    'Combobox online dynamic empty candidates have no stale active option',
    (await page.getByRole('option').count()) === 0 &&
      !(await combo.getAttribute('aria-activedescendant')),
  );
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `${output}/combo.png` });
  await page.goto(`${base}/ui/tool-panel.html`);
  const toolSearch = page.getByRole('searchbox', {
    name: '示例 搜索图层',
    exact: true,
  });
  await toolSearch.waitFor();
  await toolSearch.fill('中文');
  await page.keyboard.press('Enter');
  const toolNumber = page.getByRole('spinbutton', {
    name: '示例 缩放',
    exact: true,
  });
  await toolNumber.fill('2.5');
  await page.keyboard.press('Enter');
  const toolCombo = page.getByRole('combobox', {
    name: '示例 输出预设',
    exact: true,
  });
  await toolCombo.fill('Draft');
  await page.keyboard.press('ArrowDown');
  await pause();
  await page.keyboard.press('Enter');
  await pause();
  check(
    'combined online tool keeps search numeric and selected preset',
    (await toolSearch.inputValue()) === '中文' &&
      (await toolNumber.inputValue()) === '2.5' &&
      (await toolCombo.inputValue()) === 'Draft 草稿',
  );
  const handle = await toolNumber.elementHandle();
  await activate('切换工具面板外观');
  await activate('切换工具面板宽度');
  check(
    'combined online dark compact large text retains editor identity',
    await handle.evaluate((e) => e.isConnected && e.value === '2.5'),
  );
  await page.screenshot({ path: `${output}/tool-narrow-dark.png` });
  await activate('卸载工具面板');
  check(
    'combined online unmount removes native editors',
    (await toolSearch.count()) === 0 && (await toolCombo.count()) === 0,
  );
  await activate('重新挂载工具面板');
  await toolNumber.waitFor();
  check(
    'combined online remount resets session',
    (await toolNumber.inputValue()) === '1',
  );
  await page.setViewportSize({ width: 390, height: 1100 });
  await pause();
  await page.screenshot({ path: `${output}/mobile.png` });
  check(
    'all production online examples load without runtime/resource errors',
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
          'Production documentation examples and actual keyboard editing; not operating system IME or VoiceOver certification.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
