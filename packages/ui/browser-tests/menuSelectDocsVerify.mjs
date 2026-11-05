import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = process.env.MENU_SELECT_EVIDENCE_DIR ?? '/tmp/piant-cod168';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const checks = [],
  errors = [],
  consoleErrors = [],
  failedResources = [];
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
page.on('console', (message) => {
  if (message.type() === 'error')
    consoleErrors.push({ text: message.text(), location: message.location() });
});
page.on('response', (response) => {
  if (response.status() >= 400)
    failedResources.push({ url: response.url(), status: response.status() });
});
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const activate = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
};
const combo = () =>
  page.getByRole('combobox', { name: '项目可见性', exact: true });
const menu = () => page.getByRole('menu', { name: '项目操作', exact: true });
const activeText = (locator) =>
  locator.evaluate(
    (e) =>
      document.getElementById(e.getAttribute('aria-activedescendant'))
        ?.textContent,
  );
const focusName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const legacyDocsURL = process.env.MENU_SELECT_DOCS_URL;
const menuURL =
  process.env.MENU_DOCS_URL ?? legacyDocsURL ?? 'http://127.0.0.1:5173/ui/menu';
const selectURL =
  process.env.SELECT_DOCS_URL ??
  legacyDocsURL ??
  'http://127.0.0.1:5173/ui/select';
