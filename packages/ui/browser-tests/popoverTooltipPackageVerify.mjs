import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(
  process.env.FLOATING_EVIDENCE_DIR ?? '/tmp/piant-cod167',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = [];
const checks = [];
let completed = false;
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const activeName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const activate = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
};
const click = async (name) => {
  const rect = await button(name).boundingBox();
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
};
const panel = () =>
  page.getByRole('dialog', { name: 'Packed popover editor', exact: true });
try {
  await page.goto(
    process.env.FLOATING_PACKAGE_URL ??
      'http://127.0.0.1:4188/popoverTooltip.html',
  );
  await page.locator('#floating-status').waitFor();
  await click('Packed popover');
  await panel().waitFor();
  await page.waitForTimeout(60);
  test(
    'production Popover root exports mount and enter native input',
    (await activeName()) === 'Packed popover draft',
  );
  await click('Packed popover');
  await panel().waitFor({ state: 'detached' });
  test(
    'production real mouse Trigger toggles once without reopening',
    (await activeName()) === 'Packed popover',
  );
  await activate('Packed popover');
  await panel().waitFor();
  await page
    .getByRole('textbox', { name: 'Packed popover draft', exact: true })
    .focus();
  await page.keyboard.press('Shift+Tab');
  test(
    'production Shift+Tab exits Popover to Trigger',
    (await panel().count()) === 0 && (await activeName()) === 'Packed popover',
  );
  await activate('Packed popover');
  await panel().waitFor();
  await button('Packed popover close').focus();
  await page.keyboard.press('Tab');
  test(
    'production forward Tab exits to logical next control',
    (await panel().count()) === 0 &&
      (await activeName()) === 'Packed next target',
  );
  await button('Packed tooltip').focus();
  await page.getByRole('tooltip').waitFor();
  await page.waitForTimeout(60);
  const id = await page.getByRole('tooltip').getAttribute('id');
  test(
    'production Tooltip keeps Trigger focus with a real description link',
    (await activeName()) === 'Packed tooltip' &&
      (await button('Packed tooltip').getAttribute('aria-describedby')) ===
        id &&
      (await page.getByRole('tooltip').textContent()) ===
        'Packed tooltip description',
  );
  await page.screenshot({ path: `${output}/packed-popover-tooltip.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  test(
    'production Tooltip Escape closes and clears description without reopening',
    (await page.getByRole('tooltip').count()) === 0 &&
      (await button('Packed tooltip').getAttribute('aria-describedby')) ===
        null &&
      (await activeName()) === 'Packed tooltip',
  );
  await activate('Packed next target');
  await button('Packed tooltip').focus();
  await page.getByRole('tooltip').waitFor();
  await page.keyboard.press('Space');
  await button('Unmount anchored popups').click();
  test(
    'production Button action stays independent and unmount removes all surfaces',
    (await page.locator('#floating-status').textContent()) ===
      'Unmounted; actions=1' &&
      (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  test('production browser has no runtime errors', errors.length === 0);
  completed = true;
} finally {
  await writeFile(
    `${output}/packed-browser-results.json`,
    JSON.stringify(
      {
        completed,
        browser: browser.version(),
        checks,
        errors,
        source:
          'Changesets-versioned local core/UI tarballs, not registry release validation',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
