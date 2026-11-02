import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.WORKFLOW_DOCS_EVIDENCE_DIR ?? '/tmp/piant-cod170/docs';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const checks = [],
  errors = [],
  consoleErrors = [];
let completed = false;
page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error')
    consoleErrors.push({ text: m.text(), location: m.location() });
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const input = (name) => page.getByRole('textbox', { name, exact: true });
const key = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
};
try {
  await page.goto(
    process.env.WORKFLOW_DOCS_URL ?? 'http://127.0.0.1:5173/ui/workflow.html',
  );
  await input('示例 背景草稿').waitFor();
  await input('示例 背景草稿').fill('在线背景保留');
  await key('示例 编辑文档');
  await input('示例 文档名称').waitFor();
  check(
    'production online workflow opens native editor with initial focus',
    await input('示例 文档名称').evaluate((e) => document.activeElement === e),
  );
  await input('示例 文档名称').fill('在线验收名称');
  const combo = page.getByRole('combobox', {
    name: '示例 可见性',
    exact: true,
  });
  await combo.focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('listbox', { name: '示例 可见性', exact: true }).waitFor();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check(
    'online Select commits independently inside Dialog',
    (await combo.textContent()) === '私密' &&
      (await page
        .getByRole('dialog', { name: '示例 文档编辑', exact: true })
        .count()) === 1,
  );
  await key('示例 更多操作');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  check(
    'online Menu updates current draft once',
    (await input('示例 文档名称').inputValue()) === '在线验收名称 副本',
  );
  await key('示例 编辑备注');
  await input('示例 备注草稿').fill('在线备注');
  await page.keyboard.press('Escape');
  check(
    'online nested Popover Escape leaves parent editor',
    (await page
      .getByRole('dialog', { name: '示例 备注', exact: true })
      .count()) === 0 &&
      (await page
        .getByRole('dialog', { name: '示例 文档编辑', exact: true })
        .count()) === 1,
  );
  await key('示例 归档文档');
  check(
    'online AlertDialog starts on safe Cancel',
    await button('示例 取消归档').evaluate((e) => document.activeElement === e),
  );
  await page.keyboard.press('Escape');
  await key('示例 保存并关闭');
  await page
    .locator('[role="group"][aria-label="示例 文档已保存"]')
    .waitFor({ state: 'attached' });
  check(
    'online explicit save closes parent and exposes persistent Toast',
    (await page.getByRole('dialog').count()) === 0 &&
      (await input('示例 背景草稿').inputValue()) === '在线背景保留',
  );
  await key('示例 撤销保存: 示例 文档已保存');
  await key('示例 编辑文档');
  check(
    'online Toast undo restores saved editor value',
    (await input('示例 文档名称').inputValue()) === '季度计划',
  );
  await key('示例 取消编辑');
  await key('切换组合场景外观');
  await key('示例 编辑文档');
  const handle = await input('示例 文档名称').elementHandle();
  await handle.evaluate((e) => e.setSelectionRange(0, 2));
  check(
    'online themed workflow retains a working native editor',
    await handle.evaluate(
      (e) =>
        document.activeElement === e &&
        e.selectionStart === 0 &&
        e.selectionEnd === 2,
    ),
  );
  await page.screenshot({ path: `${output}/workflow-online-dark-200.png` });
  await key('示例 取消编辑');
  await key('卸载组合场景');
  check(
    'online scene unmount releases its owned fields and notifications',
    (await page
      .locator('[aria-label="示例 背景草稿"],[aria-label="示例 状态通知"]')
      .count()) === 0,
  );
  await key('重新挂载组合场景');
  await input('示例 背景草稿').waitFor();
  check(
    'online remount restores a fresh scene',
    (await input('示例 背景草稿').inputValue()) === '未修改的背景内容',
  );
  check('no online component runtime exceptions', errors.length === 0);
  check(
    'console errors are limited to the existing docs favicon',
    consoleErrors.every((e) => e.location?.url?.endsWith('/favicon.ico')),
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
        consoleErrors,
        limits: [
          'Production documentation smoke and real keyboard paths; not VoiceOver or OS IME certification.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
