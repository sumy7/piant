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
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const resources = [];
const checks = [];
let completed = false;
const observe = (page) => {
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
      resources.push({ url: response.url(), status: response.status() });
  });
};
observe(page);
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const input = (name) => page.getByRole('textbox', { name, exact: true });
const activeName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const wait = (ms = 100) => page.waitForTimeout(ms);
const activate = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
};
const canvasClick = async (name) => {
  const rect = await page.locator(`[aria-label="${name}"]`).boundingBox();
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
};
const hover = async (name) => {
  await button(name).scrollIntoViewIfNeeded();
  const rect = await button(name).boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
};
const invoke = (name) =>
  page.evaluate(
    (name) =>
      [...document.querySelectorAll('button')]
        .find((element) => element.getAttribute('aria-label') === name)
        .click(),
    name,
  );
const popover = () =>
  page.getByRole('dialog', { name: '编辑项目备注', exact: true });
const tooltip = () => page.getByRole('tooltip');
const fixtureURL =
  process.env.FLOATING_FIXTURE_URL ??
  'http://127.0.0.1:4177/popoverTooltip.html';
const legacyDocsURL = process.env.FLOATING_DOCS_URL;
const popoverURL =
  process.env.POPOVER_DOCS_URL ??
  legacyDocsURL ??
  'http://127.0.0.1:5173/ui/popover';
const tooltipURL =
  process.env.TOOLTIP_DOCS_URL ??
  legacyDocsURL ??
  'http://127.0.0.1:5173/ui/tooltip';
