import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(process.env.DIALOG_EVIDENCE_DIR ?? '/tmp/piant-cod166');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const activeName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const activate = async (name) => {
  await button(name).focus();
  await page.keyboard.press('Enter');
};
try {
  await page.goto(
    process.env.DIALOG_PACKAGE_TEST_URL ?? 'http://127.0.0.1:4188/dialogs.html',
  );
  await page.locator('#dialog-status').waitFor();
  await activate('Packed dialog');
  const dialog = page.getByRole('dialog', {
    name: 'Packed dialog title',
    exact: true,
  });
  await dialog.waitFor();
  await page.waitForTimeout(80);
  test(
    'packed root exports mount Dialog with first native input focused',
    (await activeName()) === 'Packed dialog input',
  );
  await page
    .getByRole('textbox', { name: 'Packed dialog input', exact: true })
    .fill('installed tarball draft');
  await page.keyboard.press('Tab');
  test(
    'packed Dialog Tab reaches explicit close action',
    (await activeName()) === 'Packed close',
  );
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  test(
    'packed Dialog Escape restores its trigger',
    (await activeName()) === 'Packed dialog',
  );
  await activate('Packed alert');
  const alert = page.getByRole('alertdialog', {
    name: 'Packed alert title',
    exact: true,
  });
  await alert.waitFor();
  await page.waitForTimeout(80);
  test(
    'packed AlertDialog prefers Cancel when Confirm is first',
    (await activeName()) === 'Packed cancel',
  );
  await page.keyboard.press('Escape');
  await alert.waitFor({ state: 'detached' });
  await activate('Packed alert');
  await alert.waitFor();
  const confirm = await button('Packed confirm').boundingBox();
  await page.mouse.click(
    confirm.x + confirm.width / 2,
    confirm.y + confirm.height / 2,
  );
  await alert.waitFor({ state: 'detached' });
  test(
    'packed real Canvas confirmation closes and restores focus',
    (await activeName()) === 'Packed alert',
  );
  await page.screenshot({ path: `${output}/packed-dialogs.png` });
  await activate('Packed dialog');
  await dialog.waitFor();
  await button('Unmount dialogs').click();
  test(
    'packed unmount releases overlays and records only one explicit confirmation',
    (await page.locator('#dialog-status').textContent()) ===
      'Unmounted; confirmed=1' &&
      (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  test('packed production browser has no runtime errors', errors.length === 0);
  await writeFile(
    `${output}/packed-browser-results.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        checks,
        errors,
        source:
          'local Changesets-versioned core/UI tarballs; not a registry release test',
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