let complete = false;
try {
  await page.goto(menuURL);
  await button('打开项目操作').waitFor();
  await activate('打开项目操作', 'ArrowUp');
  await menu().waitFor();
  check(
    'Menu docs ArrowUp opens with final active item and focuses actual menu',
    (await activeText(menu())) === 'Archive 归档' &&
      (await menu().evaluate((e) => document.activeElement === e)),
  );
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  check(
    'Menu docs disabled item remains discoverable',
    (await activeText(menu())) === 'Export 导出（不可用）',
  );
  await page.keyboard.press('Enter');
  check('Menu docs disabled Enter retains menu', (await menu().count()) === 1);
  await page.keyboard.press('a');
  check(
    'Menu docs typeahead previews Archive',
    (await activeText(menu())) === 'Archive 归档',
  );
  await page.keyboard.press('Enter');
  await menu().waitFor({ state: 'detached' });
  check(
    'Menu docs explicit action closes and restores trigger',
    (await focusName()) === '打开项目操作',
  );
  await activate('打开含 Menu 的 Dialog');
  await button('弹窗内打开 Menu').waitFor();
  await activate('弹窗内打开 Menu');
  await page.getByRole('menu', { name: '弹窗项目操作', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  check(
    'Menu docs nested Escape closes menu and restores in-modal trigger',
    (await focusName()) === '弹窗内打开 Menu' &&
      (await page
        .getByRole('dialog', { name: '弹窗中的项目菜单', exact: true })
        .count()) === 1,
  );
  await page.keyboard.press('Escape');
  check(
    'Menu docs second Escape closes modal and restores outer trigger',
    (await focusName()) === '打开含 Menu 的 Dialog',
  );
  await activate('切换 Menu 主题、密度与字号');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await button('打开项目操作').scrollIntoViewIfNeeded();
  await activate('打开项目操作');
  await menu().waitFor();
  await page.keyboard.press('End');
  await page.waitForTimeout(100);
  check(
    'Menu docs narrow 200% retains current item visibility',
    await menu().evaluate((e) => {
      const a = document.getElementById(
        e.getAttribute('aria-activedescendant'),
      );
      const r = a?.getBoundingClientRect();
      const c = e.getBoundingClientRect();
      return r && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    }),
  );
  check(
    'Menu docs narrow popup fits viewport',
    await page
      .locator('[data-piant-overlay-surface]')
      .last()
      .evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
  );
  await page.screenshot({ path: `${output}/review-menu-narrow-200.png` });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (selectURL !== menuURL) await page.goto(selectURL);
  await combo().waitFor();
  await combo().focus();
  check(
    'Select docs starts with committed Team DOM value',
    (await combo().textContent()) === 'Team 团队',
  );
  await page.keyboard.press('Enter');
  await page
    .getByRole('listbox', { name: '项目可见性', exact: true })
    .waitFor();
  await page.keyboard.press('ArrowDown');
  check(
    'Select docs preview retains committed text and combo focus',
    (await activeText(combo())) === 'Private 私密' &&
      (await combo().textContent()) === 'Team 团队' &&
      (await combo().evaluate((e) => document.activeElement === e)),
  );
  const cdp = await page.context().newCDPSession(page);
  let ax = await cdp.send('Accessibility.getFullAXTree');
  let axCombo = ax.nodes.find(
    (n) =>
      !n.ignored &&
      n.role?.value === 'combobox' &&
      n.name?.value === '项目可见性',
  );
  check(
    'Select docs Chrome AX separates field name from committed value during preview',
    axCombo?.value?.value === 'Team 团队',
  );
  await page.keyboard.press('Enter');
  check(
    'Select docs explicit Enter updates DOM committed value',
    (await combo().textContent()) === 'Private 私密',
  );
  ax = await cdp.send('Accessibility.getFullAXTree');
  axCombo = ax.nodes.find(
    (n) =>
      !n.ignored &&
      n.role?.value === 'combobox' &&
      n.name?.value === '项目可见性',
  );
  check(
    'Select docs Chrome AX exposes committed Private value',
    axCombo?.value?.value === 'Private 私密',
  );
  await writeFile(
    `${output}/review-docs-ax.json`,
    JSON.stringify(
      ax.nodes.filter(
        (n) =>
          !n.ignored &&
          ['combobox', 'option', 'listbox', 'menu', 'menuitem'].includes(
            n.role?.value,
          ),
      ),
      null,
      2,
    ),
  );
  await page
    .getByRole('checkbox', { name: '拒绝 Select 关闭请求', exact: true })
    .focus();
  await page.keyboard.press('Space');
  await combo().focus();
  await page.keyboard.press('Enter');
  const row = page.getByRole('option', { name: 'Public 公开', exact: true });
  await row.waitFor();
  const rect = await row.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  check(
    'Select docs mouse down preserves combo focus',
    await combo().evaluate((e) => document.activeElement === e),
  );
  await page.mouse.up();
  check(
    'Select docs close refusal preserves focus and open list',
    (await combo().evaluate((e) => document.activeElement === e)) &&
      (await page
        .getByRole('listbox', { name: '项目可见性', exact: true })
        .count()) === 1,
  );
  await page.keyboard.press('ArrowUp');
  check(
    'Select docs keyboard navigation continues after pointer close refusal',
    (await activeText(combo())) === 'Private 私密',
  );
  await page
    .getByRole('checkbox', { name: '拒绝 Select 关闭请求', exact: true })
    .focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await activate('切换 Select 主题、密度与字号');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await combo().scrollIntoViewIfNeeded();
  await combo().focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('listbox', { name: '项目可见性', exact: true })
    .waitFor();
  await page.keyboard.press('End');
  await page.waitForTimeout(100);
  check(
    'Select docs narrow 200% keeps trigger focused while revealing final option',
    (await combo().evaluate((e) => document.activeElement === e)) &&
      (await activeText(combo())) === 'Archived 已归档（不可用）',
  );
  check(
    'Select docs narrow current option is visible',
    await combo().evaluate((e) => {
      const a = document.getElementById(
        e.getAttribute('aria-activedescendant'),
      );
      const list = document.getElementById(e.getAttribute('aria-controls'));
      const r = a?.getBoundingClientRect();
      const c = list?.getBoundingClientRect();
      return r && c && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    }),
  );
  await page.screenshot({ path: `${output}/review-select-narrow-200.png` });
  await page.keyboard.press('Enter');
  check(
    'Select docs disabled final item cannot commit at 200%',
    (await page
      .getByRole('listbox', { name: '项目可见性', exact: true })
      .count()) === 1 && (await combo().textContent()) === 'Public 公开',
  );
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  check(
    'Select docs normal commit works at narrow 200%',
    (await combo().textContent()) === 'Team 团队',
  );
  check('no docs page runtime exceptions', errors.length === 0);
  complete = true;
} finally {
  await writeFile(
    `${output}/review-docs-results.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        complete,
        checks,
        errors,
        consoleErrors,
        failedResources,
        limitations: [
          'Chrome AX is not VoiceOver verification',
          'No OS IME candidate-window verification',
          '200% is UIProvider fontScale=2 with narrow viewport; not browser zoom certification',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
