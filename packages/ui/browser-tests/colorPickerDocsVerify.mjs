import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.COLOR_PICKER_DOCS_EVIDENCE_DIR ?? '/tmp/piant-cod173/docs';
const url =
  process.env.COLOR_PICKER_DOCS_URL ??
  'http://127.0.0.1:4192/ui/color-picker.html';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const checks = [],
  errors = [],
  resources = [];
let completed = false;
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().endsWith('/favicon.ico'))
    resources.push({ url: response.url(), status: response.status() });
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const pause = () => page.waitForTimeout(150);
const button = (name) => page.getByRole('button', { name, exact: true });
const activate = async (name) => {
  await button(name).focus();
  await page.keyboard.press('Enter');
  await pause();
};
const dialog = (kind) =>
  page.getByRole('dialog', { name: `示例 ${kind} Color editor`, exact: true });
const hex = (kind) =>
  page.getByRole('textbox', { name: `示例 ${kind} Hex`, exact: true });
const channel = (kind, name) =>
  page.getByRole('spinbutton', { name: `示例 ${kind} ${name}`, exact: true });
const scroll = async (kind, key) => {
  const region = page.getByRole('region', {
    name: `示例 ${kind} Scrollable color editor`,
    exact: true,
  });
  await region.focus();
  await page.keyboard.press(key);
  await pause();
};
const open = async (kind) => {
  await activate(`示例 ${kind}`);
  await dialog(kind).waitFor();
  await pause();
};
const close = async (kind) => {
  await activate(`Close 示例 ${kind} Color editor`);
  await dialog(kind).waitFor({ state: 'detached' });
};
const editHex = async (kind, text, key = 'Enter') => {
  await scroll(kind, 'Home');
  await hex(kind).fill(text);
  await page.keyboard.press(key);
  await pause();
};
try {
  await page.goto(url);
  await button('示例 填充').waitFor();
  await open('填充');
  check(
    'production online picker opens actual native Hex input',
    (await hex('填充').inputValue()) === '#3366ff80',
  );
  await editHex('填充', ' #0F08 ');
  check(
    'keyboard hex commit expands shorthand and canonicalizes alpha',
    (await hex('填充').inputValue()) === '#00ff0088',
  );
  await editHex('填充', 'rgb(0 0 0)');
  check(
    'unsupported color text rolls back to the accepted value on Enter',
    (await hex('填充').inputValue()) === '#00ff0088',
  );
  await editHex('填充', '#f00', 'Escape');
  check(
    'first Escape cancels the uncommitted Hex draft without closing',
    (await hex('填充').inputValue()) === '#00ff0088' &&
      (await dialog('填充').count()) === 1,
  );
  await page.keyboard.press('Escape');
  await pause();
  check(
    'second Escape dismisses and returns actual keyboard focus to trigger',
    (await dialog('填充').count()) === 0 &&
      (await button('示例 填充').evaluate(
        (element) => document.activeElement === element,
      )),
  );
  await open('填充');
  const area = page.getByRole('group', {
    name: '示例 填充 Saturation and brightness',
    exact: true,
  });
  const beforeArea = await hex('填充').inputValue();
  await area.focus();
  await page.keyboard.press('ArrowLeft');
  await pause();
  check(
    'two-dimensional color area responds to its actual keyboard focus',
    (await hex('填充').inputValue()) !== beforeArea,
  );
  await scroll('填充', 'End');
  await channel('填充', 'Alpha').fill('50');
  await page.keyboard.press('Enter');
  await pause();
  await scroll('填充', 'Home');
  check(
    'numeric alpha commit roundtrips through an eight-bit Hex channel',
    (await hex('填充').inputValue()).endsWith('80'),
  );
  await scroll('填充', 'End');
  const alphaSlider = page.getByRole('slider', {
    name: '示例 填充 Alpha slider',
    exact: true,
  });
  await alphaSlider.focus();
  await page.keyboard.press('End');
  await pause();
  check(
    'alpha slider exposes and commits its opaque endpoint',
    Number(await alphaSlider.getAttribute('aria-valuenow')) === 100,
  );
  await scroll('填充', 'Home');
  check(
    'alpha slider and Hex input stay synchronized',
    (await hex('填充').inputValue()).endsWith('ff'),
  );
  await page.screenshot({ path: `${output}/fill-editor.png` });
  await close('填充');

  await open('轮廓');
  await editHex('轮廓', '#1234');
  check(
    'opaque picker accepts Hex and emits six-digit opaque output',
    (await hex('轮廓').inputValue()) === '#112233',
  );
  check(
    'opaque editor has no numeric or slider alpha controls',
    (await channel('轮廓', 'Alpha').count()) === 0 &&
      (await page
        .getByRole('slider', { name: '示例 轮廓 Alpha slider', exact: true })
        .count()) === 0,
  );
  await close('轮廓');

  await activate('示例 设为只读');
  await open('填充');
  check(
    'online readonly remains inspectable with a native readonly Hex input',
    await hex('填充').evaluate((element) => element.readOnly),
  );
  const readOnlyValue = await hex('填充').inputValue();
  await area.focus();
  await page.keyboard.press('ArrowRight');
  await pause();
  check(
    'readonly area cannot modify the accepted color',
    (await hex('填充').inputValue()) === readOnlyValue,
  );
  await close('填充');
  await activate('示例 允许编辑');
  await activate('示例 禁用填充');
  check(
    'disabled picker removes trigger activation',
    await button('示例 填充').isDisabled(),
  );
  await activate('示例 启用填充');
  await activate('示例 外部设为半透明绿');
  await open('填充');
  check(
    'external controlled color updates the next opened editor',
    (await hex('填充').inputValue()) === '#00ff0080',
  );
  await close('填充');

  await activate('切换颜色编辑器外观');
  await page.setViewportSize({ width: 390, height: 1200 });
  await pause();
  await open('填充');
  await scroll('填充', 'Home');
  check(
    'reopened narrow dark editor uses the changed native typography',
    await hex('填充').evaluate(
      (element) => Number.parseFloat(getComputedStyle(element).fontSize) >= 24,
    ),
  );
  const bounds = await dialog('填充').boundingBox();
  check(
    'online editor fits a narrow viewport',
    bounds && bounds.x >= -1 && bounds.x + bounds.width <= 391,
  );
  await page.screenshot({ path: `${output}/narrow-dark-editor.png` });
  const detached = await hex('填充').elementHandle();
  await activate('卸载颜色编辑器');
  check(
    'online unmount releases open popup and native editing',
    (await dialog('填充').count()) === 0 &&
      (await detached.evaluate((element) => !element.isConnected)) &&
      (await page.locator('input').count()) === 0,
  );
  await activate('重挂载颜色编辑器');
  await open('填充');
  await scroll('填充', 'Home');
  check(
    'online remount restores a fresh editing session',
    (await hex('填充').inputValue()) === '#3366ff80',
  );
  await close('填充');
  check(
    'production color picker docs have no runtime or resource errors',
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
        url,
        browser: browser.version(),
        checks,
        errors,
        resources,
        limits: [
          'Actual production document and Canvas runtime with native keyboard input. No operating-system IME or screen-reader certification is claimed.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
