import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(
  process.env.MENU_SELECT_EVIDENCE_DIR ?? '/tmp/piant-cod168-package',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const errors = [];
const checks = [];
let completed = false;
let failure;
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const combo = () =>
  page.getByRole('combobox', { name: 'Packed selection', exact: true });
const menu = () =>
  page.getByRole('menu', { name: 'Packed actions', exact: true });
const list = () =>
  page.getByRole('listbox', { name: 'Packed selection', exact: true });
const status = () => page.locator('#menu-select-status');
const mouseClick = async (locator) => {
  const rect = await locator.boundingBox();
  assert.ok(
    rect,
    'Packed semantic target must have a real Canvas hit rectangle',
  );
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
};
const waitActive = (role) =>
  page.waitForFunction(
    (role) =>
      document
        .querySelector(`[role="${role}"]`)
        ?.getAttribute('aria-activedescendant'),
    role,
  );
try {
  await page.goto(
    process.env.MENU_SELECT_PACKAGE_URL ??
      'http://127.0.0.1:4188/menuSelect.html',
  );
  await page.locator('#menu-select-status[data-ready="true"]').waitFor();
  test(
    'production Menu and Select factories use controlled initial state',
    (await combo().textContent()) === 'Packed Alpha' &&
      (await status().getAttribute('data-value')) === 'alpha' &&
      (await status().getAttribute('data-failure')) === null,
  );
  await mouseClick(button('Packed menu'));
  await menu().waitFor();
  await waitActive('menu');
  test(
    'production real mouse Menu Trigger enters the named menu container',
    await menu().evaluate((element) => document.activeElement === element),
  );
  await page.screenshot({ path: `${output}/packed-menu.png` });
  await mouseClick(
    page.getByRole('menuitem', { name: 'Packed Rename', exact: true }),
  );
  await menu().waitFor({ state: 'detached' });
  test(
    'production real pointer item executes item and root callbacks once',
    (await status().getAttribute('data-actions')) === '1' &&
      (await status().getAttribute('data-last-action')) === 'rename' &&
      (await status().getAttribute('data-menu-item-events')) === '1',
  );
  await button('Packed menu').focus();
  await page.keyboard.press('ArrowDown');
  await menu().waitFor();
  await waitActive('menu');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await menu().waitFor({ state: 'detached' });
  test(
    'production real keyboard Menu navigation commits one controlled action',
    (await status().getAttribute('data-actions')) === '2' &&
      (await status().getAttribute('data-last-action')) === 'copy' &&
      (await status().getAttribute('data-menu-item-events')) === '2',
  );
  await button('Packed menu').focus();
  await page.keyboard.press('ArrowDown');
  await menu().waitFor();
  await waitActive('menu');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  test(
    'production disabled Menu item remains discoverable without activation',
    (await menu().count()) === 1 &&
      (await status().getAttribute('data-actions')) === '2' &&
      (await page
        .getByRole('menuitem', {
          name: 'Packed unavailable action',
          exact: true,
        })
        .getAttribute('aria-disabled')) === 'true',
  );
  await page.keyboard.press('Escape');
  await menu().waitFor({ state: 'detached' });

  await mouseClick(combo());
  await list().waitFor();
  await waitActive('combobox');
  await mouseClick(
    page.getByRole('option', { name: 'Packed Beta', exact: true }),
  );
  await list().waitFor({ state: 'detached' });
  test(
    'production real pointer Select commits its controlled value once',
    (await combo().textContent()) === 'Packed Beta' &&
      (await status().getAttribute('data-value')) === 'beta' &&
      (await status().getAttribute('data-changes')) === '1' &&
      (await status().getAttribute('data-select-item-events')) === '1',
  );
  await combo().focus();
  await page.keyboard.press('ArrowDown');
  await list().waitFor();
  await waitActive('combobox');
  await page.keyboard.press('End');
  test(
    'production Select previews keep DOM focus and committed value on Trigger',
    await combo().evaluate(
      (element) =>
        document.activeElement === element &&
        element.textContent === 'Packed Beta' &&
        document.getElementById(element.getAttribute('aria-activedescendant'))
          ?.textContent === 'Packed Gamma',
    ),
  );
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  const nodes = ax.nodes.filter((node) => !node.ignored);
  await writeFile(
    `${output}/packed-accessibility.json`,
    JSON.stringify(nodes, null, 2),
  );
  const axCombo = nodes.find(
    (node) =>
      node.role?.value === 'combobox' &&
      node.name?.value === 'Packed selection',
  );
  test(
    'production Chrome AX exposes the Select field name and committed value',
    axCombo?.value?.value === 'Packed Beta',
  );
  test(
    'production Chrome AX exposes named listbox and selected option',
    nodes.some(
      (node) =>
        node.role?.value === 'listbox' &&
        node.name?.value === 'Packed selection',
    ) &&
      nodes.some(
        (node) =>
          node.role?.value === 'option' &&
          node.name?.value === 'Packed Beta' &&
          node.properties?.some(
            (property) =>
              property.name === 'selected' && property.value?.value === true,
          ),
      ),
  );
  await page.screenshot({ path: `${output}/packed-select.png` });
  await page.keyboard.press('Escape');
  await list().waitFor({ state: 'detached' });
  test(
    'production Escape cancels preview without a repeated value callback',
    (await combo().textContent()) === 'Packed Beta' &&
      (await status().getAttribute('data-changes')) === '1',
  );
  await combo().focus();
  await page.keyboard.press('ArrowDown');
  await list().waitFor();
  await waitActive('combobox');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await list().waitFor({ state: 'detached' });
  test(
    'production real keyboard Select commits a new value once',
    (await combo().textContent()) === 'Packed Alpha' &&
      (await status().getAttribute('data-value')) === 'alpha' &&
      (await status().getAttribute('data-changes')) === '2' &&
      (await status().getAttribute('data-select-item-events')) === '2',
  );
  const comboElement = await combo().elementHandle();
  await mouseClick(button('Packed menu'));
  await menu().waitFor();
  const menuElement = await menu().elementHandle();
  await button('Unmount packed choices').click();
  test(
    'production unmount releases open surfaces, Canvas and semantic nodes',
    (await status().getAttribute('data-mounted')) === 'false' &&
      (await page.locator('[data-piant-overlay]').count()) === 0 &&
      (await page.locator('#menu-select-target canvas').count()) === 0 &&
      (await combo().count()) === 0 &&
      (await comboElement.evaluate((element) => !element.isConnected)) &&
      (await menuElement.evaluate((element) => !element.isConnected)),
  );
  await page.waitForTimeout(80);
  test(
    'production browser has no component failures or runtime errors',
    errors.length === 0 &&
      (await status().getAttribute('data-failure')) === null,
  );
  completed = true;
} catch (error) {
  failure = error.stack ?? String(error);
  throw error;
} finally {
  await writeFile(
    `${output}/packed-browser-results.json`,
    JSON.stringify(
      {
        completed,
        browser: browser.version(),
        checks,
        errors,
        failure,
        source:
          'Changesets-versioned local core/UI tarballs, not registry release validation',
        coverage:
          'Chrome pointer, keyboard and AX; excludes OS IME and VoiceOver validation',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