try {
  await page.goto(popoverURL);
  await button('编辑 Popover 备注').waitFor();
  await canvasClick('编辑 Popover 备注');
  await input('Popover 备注草稿').waitFor();
  await wait();
  test(
    'real Canvas Popover click enters native input',
    (await activeName()) === 'Popover 备注草稿',
  );
  test(
    'Popover exposes a named nonmodal dialog',
    (await popover().getAttribute('aria-modal')) === 'false',
  );
  await canvasClick('编辑 Popover 备注');
  await wait();
  test(
    'second real Trigger click closes without pointerdown reopening',
    (await popover().count()) === 0,
  );
  await activate('编辑 Popover 备注', 'Space');
  await input('Popover 备注草稿').waitFor();
  const draft = await input('Popover 备注草稿').elementHandle();
  await input('Popover 备注草稿').fill('中文备注 selection');
  await input('Popover 备注草稿').evaluate((element) =>
    element.setSelectionRange(1, 4),
  );
  await invoke('切换 Popover 主题');
  test(
    'theme update preserves Popover input object focus and selection',
    await draft.evaluate(
      (element) =>
        document.activeElement === element &&
        element.selectionStart === 1 &&
        element.selectionEnd === 4,
    ),
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '中文',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Escape');
  test(
    'CDP composition Escape does not close Popover',
    (await popover().count()) === 1,
  );
  await cdp.send('Input.insertText', { text: '中文' });
  await wait();
  await page.keyboard.press('Enter');
  test(
    'input Enter does not implicitly close Popover',
    (await popover().count()) === 1,
  );
  await page.screenshot({ path: `${output}/popover-dark.png` });
  const popupAX = await cdp.send('Accessibility.getFullAXTree');
  test(
    'Chrome AX exposes Popover dialog and its native input',
    popupAX.nodes.some(
      (node) =>
        !node.ignored &&
        node.role?.value === 'dialog' &&
        node.name?.value === '编辑项目备注',
    ) &&
      popupAX.nodes.some(
        (node) =>
          !node.ignored &&
          node.role?.value === 'textbox' &&
          node.name?.value === 'Popover 备注草稿',
      ),
  );
  await writeFile(
    `${output}/popover-accessibility.json`,
    JSON.stringify(popupAX, null, 2),
  );
  await input('Popover 备注草稿').focus();
  await page.keyboard.press('Shift+Tab');
  test(
    'Shift+Tab leaves Popover for its Trigger and releases content',
    (await popover().count()) === 0 &&
      (await activeName()) === '编辑 Popover 备注' &&
      !(await draft.evaluate((element) => element.isConnected)),
  );
  await activate('编辑 Popover 备注');
  await input('Popover 备注草稿').waitFor();
  await button('完成 Popover 编辑').focus();
  await page.keyboard.press('Tab');
  test(
    'forward Tab leaves for the logical control after Trigger',
    (await popover().count()) === 0 &&
      (await activeName()) === 'Popover 后续背景操作',
  );
  await activate('编辑 Popover 备注');
  await input('Popover 备注草稿').waitFor();
  await canvasClick('Popover 背景输入');
  test(
    'outside click closes and keeps the requested background input focus',
    (await popover().count()) === 0 &&
      (await activeName()) === 'Popover 背景输入',
  );
  await activate('编辑 Popover 备注');
  await input('Popover 备注草稿').waitFor();
  const rejected = await input('Popover 备注草稿').elementHandle();
  const checkbox = page.getByRole('checkbox', {
    name: '拒绝 Popover 关闭请求',
    exact: true,
  });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  test(
    'controlled rejected Escape retains content identity',
    await rejected.evaluate((element) => element.isConnected),
  );
  await checkbox.focus();
  await page.keyboard.press('Space');
  await activate('打开嵌套 Popover');
  await input('嵌套 Popover 草稿').waitFor();
  await wait();
  test(
    'nested Popover enters child input',
    (await activeName()) === '嵌套 Popover 草稿',
  );
  await page.keyboard.press('Escape');
  test(
    'nested Escape closes only child and restores parent Trigger',
    (await page
      .getByRole('dialog', { name: '嵌套备注帮助', exact: true })
      .count()) === 0 &&
      (await popover().count()) === 1 &&
      (await activeName()) === '打开嵌套 Popover',
  );
  await activate('移除 Popover 触发器');
  await wait();
  test(
    'removed Popover Trigger releases anchored surface safely',
    (await popover().count()) === 0 &&
      (await page.evaluate(
        () =>
          document.activeElement !== document.body &&
          document.activeElement.isConnected,
      )),
  );
  await activate('恢复 Popover 触发器');

  if (tooltipURL !== popoverURL) await page.goto(tooltipURL);
  await button('保存带提示的草稿').scrollIntoViewIfNeeded();
  await page.mouse.move(1250, 800);
  await page.evaluate(() => {
    document.activeElement?.blur();
    document.body.tabIndex = -1;
    document.body.focus();
  });
  await hover('保存带提示的草稿');
  await wait(200);
  test('hover Tooltip respects opening delay', (await tooltip().count()) === 0);
  await tooltip().waitFor();
  await wait();
  test(
    'hover Tooltip never moves body focus',
    await page.evaluate(() => document.activeElement === document.body),
  );
  const tipId = await tooltip().getAttribute('id');
  test(
    'Tooltip describes Trigger without popup or expansion semantics',
    (await button('保存带提示的草稿').getAttribute('aria-describedby')) ===
      tipId &&
      (await button('保存带提示的草稿').getAttribute('aria-haspopup')) ===
        null &&
      (await button('保存带提示的草稿').getAttribute('aria-expanded')) === null,
  );
  const tipRect = await tooltip().boundingBox();
  await page.mouse.move(
    tipRect.x + tipRect.width / 2,
    tipRect.y + tipRect.height / 2,
    { steps: 3 },
  );
  await wait(650);
  test(
    'pointer crosses gap and remains over Tooltip without a reading timeout',
    (await tooltip().count()) === 1,
  );
  await page.keyboard.press('Escape');
  await wait(650);
  test(
    'Escape dismisses body-focus hover and suppresses stale reopening',
    (await tooltip().count()) === 0,
  );
  await page.mouse.move(1250, 800);
  await hover('保存带提示的草稿');
  await tooltip().waitFor();
  await page.mouse.move(1250, 800);
  await wait(60);
  test('exit grace retains Tooltip briefly', (await tooltip().count()) === 1);
  await wait(250);
  test(
    'leaving both regions closes Tooltip and removes only its description link',
    (await tooltip().count()) === 0 &&
      (await button('保存带提示的草稿').getAttribute('aria-describedby')) ===
        null,
  );
  await button('保存带提示的草稿').focus();
  await tooltip().waitFor({ timeout: 400 });
  test(
    'keyboard focus shows Tooltip without hover delay and stays on Trigger',
    (await activeName()) === '保存带提示的草稿',
  );
  const shortHeight = (await tooltip().boundingBox()).height;
  await invoke('使用较长 Tooltip');
  await invoke('切换 Tooltip 主题');
  await wait();
  test(
    'reactive longer content resizes Tooltip and preserves description and focus',
    (await tooltip().boundingBox()).height > shortHeight &&
      (await activeName()) === '保存带提示的草稿' &&
      (await button('保存带提示的草稿').getAttribute('aria-describedby')) ===
        tipId,
  );
  const tipAX = await cdp.send('Accessibility.getFullAXTree');
  test(
    'Chrome AX exposes Tooltip and actual Button description',
    tipAX.nodes.some(
      (node) => !node.ignored && node.role?.value === 'tooltip',
    ) &&
      tipAX.nodes.some(
        (node) =>
          !node.ignored &&
          node.role?.value === 'button' &&
          node.name?.value === '保存带提示的草稿' &&
          node.description?.value?.includes('保存当前草稿'),
      ),
  );
  await writeFile(
    `${output}/tooltip-accessibility.json`,
    JSON.stringify(tipAX, null, 2),
  );
  await page.screenshot({ path: `${output}/tooltip-dark-long.png` });
  await page.keyboard.press('Escape');
  await wait(650);
  test(
    'focus Tooltip Escape does not reopen during same focus session',
    (await tooltip().count()) === 0 &&
      (await activeName()) === '保存带提示的草稿',
  );
  await page
    .getByRole('button', { name: '重新运行代码', exact: true })
    .last()
    .click();
  await button('保存带提示的草稿').waitFor();
  test(
    'online Tooltip rerun removes old descriptive surfaces',
    (await tooltip().count()) === 0,
  );

  await page.goto(fixtureURL);
  await button('Fixture popover').waitFor();
  await canvasClick('Fixture popover');
  await input('Fixture popover draft').waitFor();
  await wait();
  const panel = page.getByRole('dialog', {
    name: 'Fixture editor',
    exact: true,
  });
  const originalPanel = await panel.boundingBox();
  await page.locator('#fixture-scroll').evaluate((element) => {
    element.scrollLeft = 60;
    element.scrollTop = 20;
  });
  await wait(180);
  const scrolledPanel = await panel.boundingBox();
  test(
    'anchored Popover tracks both axes of Canvas ancestor scroll',
    Math.abs(scrolledPanel.x - originalPanel.x + 60) < 2 &&
      Math.abs(scrolledPanel.y - originalPanel.y + 20) < 2,
  );
  await page.evaluate(() => window.popupFixture.move(120, 90));
  await wait(100);
  await page.evaluate(() => window.popupFixture.scaleCanvas(0.8));
  await wait(180);
  let anchor = await button('Fixture popover').boundingBox();
  let positioned = await panel.boundingBox();
  test(
    'CSS Canvas scaling keeps overlay CSS size and anchor position correct',
    Math.abs(positioned.width - 320) < 2 &&
      Math.abs(positioned.x - anchor.x) < 2,
  );
  await page.evaluate(() => window.popupFixture.scaleTrigger(1.3));
  await wait(180);
  anchor = await button('Fixture popover').boundingBox();
  positioned = await panel.boundingBox();
  test(
    'Pixi Trigger scaling updates viewport gap without scaling Popover content',
    Math.abs(positioned.width - 320) < 2 &&
      Math.abs(positioned.y - anchor.y - anchor.height - 4) < 2,
  );
  await input('Fixture popover draft').focus();
  await input('Fixture popover draft').fill('font scale selection');
  await input('Fixture popover draft').evaluate((element) =>
    element.setSelectionRange(1, 4),
  );
  const scaledInput = await input('Fixture popover draft').elementHandle();
  await page.evaluate(() => {
    window.popupFixture.setScale(2);
    window.popupFixture.setCompact(true);
    window.popupFixture.setDark(true);
  });
  await wait(120);
  test(
    '2x font scale compact density and dark mode preserve Popover input focus and selection',
    await scaledInput.evaluate(
      (element) =>
        document.activeElement === element &&
        element.selectionStart === 1 &&
        element.selectionEnd === 4 &&
        Number.parseFloat(element.style.fontSize) === 28,
    ),
  );
  await button('Nested help').focus();
  await tooltip().waitFor();
  await wait(80);
  test(
    'Tooltip measures text height under 2x theme font scaling',
    (await tooltip().boundingBox()).height > 40,
  );
  await page.screenshot({ path: `${output}/floating-font-scale.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.popupFixture.setScale(1);
    window.popupFixture.setCompact(false);
    window.popupFixture.setDark(false);
  });
  await page.evaluate(() => {
    window.popupFixture.scaleCanvas(1);
    window.popupFixture.scaleTrigger(1);
    window.popupFixture.move(450, 280);
  });
  await page.setViewportSize({ width: 600, height: 430 });
  await wait(220);
  positioned = await panel.boundingBox();
  test(
    'viewport-edge Popover flips or shifts inside padded visible viewport',
    positioned.x >= 7 &&
      positioned.y >= 7 &&
      positioned.x + positioned.width <= 593 &&
      positioned.y + positioned.height <= 423,
  );
  await page.screenshot({ path: `${output}/popover-edge.png` });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.locator('#fixture-scroll').evaluate((element) => {
    element.scrollLeft = 0;
    element.scrollTop = 0;
  });
  await page.evaluate(() => window.popupFixture.move(280, 100));
  await wait(150);
  await input('Fixture popover draft').focus();
  await button('Nested help').focus();
  await tooltip().waitFor();
  await canvasClick('Fixture background');
  await wait();
  test(
    'descriptive Tooltip never shields parent Popover background dismissal',
    (await panel.count()) === 0 &&
      (await tooltip().count()) === 0 &&
      (await activeName()) === 'Fixture background',
  );
  await activate('Fixture dialog');
  await input('Fixture modal draft').waitFor();
  await button('Modal help').focus();
  await tooltip().waitFor();
  await page
    .locator('[aria-label="Raw background focus probe"]')
    .evaluate((element) => element.focus());
  await wait(30);
  test(
    'modal focus recovery skips descriptive Tooltip surface',
    (await activeName()) === 'Fixture modal draft' &&
      (await tooltip().getAttribute('tabindex')) === null,
  );
  await page.keyboard.press('Escape');
  test(
    'first Escape closes modal help only',
    (await tooltip().count()) === 0 &&
      (await page
        .getByRole('dialog', { name: 'Fixture modal', exact: true })
        .count()) === 1,
  );
  await activate('Modal popover');
  await input('Modal popover draft').waitFor();
  await button('Modal popover close').focus();
  await page.keyboard.press('Tab');
  test(
    'Popover Tab exits within an existing modal without exposing background',
    (await page
      .getByRole('dialog', { name: 'Modal popover editor', exact: true })
      .count()) === 0 && (await activeName()) === 'Fixture dialog close',
  );
  await activate('Fixture dialog close');
  await activate('Peer dialog');
  await input('Peer modal draft').waitFor();
  await hover('Fixture tooltip');
  await tooltip().waitFor();
  await page.keyboard.press('Escape');
  test(
    'hover Escape works with foreign modal focus without stealing its event',
    (await tooltip().count()) === 0 &&
      (await page
        .getByRole('dialog', { name: 'Peer modal', exact: true })
        .count()) === 0,
  );
  await page.mouse.move(1200, 800);
  await hover('Fixture tooltip');
  await page.evaluate(() => window.popupFixture.setTipShown(false));
  await wait(200);
  test(
    'removing a Tooltip Trigger cancels pending opening timer',
    (await tooltip().count()) === 0,
  );
  await page.evaluate(() => window.popupFixture.setTipShown(true));
  await activate('Fixture popover');
  await input('Fixture popover draft').waitFor();
  await page.evaluate(() => {
    window.popupFixture.setReject(true);
    window.popupFixture.setShown(false);
  });
  await wait();
  test(
    'controlled rejected anchor removal still releases visual Popover',
    (await panel.count()) === 0 &&
      (await page.evaluate(() => window.popupFixture.counts())).open === true,
  );
  await page.evaluate(() => {
    window.popupFixture.setReject(false);
    window.popupFixture.setOpen(false);
    window.popupFixture.setShown(true);
  });
  await page.evaluate(() => window.popupFixture.rapid());
  await wait(350);
  test(
    'rapid asynchronous Popover toggles leave no stale mounts',
    (await page.locator('[data-piant-overlay]').count()) === 0,
  );
  for (let i = 0; i < 3; i++) {
    await activate('Fixture dialog');
    await input('Fixture modal draft').waitFor();
    await button('Modal help').focus();
    await tooltip().waitFor();
    await page.evaluate(() => {
      document
        .querySelector('[aria-label="Raw background focus probe"]')
        .focus();
      window.popupFixture.destroy();
    });
    await wait(50);
    await page.evaluate(() => window.popupFixture.remount());
    await button('Fixture dialog').waitFor();
    test(
      `owner teardown and remount release simultaneously open modal and Tooltip (${i})`,
      (await page.locator('[data-piant-overlay]').count()) === 0,
    );
  }
  await page.evaluate(() => {
    window.popupFixture.destroy();
    window.popupFixture.disposePeer();
  });
  const touchPage = await browser.newPage({
    viewport: { width: 1200, height: 900 },
    hasTouch: true,
  });
  observe(touchPage);
  await touchPage.goto(fixtureURL);
  const touchTrigger = touchPage.getByRole('button', {
    name: 'Fixture tooltip',
    exact: true,
  });
  await touchTrigger.waitFor();
  const touchRect = await touchTrigger.boundingBox();
  await touchPage.touchscreen.tap(
    touchRect.x + touchRect.width / 2,
    touchRect.y + touchRect.height / 2,
  );
  await touchPage.waitForTimeout(250);
  test(
    'real touch pointer does not open Tooltip or prevent ordinary Button action',
    (await touchPage.getByRole('tooltip').count()) === 0 &&
      (await touchPage.evaluate(() => window.popupFixture.counts())).presses ===
        1,
  );
  await touchPage.evaluate(() => {
    window.popupFixture.destroy();
    window.popupFixture.disposePeer();
  });
  await touchPage.close();
  if (errors.length) console.error(JSON.stringify(errors, null, 2));
  test('no browser runtime errors', errors.length === 0);
  completed = true;
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
        limitations: [
          'Chrome only',
          'CDP composition does not validate OS candidate windows (COD-179)',
          'AX tree does not validate VoiceOver reading/navigation (COD-180)',
          'Tooltip timing/touch policies are product choices',
          'Popover is nonmodal and instance-scoped',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
