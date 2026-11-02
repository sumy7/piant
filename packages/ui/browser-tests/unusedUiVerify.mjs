import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.UNUSED_UI_EVIDENCE_DIR ?? '/tmp/piant-cod170/unused-ui';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const checks = [],
  errors = [];
let completed = false;
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.addInitScript(() => {
  window.uiImportListeners = [];
  for (const target of [window, document]) {
    const original = target.addEventListener;
    target.addEventListener = function (type, listener, options) {
      window.uiImportListeners.push({
        target: this === document ? 'document' : 'window',
        type,
        name: typeof listener === 'function' ? listener.name : 'object',
      });
      return original.call(this, type, listener, options);
    };
  }
});
try {
  await page.goto(process.env.UNUSED_UI_URL ?? 'http://127.0.0.1:4189/');
  await page.waitForFunction(() => typeof window.piantTreeView === 'function');
  check(
    'tree-shaken core-only consumer exposes executable core View',
    (await page.evaluate(() => typeof window.piantTreeView)) === 'function',
  );
  check(
    'unused UI import creates no Canvas native input live region or overlay DOM',
    (await page
      .locator('canvas,input,button,[role],[aria-live],[data-piant-overlay]')
      .count()) === 0,
  );
  const listeners = await page.evaluate(() => window.uiImportListeners);
  check(
    'unused UI import installs no document focus or keyboard interception',
    listeners.filter(
      (e) =>
        e.target === 'document' &&
        ['focusin', 'focusout', 'keydown', 'pointerdown'].includes(e.type),
    ).length === 0,
  );
  await page.evaluate(() => {
    const field = document.createElement('input');
    field.setAttribute('aria-label', 'Core-only external input');
    document.body.append(field);
  });
  const field = page.getByRole('textbox', {
    name: 'Core-only external input',
    exact: true,
  });
  await field.fill('native editing works');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  check(
    'ordinary external native editing remains intact without UIProvider',
    (await field.inputValue()) === 'native editing works' &&
      (await field.evaluate((e) => document.activeElement === e)),
  );
  check(
    'no runtime errors in unused UI production consumer',
    errors.length === 0,
  );
  completed = true;
  await writeFile(
    `${output}/listeners.json`,
    JSON.stringify(listeners, null, 2),
  );
} catch (error) {
  errors.push(error.stack ?? String(error));
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
        scope:
          'Production tree-shaking plus runtime behavior; core initialization remains owned by core.',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
