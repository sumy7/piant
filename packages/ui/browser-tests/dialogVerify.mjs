import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(process.env.DIALOG_EVIDENCE_DIR ?? '/tmp/piant-cod166');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const resourceErrors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
page.on('console', (message) => {
  if (
    message.type() === 'error' &&
    !message.text().startsWith('Failed to load resource:')
  )
    errors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() >= 400)
    resourceErrors.push({ url: response.url(), status: response.status() });
});
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const input = (name) => page.getByRole('textbox', { name, exact: true });
const activeName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const wait = () => page.waitForTimeout(100);
const activate = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
};
const invokeWithoutFocus = (name) =>
  page.evaluate((name) => {
    [...document.querySelectorAll('button')]
      .find((e) => e.getAttribute('aria-label') === name)
      .click();
  }, name);
const dialog = () =>
  page.getByRole('dialog', { name: '编辑个人资料', exact: true });
const alert = () =>
  page.getByRole('alertdialog', { name: '确认删除示例项目？', exact: true });
const outside = async () => {
  const rect = await page
    .locator('[data-piant-overlay]')
    .last()
    .locator(':scope > div')
    .first()
    .boundingBox();
  await page.mouse.click(rect.x + 3, rect.y + 3);
};
try {
  await page.goto(
    process.env.DIALOG_TEST_URL ?? 'http://127.0.0.1:5173/ui/dialogs',
  );
  await button('编辑个人资料').waitFor();
  await activate('编辑个人资料', 'Space');
  await dialog().waitFor();
  await input('Dialog 个人名称').waitFor();
  await wait();
  test(
    'Space opens Dialog and initial focus enters native TextField',
    (await activeName()) === 'Dialog 个人名称',
  );
  const dialogCDP = await page.context().newCDPSession(page);
  const dialogAX = await dialogCDP.send('Accessibility.getFullAXTree');
  const dialogNodes = dialogAX.nodes.filter((node) => !node.ignored);
  test(
    'Chrome AX exposes Dialog title description and native input',
    dialogNodes.some(
      (node) =>
        node.role?.value === 'dialog' &&
        node.name?.value === '编辑个人资料' &&
        node.description?.value?.includes('关闭会释放本次草稿'),
    ) &&
      dialogNodes.some(
        (node) =>
          node.role?.value === 'textbox' &&
          node.name?.value === 'Dialog 个人名称',
      ),
  );
  await writeFile(
    `${output}/dialog-accessibility.json`,
    JSON.stringify(dialogNodes, null, 2),
  );
  const original = await input('Dialog 个人名称').elementHandle();
  await input('Dialog 个人名称').fill('中文草稿 abc');
  await input('Dialog 个人名称').evaluate((element) =>
    element.setSelectionRange(1, 4),
  );
  await invokeWithoutFocus('切换 Dialog 主题');
  test(
    'theme update preserves input object focus and selection',
    await original.evaluate(
      (element) =>
        document.activeElement === element &&
        element.selectionStart === 1 &&
        element.selectionEnd === 4,
    ),
  );
  await page.screenshot({ path: `${output}/dialog-dark.png` });
  test(
    'Title and Description reference actual DOM text and instance modality is explicit',
    await dialog().evaluate(
      (element) =>
        element.getAttribute('aria-modal') === 'false' &&
        document.getElementById(element.getAttribute('aria-labelledby'))
          ?.textContent === '编辑个人资料' &&
        Boolean(
          document.getElementById(element.getAttribute('aria-describedby'))
            ?.textContent,
        ),
    ),
  );
  const background = await input('Dialog 背景输入').elementHandle();
  test(
    'background native input cannot receive programmatic focus',
    await background.evaluate((element) => {
      element.focus();
      return document.activeElement !== element;
    }),
  );
  await page.keyboard.press('Enter');
  test(
    'TextField Enter never implicitly saves',
    (await dialog().count()) === 1,
  );
  await activate('保存并关闭');
  await dialog().waitFor({ state: 'detached' });
  test(
    'close restores trigger and destroys native content',
    (await activeName()) === '编辑个人资料' &&
      !(await original.evaluate((element) => element.isConnected)),
  );
  await activate('编辑个人资料');
  await input('Dialog 个人名称').waitFor();
  test(
    'reopening creates a fresh draft',
    (await input('Dialog 个人名称').inputValue()) === '输入中文姓名',
  );
  const names = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    names.push(await activeName());
    test(
      `Tab remains in current Dialog (${i})`,
      await dialog().evaluate((element) =>
        element.contains(document.activeElement),
      ),
    );
  }
  await input('Dialog 个人名称').focus();
  await page.keyboard.press('Shift+Tab');
  test(
    'Shift+Tab wraps from first input to footer action',
    (await activeName()) === '保存并关闭',
  );
  await activate('打开嵌套 Dialog');
  await input('嵌套 Dialog 草稿').waitFor();
  await wait();
  test(
    'nested Dialog enters child content',
    (await activeName()) === '嵌套 Dialog 草稿',
  );
  await page.keyboard.press('Escape');
  await input('嵌套 Dialog 草稿').waitFor({ state: 'detached' });
  test(
    'child Escape restores parent trigger without exposing background',
    (await activeName()) === '打开嵌套 Dialog' &&
      (await dialog().count()) === 1,
  );
  await page
    .getByRole('checkbox', { name: '拒绝关闭请求', exact: true })
    .focus();
  await page.keyboard.press('Space');
  const current = await input('Dialog 个人名称').elementHandle();
  await page.keyboard.press('Escape');
  await wait();
  test(
    'controlled rejected Escape retains same content',
    await current.evaluate((element) => element.isConnected),
  );
  await outside();
  test(
    'controlled rejected outside pointer retains content without background editing',
    (await dialog().count()) === 1 &&
      (await background.evaluate(
        (element) => element.value === '打开弹窗后不能编辑我',
      )),
  );
  await page
    .getByRole('checkbox', { name: '拒绝关闭请求', exact: true })
    .focus();
  await page.keyboard.press('Space');
  await outside();
  await dialog().waitFor({ state: 'detached' });
  test(
    'Dialog outside gesture closes without click through',
    (await activeName()) === '编辑个人资料',
  );
  await activate('编辑个人资料');
  await input('Dialog 个人名称').waitFor();
  await activate('移除 Dialog 触发器');
  test(
    'removing trigger keeps centered content usable',
    (await dialog().count()) === 1,
  );
  await page.keyboard.press('Escape');
  await dialog().waitFor({ state: 'detached' });
  test(
    'removed trigger restores a connected safe instance target',
    await page.evaluate(
      () =>
        document.activeElement !== document.body &&
        document.activeElement.isConnected,
    ),
  );
  await activate('恢复 Dialog 触发器');
  await activate('删除示例项目');
  await alert().waitFor();
  await wait();
  test(
    'AlertDialog initially focuses Cancel rather than Confirm or input',
    (await activeName()) === '取消删除',
  );
  await outside();
  test(
    'AlertDialog blocks outside close and preserves cancel focus',
    (await alert().count()) === 1 && (await activeName()) === '取消删除',
  );
  await activate('确认删除');
  test('preventDefault vetoes action close', (await alert().count()) === 1);
  await input('AlertDialog 删除口令').focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '删除',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Escape');
  test(
    'CDP composition Escape preserves AlertDialog',
    (await alert().count()) === 1,
  );
  await page.keyboard.press('Enter');
  test(
    'composition Enter cannot implicitly confirm',
    (await alert().count()) === 1,
  );
  await cdp.send('Input.insertText', { text: '删除' });
  await wait();
  await input('AlertDialog 删除口令').fill('删除');
  const ax = await cdp.send('Accessibility.getFullAXTree');
  const nodes = ax.nodes.filter((node) => !node.ignored);
  test(
    'Chrome AX exposes alertdialog title and description',
    nodes.some(
      (node) =>
        node.role?.value === 'alertdialog' &&
        node.name?.value === '确认删除示例项目？' &&
        node.description?.value?.includes('此操作仅增加示例计数'),
    ),
  );
  test(
    'Chrome AX excludes blocked background input',
    !nodes.some(
      (node) =>
        node.role?.value === 'textbox' &&
        node.name?.value === 'AlertDialog 背景输入',
    ),
  );
  await writeFile(
    `${output}/accessibility.json`,
    JSON.stringify(nodes, null, 2),
  );
  await page.screenshot({ path: `${output}/alert-dialog.png` });
  await activate('确认删除', 'Space');
  await alert().waitFor({ state: 'detached' });
  test(
    'explicit Space confirmation closes and restores alert trigger',
    (await activeName()) === '删除示例项目',
  );
  await activate('删除示例项目');
  await alert().waitFor();
  await wait();
  await page.keyboard.press('Escape');
  await alert().waitFor({ state: 'detached' });
  // Check status via Canvas semantics is intentionally not inferred: packed fixture
  // below exposes confirmation counts, while component tests assert callbacks.
  test(
    'AlertDialog Escape closes without firing implicit confirmation',
    (await activeName()) === '删除示例项目',
  );
  await page.setViewportSize({ width: 390, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await activate('编辑个人资料');
  await input('Dialog 个人名称').waitFor();
  await wait();
  const closeBox = await button('保存并关闭').boundingBox();
  test(
    'narrow viewport keeps footer action inside visible viewport',
    closeBox.x >= 0 &&
      closeBox.x + closeBox.width <= 390 &&
      closeBox.y + closeBox.height <= 700,
  );
  await page.screenshot({ path: `${output}/dialog-narrow.png` });
  await activate('保存并关闭');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await activate('编辑个人资料');
  await input('Dialog 个人名称').waitFor();
  const beforeUnmount = await input('Dialog 个人名称').elementHandle();
  await page
    .getByRole('button', { name: '重新运行代码', exact: true })
    .nth(0)
    .click();
  await button('编辑个人资料').waitFor();
  test(
    'example teardown removes overlay content and allows clean remount',
    !(await beforeUnmount.evaluate((element) => element.isConnected)) &&
      (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  await page.goto(
    process.env.DIALOG_FIXTURE_URL ?? 'http://127.0.0.1:4177/dialog.html',
  );
  await button('Fixture open').waitFor();
  const canvasClick = async (name) => {
    const rect = await page.locator(`[aria-label="${name}"]`).boundingBox();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  };
  await canvasClick('Fixture open');
  await input('Fixture draft').waitFor();
  await wait();
  test(
    'real Canvas pointer opens Dialog and enters native input',
    (await activeName()) === 'Fixture draft',
  );
  await input('Fixture draft').fill('缩放保持 selection');
  await input('Fixture draft').evaluate((element) =>
    element.setSelectionRange(2, 5),
  );
  const scaled = await input('Fixture draft').elementHandle();
  await page.evaluate(() => {
    window.dialogFixture.setDark(true);
    window.dialogFixture.setCompact(true);
    window.dialogFixture.setScale(2);
    window.dialogFixture.setCopy('Scaled fixture title');
  });
  await wait();
  test(
    '2x font scale compact density and dark theme preserve native selection',
    await scaled.evaluate(
      (element) =>
        document.activeElement === element &&
        element.selectionStart === 2 &&
        element.selectionEnd === 5 &&
        Number.parseFloat(element.style.fontSize) === 28,
    ),
  );
  test(
    'dynamic title update preserves same dialog',
    (await page
      .getByRole('dialog', { name: 'Scaled fixture title', exact: true })
      .count()) === 1,
  );
  await input('Peer input').fill('独立实例仍可编辑');
  await page.keyboard.press('Escape');
  test(
    'foreign instance focus and Escape do not close current dialog',
    (await page.getByRole('dialog').count()) === 1 &&
      (await input('Peer input').inputValue()) === '独立实例仍可编辑',
  );
  await page.evaluate(() => {
    window.dialogFixture.setScale(1);
    window.dialogFixture.setLong(true);
  });
  await wait();
  const scroll = page.getByRole('region', {
    name: 'Scrollable dialog content',
    exact: true,
  });
  await scroll.waitFor();
  await scroll.focus();
  await page.keyboard.press('End');
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Overflow draft"]')
        ?.getAttribute('tabindex') === '0',
  );
  await page.keyboard.press('Tab');
  test(
    'keyboard End scroll exposes clipped body input and Tab reaches it',
    (await activeName()) === 'Overflow draft',
  );
  await input('Overflow draft').fill('键盘到达溢出正文');
  await scroll.focus();
  await page.keyboard.press('Home');
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Fixture draft"]')
        ?.getAttribute('tabindex') === '0',
  );
  await page.keyboard.press('Tab');
  test(
    'keyboard Home restores first body input',
    (await activeName()) === 'Fixture draft',
  );
  const bodyRect = await input('Fixture draft').boundingBox();
  test(
    'native DOM input remains above its canvas at actual hit location',
    await page.evaluate(
      ({ x, y, width, height }) =>
        document
          .elementFromPoint(x + width / 2, y + height / 2)
          ?.getAttribute('aria-label') === 'Fixture draft',
      bodyRect,
    ),
  );
  await page.screenshot({ path: `${output}/dialog-overflow.png` });
  await canvasClick('Fixture save');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  test(
    'real Canvas footer pointer closes dialog',
    (await activeName()) === 'Fixture open',
  );
  await canvasClick('Fixture open');
  await input('Fixture draft').waitFor();
  await canvasClick('Background action');
  await wait();
  test(
    'outside Canvas pointer never activates background through dismissal',
    (await page.evaluate(() => window.dialogFixture.counts()))
      .backgroundPresses === 0 &&
      (await page.getByRole('dialog').count()) === 0,
  );
  await canvasClick('Fixture alert');
  await page.getByRole('alertdialog').waitFor();
  await wait();
  test(
    'Cancel stays initial focus when Confirm precedes it visually',
    (await activeName()) === 'Fixture abort',
  );
  await page.keyboard.press('Escape');
  test(
    'Alert Escape has no business confirmation side effect',
    (await page.evaluate(() => window.dialogFixture.counts())).confirmed === 0,
  );
  await canvasClick('Fixture alert');
  await page.getByRole('alertdialog').waitFor();
  await canvasClick('Fixture confirm');
  test(
    'real Canvas Confirm invokes business action exactly once',
    (await page.evaluate(() => window.dialogFixture.counts())).confirmed === 1,
  );
  await page.evaluate(() => window.dialogFixture.rapid());
  await page.waitForTimeout(400);
  test(
    'rapid async open-close leaves no orphan overlay',
    (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  await canvasClick('Fixture open');
  await input('Fixture draft').waitFor();
  await page.evaluate(() => window.dialogFixture.destroy());
  await wait();
  test(
    'destroying live host releases content and leaves peer usable',
    (await page.locator('[data-piant-overlay]').count()) === 0 &&
      (await input('Peer input').inputValue()) === '独立实例仍可编辑',
  );
  await page.evaluate(async () => {
    window.dialogFixture.setOpen(false);
    await window.dialogFixture.remount();
  });
  await canvasClick('Fixture open');
  await input('Fixture draft').waitFor();
  test(
    'remounted host opens fresh Dialog without stale focus lock',
    (await activeName()) === 'Fixture draft',
  );
  await page.evaluate(() => {
    window.dialogFixture.destroy();
    window.dialogFixture.disposePeer();
  });
  test(
    'all hosts unmount without residual overlay shells',
    (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  if (errors.length) console.error(JSON.stringify(errors, null, 2));
  test('no browser runtime errors', errors.length === 0);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        checks,
        errors,
        resourceErrors,
        tabNames: names,
        limitations: [
          'Chrome only; not cross-browser certification',
          'CDP composition does not test OS candidate windows (COD-179)',
          'AX exposure does not test VoiceOver (COD-180)',
          'instance modality is not document-wide aria-modal=true',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
