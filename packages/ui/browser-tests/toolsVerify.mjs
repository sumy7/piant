import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = process.env.TOOLS_EVIDENCE_DIR ?? '/tmp/piant-cod171/browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1500, height: 1100 },
  hasTouch: true,
});
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
const named = (name) => page.locator(`[aria-label="${name}"]`);
const pause = () => page.waitForTimeout(100);
const info = (index = 0) =>
  page.evaluate((n) => window.toolFixture.info()[n], index);
const command = (key, ...args) =>
  page.evaluate(({ key, args }) => window.toolFixture[key](...args), {
    key,
    args,
  });
const activate = async (name) => {
  await named(name).focus();
  await page.keyboard.press('Enter');
  await pause();
};
const pointer = async (locator) => {
  const r = await locator.boundingBox();
  assert.ok(r);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
};
const click = async (name) => {
  const p = await pointer(named(name));
  await page.mouse.click(p.x, p.y);
  await pause();
};
try {
  await page.goto(process.env.TOOLS_URL ?? 'http://127.0.0.1:4177/tools.html');
  const search = named('A 搜索图层'),
    number = named('A 缩放'),
    combo = page.getByRole('combobox', { name: 'A 输出预设', exact: true }),
    separator = named('A 调整分栏');
  await search.waitFor();
  await named('B 搜索图层').waitFor();
  check(
    'two independent tool panels initialize',
    (await info()).amount === 1 && (await info(1)).size === 220,
  );
  await search.fill('中文');
  await page.keyboard.press('Enter');
  check(
    'search edits immediately and commits only explicitly',
    (await info()).query === '中文' && (await info()).searches === 1,
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '拼音',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  check(
    'CDP Chinese composition does not submit or clear search',
    (await info()).searches === 1 &&
      (await search.inputValue()).includes('拼音'),
  );
  await cdp.send('Input.insertText', { text: '拼音' });
  await search.fill('关键词');
  await click('A 清除搜索');
  check(
    'real clear pointer preserves native search focus without submitting',
    (await info()).query === '' &&
      (await info()).searches === 1 &&
      (await search.evaluate((e) => document.activeElement === e)),
  );
  await search.fill('取消');
  await page.keyboard.press('Escape');
  check(
    'search Escape clears without submitting',
    (await info()).query === '' && (await info()).searches === 1,
  );
  await number.fill('-');
  check(
    'numeric temporary sign preserves editing without commit',
    (await number.inputValue()) === '-' && (await info()).amount === 1,
  );
  await page.keyboard.press('Enter');
  check(
    'invalid numeric commit restores accepted value',
    (await number.inputValue()) === '1',
  );
  await number.fill('.');
  await page.keyboard.press('Escape');
  check(
    'numeric temporary decimal can be cancelled',
    (await number.inputValue()) === '1',
  );
  await number.fill('0.2');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  check(
    'decimal stepping avoids floating-point tails',
    (await info()).amount === 0.3 && (await number.inputValue()) === '0.3',
  );
  await number.fill('99');
  await search.focus();
  check('numeric blur clamps to finite range', (await info()).amount === 10);
  await number.fill('');
  await page.keyboard.press('Enter');
  check(
    'numeric empty commits null',
    (await info()).amount === null &&
      !(await number.getAttribute('aria-valuenow')),
  );
  await activate('A 增加缩放');
  check(
    'step button restores native numeric input focus',
    (await info()).amount === 0.1 &&
      (await number.evaluate((e) => document.activeElement === e)),
  );
  const initial = (await info()).size;
  let p = await pointer(separator);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 50, p.y, { steps: 5 });
  await page.mouse.up();
  await pause();
  check(
    'real mouse drag changes logical pane size',
    Math.abs((await info()).size - initial - 50) < 2,
  );
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  await pause();
  check(
    'separator keyboard increments and reports range semantics',
    (await info()).size === initial + 60 &&
      (await separator.getAttribute('aria-orientation')) === 'vertical',
  );
  await command('scale', 0, 0.75);
  await pause();
  p = await pointer(separator);
  const beforeScale = (await info()).size;
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 45, p.y, { steps: 5 });
  await page.mouse.up();
  await pause();
  check(
    'CSS-scaled drag converts viewport motion to logical coordinates',
    Math.abs((await info()).size - beforeScale - 60) < 2,
  );
  await command('scale', 0, 1);
  await pause();
  p = await pointer(separator);
  const beforeTouch = (await info()).size;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x - 35, y: p.y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await pause();
  check(
    'real Chrome touch drag updates pane size',
    Math.abs((await info()).size - beforeTouch + 35) < 2,
  );
  p = await pointer(separator);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(1000, p.y);
  await page.mouse.up();
  await pause();
  const released = (await info()).size;
  await page.mouse.move(20, p.y);
  await pause();
  check(
    'release outside Canvas removes drag ownership',
    (await info()).size === released,
  );
  p = await pointer(separator);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.evaluate(() =>
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })),
  );
  const cancelled = (await info()).size;
  await page.mouse.move(30, p.y);
  await page.mouse.up();
  await pause();
  check(
    'pointer cancellation prevents later drag updates',
    (await info()).size === cancelled,
  );
  await command('width', 0, 300);
  await pause();
  const visibleSize = Number(await separator.getAttribute('aria-valuenow'));
  check(
    'container shrink constrains actual pane size',
    visibleSize <= 162 && (await info()).size === cancelled,
  );
  check(
    'narrow numeric editor retains usable width',
    (await number.boundingBox()).width > 20,
  );
  await command('width', 0, 700);
  await pause();
  check(
    'container expansion restores requested size',
    Number(await separator.getAttribute('aria-valuenow')) === cancelled,
  );
  await separator.focus();
  await page.keyboard.press('Home');
  await pause();
  await combo.fill('Pr');
  await pause();
  const list = page.getByRole('listbox', { name: 'A 输出预设', exact: true });
  await list.waitFor();
  check(
    'editable combobox retains input role focus and separate committed value',
    (await combo.evaluate(
      (e) =>
        e.getAttribute('role') === 'combobox' && document.activeElement === e,
    )) &&
      (await info()).preset === 'standard' &&
      (await info()).presetInput === 'Pr',
  );
  await page.keyboard.press('ArrowDown');
  await pause();
  const active = await combo.getAttribute('aria-activedescendant');
  check(
    'active descendant targets an actual related option',
    Boolean(active) &&
      (await page
        .locator(`[id="${active}"]`)
        .evaluate(
          (e) =>
            e.getAttribute('role') === 'option' &&
            e.closest('[role="listbox"]')?.id ===
              document
                .querySelector('[aria-label="A 输出预设"]')
                .getAttribute('aria-controls'),
        )),
  );
  await page.keyboard.press('Enter');
  await pause();
  check(
    'combobox selection commits value and label and keeps input focus',
    (await info()).preset === 'print' &&
      (await combo.inputValue()) === 'Print 印刷' &&
      (await combo.evaluate((e) => document.activeElement === e)) &&
      (await list.count()) === 0,
  );
  await combo.fill('Draft');
  await page.keyboard.press('Escape');
  await pause();
  check(
    'combobox Escape restores selected label without commit',
    (await combo.inputValue()) === 'Print 印刷' &&
      (await info()).preset === 'print',
  );
  await combo.fill('nothing matches');
  await pause();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  check(
    'empty candidate list has no stale active descendant or commit',
    !(await combo.getAttribute('aria-activedescendant')) &&
      (await info()).preset === 'print',
  );
  await page.keyboard.press('Escape');
  await activate('Clear A 输出预设');
  await combo.fill('');
  await page.keyboard.press('ArrowDown');
  await pause();
  await page.keyboard.press('End');
  check(
    'ordinary End preserves editable caret rather than selecting a candidate',
    (await info()).preset === null,
  );
  await page.keyboard.press('Alt+End');
  await page.keyboard.press('Enter');
  await pause();
  check(
    'Alt End skips disabled terminal candidate',
    (await info()).preset === 'print',
  );
  await combo.fill('Draft');
  await pause();
  const draft = page.getByRole('option', { name: 'Draft 草稿', exact: true });
  const rect = await draft.boundingBox();
  assert.ok(rect);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await pause();
  check(
    'real Canvas candidate pointer selects while retaining editor focus',
    (await info()).preset === 'draft' &&
      (await combo.evaluate((e) => document.activeElement === e)),
  );
  await combo.fill('');
  await pause();
  await cdp.send('Input.imeSetComposition', {
    text: '中文',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  check(
    'combobox composition does not select or cancel candidates',
    (await info()).preset === 'draft' &&
      (await combo.inputValue()).includes('中文'),
  );
  await cdp.send('Input.insertText', { text: '中文' });
  await page.keyboard.press('Escape');
  const handle = await combo.elementHandle();
  await command('appearance', 0, true);
  await pause();
  check(
    'theme density and font scale preserve native input and role',
    await handle.evaluate(
      (e) => e.isConnected && e.getAttribute('role') === 'combobox',
    ),
  );
  await page.screenshot({ path: `${output}/dark-large.png` });
  await command('width', 0, 300);
  await pause();
  await page.screenshot({ path: `${output}/narrow-large.png` });
  await command('width', 0, 700);
  await command('appearance', 0, false);
  await pause();
  const snapshot = await info();
  await command('disable', 0, true);
  await pause();
  await separator.evaluate((e) =>
    e.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  check(
    'disabled fields and separator cannot edit',
    (await search.isDisabled()) &&
      (await number.isDisabled()) &&
      (await combo.isDisabled()) &&
      (await info()).size === snapshot.size,
  );
  await command('disable', 0, false);
  await named('B 搜索图层').fill('B 独立');
  check(
    'instance B state remains independent',
    (await info(1)).query === 'B 独立' && (await info()).query === '',
  );
  const ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(`${output}/accessibility.json`, JSON.stringify(ax, null, 2));
  check(
    'Chrome AX exposes named combobox spinbutton and separator',
    ['combobox', 'spinbutton', 'separator'].every((role) =>
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === role &&
          n.name?.value?.startsWith('A '),
      ),
    ),
  );
  for (let i = 0; i < 3; i++) {
    await combo.fill('');
    await page.keyboard.press('ArrowDown');
    await pause();
    const old = await combo.elementHandle();
    const before = await info();
    await command('stop', 0);
    await pause();
    await old.evaluate((e) => {
      e.value = 'stale';
      e.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    check(
      `live teardown ${i + 1} releases owned editors overlays and callbacks`,
      (await page
        .locator('[data-instance="A"] canvas,[data-instance="A"] input')
        .count()) === 0 &&
        (await page
          .getByRole('listbox', { name: 'A 输出预设', exact: true })
          .count()) === 0 &&
        JSON.stringify(await info()) === JSON.stringify(before),
    );
    await command('start', 0);
    await search.waitFor();
    check(
      `remount ${i + 1} resets A and preserves B`,
      (await info()).amount === 1 && (await info(1)).query === 'B 独立',
    );
  }
  await command('stop', 0);
  await command('stop', 1);
  await pause();
  check(
    'all hosts release Canvas native inputs and overlay DOM',
    (await page.locator('canvas,input,[data-piant-overlay]').count()) === 0,
  );
  check(
    'no runtime console or resource errors',
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
        browser: browser.version(),
        checks,
        errors,
        resources,
        limits: [
          'CDP composition and Chrome AX do not certify operating system Chinese candidate windows or VoiceOver.',
          'pointercancel is dispatched; touch and mouse movement use actual Chrome input.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
