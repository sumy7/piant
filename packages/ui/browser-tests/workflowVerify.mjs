import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.WORKFLOW_EVIDENCE_DIR ?? '/tmp/piant-cod170/workflow';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
const checks = [],
  errors = [],
  resources = [];
let completed = false;
page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) resources.push({ url: r.url(), status: r.status() });
});
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const input = (name) => page.getByRole('textbox', { name, exact: true });
const dialog = (name) =>
  page.getByRole('dialog', { name: `${name} 文档编辑`, exact: true });
const wait = (ms = 100) => page.waitForTimeout(ms);
const click = async (locator) => {
  const r = await locator.boundingBox();
  assert.ok(r);
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await wait();
};
const activate = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
  await wait();
};
const snapshot = (name) =>
  page.evaluate(
    (name) =>
      window.overlayWorkflowFixture.info().find((panel) => panel.name === name)
        ?.snapshot,
    name,
  );
const activeName = () =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
const inside = async (name) =>
  input(name).evaluate((e) => {
    const r = e.getBoundingClientRect();
    return (
      document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === e
    );
  });
const url = process.env.WORKFLOW_URL ?? 'http://127.0.0.1:4190/workflow';
try {
  await page.goto(url);
  await input('A 背景草稿').waitFor();
  await input('B 背景草稿').waitFor();
  check(
    'two independent workflow instances initialize',
    (await snapshot('A')).savedName === '季度计划' &&
      (await snapshot('B')).savedName === '季度计划',
  );
  await input('A 背景草稿').fill('A background独立');
  await input('B 背景草稿').fill('B background独立');
  await click(button('A 编辑文档'));
  await input('A 文档名称').waitFor();
  check(
    'real Canvas Dialog trigger enters native document field',
    (await activeName()) === 'A 文档名称' && (await inside('A 文档名称')),
  );
  check(
    'instance modal semantics are named without claiming document-wide modality',
    (await dialog('A').getAttribute('aria-modal')) === 'false',
  );
  await input('A 文档名称').fill('季度计划 中文🙂');
  await input('A 文档名称').evaluate((e) => e.setSelectionRange(1, 4));
  let editor = await input('A 文档名称').elementHandle();
  await click(button('暗色 A'));
  await click(button('紧凑 A'));
  await click(button('字号 200% A'));
  check(
    'combined theme density and200% preserve native field identity focus selection',
    await editor.evaluate(
      (e) =>
        e.isConnected &&
        document.activeElement === e &&
        e.selectionStart === 1 &&
        e.selectionEnd === 4 &&
        e.value === '季度计划 中文🙂',
    ),
  );
  await page.screenshot({ path: `${output}/dialog-dark-200.png` });
  await click(button('字号 200% A'));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '中文',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Escape');
  check(
    'CDP composition Escape does not dismiss or submit parent Dialog',
    (await dialog('A').count()) === 1 && (await snapshot('A')).saves === 0,
  );
  await cdp.send('Input.insertText', { text: '中文' });
  await input('A 文档名称').fill('季度计划 中文🙂');
  await page.keyboard.press('Enter');
  check(
    'native field Enter has no implicit save action',
    (await snapshot('A')).saves === 0 && (await dialog('A').count()) === 1,
  );
  await input('B 背景草稿').fill('B while A modal');
  check(
    'foreign native editing remains independent while A is modal',
    (await snapshot('B')).background === 'B while A modal' &&
      (await snapshot('A')).draftName === '季度计划 中文🙂' &&
      (await dialog('A').count()) === 1,
  );
  const canvas = page.locator('[data-instance="A"] canvas').first();
  const rootRect = await canvas.boundingBox();
  await page.mouse.click(rootRect.x + 2, rootRect.y + 2);
  await wait();
  check(
    'Dialog backdrop cancellation consumes gesture without changing background or saving',
    (await dialog('A').count()) === 0 &&
      (await snapshot('A')).background === 'A background独立' &&
      (await snapshot('A')).saves === 0,
  );
  check(
    'backdrop cancellation releases its unsaved native editor',
    await editor.evaluate((e) => !e.isConnected),
  );
  await activate('A 编辑文档');
  await input('A 文档名称').fill('季度计划 中文🙂');
  editor = await input('A 文档名称').elementHandle();
  await activate('A 更多操作');
  const menu = page.getByRole('menu', { name: 'A 文档操作', exact: true });
  await menu.waitFor();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  check(
    'nested Menu disabled action cannot execute or close',
    (await snapshot('A')).menuActions === 0 &&
      (await menu.count()) === 1 &&
      (await dialog('A').count()) === 1,
  );
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await wait();
  check(
    'nested Menu commits once restores trigger and preserves parent',
    (await snapshot('A')).menuActions === 1 &&
      (await menu.count()) === 0 &&
      (await dialog('A').count()) === 1 &&
      (await activeName()) === 'A 更多操作',
  );
  const expectedName = '季度计划 中文🙂 副本';
  check(
    'menu action updates the same native editor',
    await editor.evaluate(
      (e, name) => e.isConnected && e.value === name,
      expectedName,
    ),
  );
  const combo = page.getByRole('combobox', { name: 'A 可见性', exact: true });
  await combo.focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('listbox', { name: 'A 可见性', exact: true }).waitFor();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  check(
    'nested Select disabled option does not commit',
    (await snapshot('A')).visibility === 'team' &&
      (await page.getByRole('listbox').count()) === 1,
  );
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await wait();
  check(
    'nested Select explicit commit restores combobox without closing Dialog',
    (await snapshot('A')).visibility === 'public' &&
      (await combo.textContent()) === '公开' &&
      (await activeName()) === 'A 可见性' &&
      (await dialog('A').count()) === 1,
  );
  await activate('A 编辑备注');
  await input('A 备注草稿').waitFor();
  await input('A 备注草稿').fill('Popover note中文');
  check(
    'Popover native input sits above its Canvas and parent surface',
    (await inside('A 备注草稿')) && (await activeName()) === 'A 备注草稿',
  );
  await page.keyboard.press('Escape');
  await wait();
  check(
    'first Escape dismisses only nested Popover',
    (await page
      .getByRole('dialog', { name: 'A 备注', exact: true })
      .count()) === 0 &&
      (await dialog('A').count()) === 1 &&
      (await activeName()) === 'A 编辑备注',
  );
  await button('A 帮助').focus();
  await page.getByRole('tooltip').waitFor();
  await page.keyboard.press('Escape');
  await wait();
  check(
    'Tooltip Escape respects parent Dialog and returns no extra focus',
    (await page.getByRole('tooltip').count()) === 0 &&
      (await dialog('A').count()) === 1 &&
      (await activeName()) === 'A 帮助',
  );
  await activate('A 保存并关闭');
  await page
    .locator('[role="group"][aria-label="A 文档已保存"]')
    .waitFor({ state: 'attached' });
  await wait();
  check(
    'explicit save closes editor creates persistent notification and restores trigger',
    (await snapshot('A')).savedName === expectedName &&
      (await snapshot('A')).saves === 1 &&
      (await dialog('A').count()) === 0 &&
      (await activeName()) === 'A 编辑文档',
  );
  check(
    'saved visibility and B state remain independent',
    (await snapshot('A')).visibility === 'public' &&
      (await snapshot('B')).saves === 0,
  );
  await click(button('A 撤销保存: A 文档已保存'));
  check(
    'Toast action explicitly undoes exactly once',
    (await snapshot('A')).savedName === '季度计划' &&
      (await snapshot('A')).visibility === 'team' &&
      (await snapshot('A')).undoCount === 1 &&
      (await page
        .locator('[role="group"][aria-label="A 文档已保存"]')
        .count()) === 0,
  );
  await activate('A 编辑文档');
  await input('A 文档名称').fill('must cancel');
  await activate('A 归档文档');
  await page
    .getByRole('alertdialog', { name: 'A 确认归档', exact: true })
    .waitFor();
  check(
    'nested confirmation starts on safe Cancel and blocks parent input',
    (await activeName()) === 'A 取消归档' &&
      (await page
        .locator('[aria-label="A 文档名称"]')
        .evaluate((e) => Boolean(e.closest('[inert]')))),
  );
  await page.keyboard.press('Escape');
  await wait();
  check(
    'Alert Escape cancels without business action or parent dismissal',
    (await snapshot('A')).archives === 0 &&
      (await page.getByRole('alertdialog').count()) === 0 &&
      (await dialog('A').count()) === 1,
  );
  await activate('A 取消编辑');
  await activate('A 编辑文档');
  check(
    'cancellation restores unsaved native document fields',
    (await input('A 文档名称').inputValue()) === '季度计划',
  );
  await activate('A 归档文档');
  await page.getByRole('alertdialog').waitFor();
  await click(button('A 确认归档'));
  await wait();
  check(
    'real pointer confirm archives exactly once and closes both nested owners',
    (await snapshot('A')).archives === 1 &&
      (await page.getByRole('alertdialog').count()) === 0 &&
      (await dialog('A').count()) === 0 &&
      (await page
        .locator('[role="group"][aria-label="A 文档已归档"]')
        .count()) === 1,
  );
  await activate('A 编辑文档');
  await activate('B 编辑文档');
  await input('B 文档名称').fill('B 独立编辑');
  check(
    'two simultaneous instance Dialogs retain independent values',
    (await dialog('A').count()) === 1 &&
      (await dialog('B').count()) === 1 &&
      (await snapshot('B')).draftName === 'B 独立编辑' &&
      (await snapshot('A')).draftName === '季度计划',
  );
  await page.screenshot({ path: `${output}/two-instance-dialogs.png` });
  await activate('B 取消编辑');
  check(
    'closing B does not dismiss A',
    (await dialog('B').count()) === 0 && (await dialog('A').count()) === 1,
  );
  await input('A 文档名称').focus();
  await input('A 文档名称').evaluate((e) => e.setSelectionRange(0, 2));
  await click(button('CSS 缩放 A'));
  await wait();
  check(
    'CSS-scaled instance keeps native input hit coordinates and selection',
    (await inside('A 文档名称')) &&
      (await input('A 文档名称').evaluate(
        (e) =>
          document.activeElement === e &&
          e.selectionStart === 0 &&
          e.selectionEnd === 2,
      )),
  );
  await page.evaluate(() => window.scrollBy(0, 120));
  await wait();
  check(
    'document scrolling keeps overlay/native-input hit geometry aligned',
    await inside('A 文档名称'),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await click(button('CSS 缩放 A'));
  await page.setViewportSize({ width: 390, height: 1100 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait();
  // Comfortable spacing makes this small viewport actually overflow; compact
  // spacing can fit the same controls and correctly omit the scroll stop.
  await click(button('紧凑 A'));
  await click(button('窄容器 A'));
  await click(button('字号 200% A'));
  await wait();
  check(
    'narrow viewport and font changes preserve the open editor',
    (await dialog('A').count()) === 1,
  );
  const scroll = page.getByRole('region', {
    name: 'A 编辑区滚动',
    exact: true,
  });
  await writeFile(
    `${output}/narrow-state.json`,
    JSON.stringify(
      await page.evaluate(() => ({
        width: innerWidth,
        info: window.overlayWorkflowFixture.info(),
        regions: [...document.querySelectorAll('[role="region"]')].map((e) => ({
          name: e.getAttribute('aria-label'),
          hidden: e.hidden,
          inert: e.inert,
          rect: e.getBoundingClientRect().toJSON(),
        })),
      })),
      null,
      2,
    ),
  );
  await scroll.focus();
  await page.keyboard.press('End');
  await wait();
  await page.keyboard.press('Shift+Tab');
  check(
    'overflow scroll stop keeps footer save in logical reverse Tab order',
    (await activeName()) === 'A 保存并关闭',
  );
  await page.keyboard.press('Shift+Tab');
  check(
    'footer cancel precedes the final body control in reverse Tab order',
    (await activeName()) === 'A 取消编辑',
  );
  await page.keyboard.press('Shift+Tab');
  check(
    'narrow200% keyboard scroll reaches the final editor control',
    (await activeName()) === 'A 归档文档',
  );
  await page.keyboard.press('Enter');
  await page.getByRole('alertdialog').waitFor();
  check(
    'narrow nested confirmation retains safe initial focus',
    (await activeName()) === 'A 取消归档',
  );
  await page.screenshot({ path: `${output}/narrow-200-nested.png` });
  const ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(
    `${output}/combined-accessibility.json`,
    JSON.stringify(ax, null, 2),
  );
  check(
    'Chrome AX exposes named confirmation and safe action',
    ax.nodes.some(
      (n) =>
        !n.ignored &&
        n.role?.value === 'alertdialog' &&
        n.name?.value === 'A 确认归档',
    ) &&
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === 'button' &&
          n.name?.value === 'A 取消归档',
      ),
  );
  await page.keyboard.press('Escape');
  await activate('A 取消编辑');
  await click(button('字号 200% A'));
  await click(button('窄容器 A'));
  await page.setViewportSize({ width: 1500, height: 1200 });
  await page.evaluate(() => window.scrollTo(0, 0));
  for (let cycle = 0; cycle < 4; cycle++) {
    await activate('A 编辑文档');
    const tipButton = button('A 帮助');
    const r = await tipButton.boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.getByRole('tooltip').waitFor();
    const field = await input('A 文档名称').elementHandle();
    const before = await snapshot('A');
    await page.evaluate(() => window.overlayWorkflowFixture.stop(0));
    await field.evaluate((e) => {
      e.value = 'stale';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait();
    check(
      `live modal/Tooltip teardown cycle${cycle + 1} releases owned DOM and ignores stale editing`,
      (await dialog('A').count()) === 0 &&
        (await page.getByRole('tooltip').count()) === 0 &&
        (await page
          .locator('[data-instance="A"] canvas,[data-instance="A"] input')
          .count()) === 0 &&
        JSON.stringify(await snapshot('A')) === JSON.stringify(before),
    );
    await input('B 背景草稿').fill(`B survives${cycle}`);
    await page.evaluate(() => window.overlayWorkflowFixture.start(0));
    await input('A 背景草稿').waitFor();
    check(
      `fresh workflow cycle${cycle + 1} starts independent clean state`,
      (await snapshot('A')).saves === 0 &&
        (await snapshot('A')).archives === 0 &&
        (await snapshot('B')).background === `B survives${cycle}`,
    );
  }
  await page
    .getByRole('button', { name: '卸载全部工作区', exact: true })
    .click();
  await wait();
  check(
    'all combined hosts release Canvas input semantics and overlays',
    (await page.locator('canvas,input,[data-piant-overlay]').count()) === 0,
  );
  check('no component runtime or console errors', errors.length === 0);
  check('all production resources succeed', resources.length === 0);
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
        url,
        checks,
        errors,
        resources,
        limits: [
          'CDP composition and Chrome AX do not validate actual OS IME candidate windows or VoiceOver (COD-179/180).',
          'Two independent instance modals deliberately do not claim document-wide aria-modal=true.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
