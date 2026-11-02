import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(
  process.env.MENU_SELECT_EVIDENCE_DIR ?? '/tmp/piant-cod168',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const checks = [],
  errors = [],
  resources = [];
let complete = false;
function observe(page) {
  page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) resources.push({ url: r.url(), status: r.status() });
  });
}
observe(page);
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const role = (role, name) => page.getByRole(role, { name, exact: true });
const wait = () => page.waitForTimeout(100);
const key = async (roleName, name, key = 'Enter') => {
  await role(roleName, name).focus();
  await page.keyboard.press(key);
  await wait();
};
const click = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  const r = await locator.boundingBox();
  assert.ok(r);
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await wait();
};
const invoke = (method, arg) =>
  page.evaluate(
    ([method, arg]) => window.menuSelectFixture[method](arg),
    [method, arg],
  );
const stats = () => invoke('stats');
const active = () =>
  page.evaluate(() => {
    const owner = document.activeElement;
    const item = document.getElementById(
      owner?.getAttribute('aria-activedescendant'),
    );
    return {
      role: owner?.getAttribute('role'),
      name: owner?.getAttribute('aria-label'),
      text: item?.textContent,
      id: item?.id,
      selected: item?.getAttribute('aria-selected'),
      disabled: item?.getAttribute('aria-disabled'),
      inside: item
        ? (() => {
            const a = item.getBoundingClientRect(),
              l = item.parentElement.getBoundingClientRect();
            return a.bottom > l.top && a.top < l.bottom;
          })()
        : false,
    };
  });
const fixtureURL =
  process.env.MENU_SELECT_FIXTURE_URL ??
  'http://127.0.0.1:4177/menuSelect.html';
try {
  await page.goto(fixtureURL);
  await role('combobox', 'Fixture choice').waitFor();
  const combo = role('combobox', 'Fixture choice');
  await click(role('button', 'Fixture menu trigger'));
  test(
    'real Canvas click focuses menu active descendant',
    (await active()).text === 'Alpha' && (await active()).role === 'menu',
  );
  await page.keyboard.press('ArrowUp');
  test('Menu wraps to last item', (await active()).text === 'Delta');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  test(
    'disabled menuitem remains discoverable',
    (await active()).disabled === 'true',
  );
  await page.keyboard.press('Enter');
  test(
    'disabled item neither acts nor closes',
    (await stats()).actions === 0 &&
      (await role('menu', 'Fixture menu').count()) === 1,
  );
  await page.keyboard.press('c');
  await page.keyboard.press('Space');
  await wait();
  test(
    'typeahead plus Space executes once and restores Trigger',
    (await stats()).actions === 1 &&
      (await active()).name === 'Fixture menu trigger' &&
      (await role('menu').count()) === 0,
  );
  await key('button', 'Fixture menu trigger');
  await invoke('rejectClose', true);
  const menuPress = await role('menuitem', 'Alpha').boundingBox();
  await page.mouse.move(
    menuPress.x + menuPress.width / 2,
    menuPress.y + menuPress.height / 2,
  );
  await page.mouse.down();
  test(
    'Menu item press retains semantic menu focus while held',
    (await active()).role === 'menu',
  );
  await page.mouse.up();
  await wait();
  await page.keyboard.press('ArrowDown');
  test(
    'rejected Menu pointer close retains focus and keyboard navigation',
    (await role('menu').count()) === 1 &&
      (await active()).text === 'Beta disabled',
  );
  await invoke('rejectClose', false);
  await click(role('button', 'Fixture background action'));
  test(
    'outside gesture closes Menu without executing background',
    (await stats()).background === 0 && (await role('menu').count()) === 0,
  );
  await click(role('button', 'Fixture background action'));
  test(
    'next independent background gesture executes normally',
    (await stats()).background === 1,
  );
  await click(combo);
  await invoke('rejectClose', true);
  const held = await role('option', 'Item 70').boundingBox();
  await page.mouse.move(held.x + held.width / 2, held.y + held.height / 2);
  await page.mouse.down();
  test(
    'Select item press retains combobox focus while held',
    (await active()).name === 'Fixture choice',
  );
  await page.mouse.up();
  await wait();
  test(
    'rejected pointer close retains keyboard navigation owner',
    (await role('listbox').count()) === 1 &&
      (await active()).name === 'Fixture choice',
  );
  await page.keyboard.press('ArrowUp');
  test(
    'keyboard navigation continues after rejected pointer close',
    (await active()).text === 'Item 69',
  );
  await page.keyboard.press('ArrowDown');
  await invoke('rejectClose', false);
  test(
    'Select initially scrolls committed long-list option into view',
    (await active()).text === 'Item 70' &&
      (await active()).inside &&
      (await active()).selected === 'true',
  );
  const cdp = await page.context().newCDPSession(page);
  let ax = await cdp.send('Accessibility.getFullAXTree');
  test(
    'Chrome AX exposes separate combobox name and committed value',
    ax.nodes.some(
      (n) =>
        !n.ignored &&
        n.role?.value === 'combobox' &&
        n.name?.value === 'Fixture choice' &&
        n.value?.value === 'Item 70',
    ),
  );
  await page.keyboard.press('End');
  await wait();
  test(
    'End reaches clipped final option without committing',
    (await active()).text === 'Item 79' &&
      (await active()).inside &&
      (await stats()).value === 'item-70' &&
      (await combo.textContent()) === 'Item 70',
  );
  await page.keyboard.press('ArrowDown');
  test('Select clamps at final option', (await active()).text === 'Item 79');
  const preserved = (await active()).id;
  await invoke('setOptions', 'reverse');
  await wait();
  test(
    'keyed reorder preserves active option DOM identity and reveal',
    (await active()).id === preserved && (await active()).inside,
  );
  await invoke('appearance');
  await wait();
  test(
    'dark 200% typography retains active option and visibility',
    (await active()).id === preserved && (await active()).inside,
  );
  await page.screenshot({ path: `${output}/long-select-dark-200.png` });
  await invoke('appearance');
  await invoke('setOptions', 'initial');
  await wait();
  await page.keyboard.press('Escape');
  test(
    'Escape cancels preview and keeps committed value',
    (await role('listbox').count()) === 0 &&
      (await stats()).value === 'item-70',
  );
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  test(
    'disabled option has discoverable aria-disabled',
    (await active()).text === 'Item 01' && (await active()).disabled === 'true',
  );
  const beforeDisabled = (await stats()).requests;
  await page.keyboard.press('Enter');
  test(
    'disabled Select option does not emit value request',
    (await stats()).requests === beforeDisabled &&
      (await role('listbox').count()) === 1,
  );
  await page.keyboard.press('End');
  await invoke('reject', true);
  await page.keyboard.press('Enter');
  await wait();
  test(
    'controlled value rejection closes preview and retains old value',
    (await stats()).requests === beforeDisabled + 1 &&
      (await stats()).value === 'item-70' &&
      (await role('listbox').count()) === 0,
  );
  await invoke('reject', false);
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await wait();
  test(
    'accepted keyboard commit updates native value and closes',
    (await stats()).value === 'item-79' &&
      (await combo.textContent()) === 'Item 79' &&
      (await role('listbox').count()) === 0,
  );
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await wait();
  test(
    'Tab cancels preview and advances to following control',
    (await role('listbox').count()) === 0 &&
      (await active()).name === 'Fixture background action' &&
      (await stats()).value === 'item-79',
  );
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await invoke('rejectClose', true);
  const beforeTab = await stats();
  await page.keyboard.press('Tab');
  await wait();
  test(
    'rejected forward Tab requests close exactly once and advances focus',
    (await stats()).closes === beforeTab.closes + 1 &&
      (await stats()).requests === beforeTab.requests &&
      (await role('listbox').count()) === 1 &&
      (await active()).name === 'Fixture background action',
  );
  await combo.focus();
  await page.keyboard.press('Shift+Tab');
  await wait();
  test(
    'independent rejected reverse Tab requests once and moves to previous control',
    (await stats()).closes === beforeTab.closes + 2 &&
      (await stats()).requests === beforeTab.requests &&
      (await active()).name === 'Fixture menu trigger',
  );
  await invoke('rejectClose', false);
  await combo.focus();
  await page.keyboard.press('Escape');
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await cdp.send('Input.imeSetComposition', {
    text: '中',
    selectionStart: 1,
    selectionEnd: 1,
  });
  await combo.dispatchEvent('keydown', {
    key: 'Escape',
    isComposing: true,
    bubbles: true,
    cancelable: true,
  });
  test(
    'composition-marked Escape is ignored (not OS IME proof)',
    (await role('listbox').count()) === 1,
  );
  await cdp.send('Input.insertText', { text: '中' });
  await page.keyboard.press('Escape');
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await invoke('setOptions', 'remove');
  await wait();
  test(
    'removing committed option shows placeholder without implicit commit',
    (await stats()).value === 'item-79' &&
      (await combo.textContent()) === 'Select an option' &&
      (await active()).inside,
  );
  await invoke('setOptions', 'empty');
  await wait();
  test(
    'empty data disables Trigger and releases popup semantics',
    (await combo.getAttribute('aria-disabled')) === 'true' &&
      (await role('listbox').count()) === 0 &&
      (await combo.getAttribute('aria-activedescendant')) === null,
  );
  await invoke('setOptions', 'initial');
  await wait();
  await key('button', 'Fixture menu trigger');
  await role('button', 'Peer action').focus();
  await page.keyboard.press('Enter');
  test(
    'foreign Canvas focus/action is isolated from open Menu',
    (await role('menu').count()) === 1 && (await stats()).background === 2,
  );
  await role('textbox', 'External input').focus();
  await page.keyboard.type('external');
  test(
    'external DOM input remains usable and isolated',
    (await role('textbox', 'External input').inputValue()) === 'external' &&
      (await role('menu').count()) === 1,
  );
  await role('menu', 'Fixture menu').focus();
  await page.keyboard.press('Escape');
  await key('button', 'Fixture dialog');
  await key('button', 'Nested menu trigger');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await wait();
  test(
    'Menu action in Dialog closes only top popup',
    (await role('menu').count()) === 0 &&
      (await role('dialog', 'Fixture modal').count()) === 1 &&
      (await active()).name === 'Nested menu trigger',
  );
  await key('combobox', 'Nested choice', 'ArrowDown');
  await page.keyboard.press('Escape');
  test(
    'Select Escape preserves containing Dialog and trigger focus',
    (await role('listbox').count()) === 0 &&
      (await role('dialog', 'Fixture modal').count()) === 1 &&
      (await active()).name === 'Nested choice',
  );
  await page.screenshot({ path: `${output}/nested-dialog.png` });
  ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(
    `${output}/nested-accessibility.json`,
    JSON.stringify(ax, null, 2),
  );
  await key('button', 'Fixture close dialog');
  for (let cycle = 0; cycle < 4; cycle++) {
    await key('button', 'Fixture dialog');
    const help = await role('button', 'Modal help').boundingBox();
    await page.mouse.move(help.x + help.width / 2, help.y + help.height / 2);
    await role('tooltip').waitFor();
    await key('combobox', 'Nested choice', 'ArrowDown');
    test(
      `teardown cycle ${cycle + 1} has Dialog, Tooltip and Select concurrently open`,
      (await role('tooltip').count()) === 1 &&
        (await role('listbox').count()) === 1 &&
        (await role('dialog').count()) === 1,
    );
    const detached = await role('option', 'Item 79').elementHandle();
    const before = await stats();
    await invoke('destroy');
    await detached.evaluate((e) => e.click());
    await wait();
    test(
      `owner dispose cycle ${cycle + 1} removes semantics and suppresses stale callbacks`,
      (await role('dialog').count()) === 0 &&
        (await role('listbox').count()) === 0 &&
        (await stats()).requests === before.requests &&
        (await stats()).closes === before.closes,
    );
    await invoke('remount');
    await combo.waitFor();
  }
  await key('combobox', 'Fixture choice', 'ArrowDown');
  await page.keyboard.press('Home');
  await wait();
  await click(role('option', 'Item 00'));
  test(
    'real Canvas option click commits and closes',
    (await stats()).value === 'item-0' && (await role('listbox').count()) === 0,
  );
  ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(
    `${output}/select-accessibility.json`,
    JSON.stringify(ax, null, 2),
  );
  await page.screenshot({ path: `${output}/fixture-complete.png` });
  await invoke('destroy');
  await invoke('destroyPeer');
  const touch = await browser.newPage({
    viewport: { width: 1000, height: 900 },
    hasTouch: true,
  });
  observe(touch);
  await touch.goto(fixtureURL);
  await touch.getByRole('combobox').waitFor();
  let r = await touch.getByRole('combobox').boundingBox();
  await touch.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await touch.waitForTimeout(100);
  test(
    'real touch opens Select',
    (await touch.getByRole('listbox').count()) === 1,
  );
  r = await touch
    .getByRole('button', { name: 'Fixture background action', exact: true })
    .boundingBox();
  await touch.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await touch.waitForTimeout(100);
  test(
    'outside touch dismisses without click-through',
    (await touch.getByRole('listbox').count()) === 0 &&
      (await touch.evaluate(
        () => window.menuSelectFixture.stats().background,
      )) === 0,
  );
  await touch.close();
  for (const kind of ['menu', 'select']) {
    const initial = await browser.newPage();
    observe(initial);
    await initial.goto(`${fixtureURL}?${kind}Open=1`);
    await initial.getByRole(kind === 'menu' ? 'menu' : 'listbox').waitFor();
    test(
      `initial controlled-open ${kind} renders without focus or pointer event`,
      (await initial
        .getByRole(kind === 'menu' ? 'menu' : 'listbox')
        .count()) === 1,
    );
    await initial.close();
  }
  const terminal = await browser.newPage();
  observe(terminal);
  await terminal.goto(`${fixtureURL}?terminal=1&selectOpen=1`);
  await terminal.getByRole('listbox').waitFor();
  await terminal.evaluate(() => window.menuSelectFixture.rejectClose(true));
  await terminal.getByRole('combobox').focus();
  await terminal.keyboard.press('Tab');
  await terminal.waitForTimeout(100);
  test(
    'terminal rejected Tab preserves native departure and requests close once',
    (await terminal.evaluate(() => window.menuSelectFixture.stats().closes)) ===
      1 &&
      (await terminal.getByRole('listbox').count()) === 1 &&
      (await terminal
        .getByRole('combobox')
        .evaluate((e) => document.activeElement !== e)),
  );
  await terminal.close();
  for (const rejected of [false, true]) {
    for (const reverse of [false, true]) {
      for (const sibling of [false, true]) {
        const nested = await browser.newPage();
        observe(nested);
        await nested.goto(
          `${fixtureURL}?terminalModal=1${sibling ? `&modalSibling=${reverse ? 'after' : 'before'}` : ''}`,
        );
        const trigger = nested.getByRole('combobox');
        await trigger.waitFor();
        await nested.evaluate((reject) => {
          window.menuSelectFixture.rejectClose(reject);
          const external = document.createElement('button');
          external.id = 'terminal-external';
          external.textContent = 'External terminal target';
          document.body.append(external);
        }, rejected);
        await trigger.focus();
        await nested.keyboard.press('ArrowDown');
        await nested.getByRole('listbox').waitFor();
        await nested.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
        await nested.waitForTimeout(100);
        test(
          `terminal modal Tab wraps and closes once (sibling=${sibling}, reject=${rejected}, reverse=${reverse})`,
          (sibling
            ? await nested
                .getByRole('button', { name: 'Modal sibling', exact: true })
                .evaluate((e) => document.activeElement === e)
            : await trigger.evaluate((e) => document.activeElement === e)) &&
            (await nested
              .getByRole('dialog', { name: 'Terminal modal', exact: true })
              .count()) === 1 &&
            (await nested.getByRole('listbox').count()) ===
              (rejected ? 1 : 0) &&
            (await nested.evaluate(
              () => window.menuSelectFixture.stats().closes,
            )) === 1 &&
            (await nested.evaluate(
              () => window.menuSelectFixture.stats().requests,
            )) === 0,
        );
        await nested.close();
      }
    }
  }
  test('browser reports no uncaught or console errors', errors.length === 0);
  test('all requested resources succeed', resources.length === 0);
  complete = true;
} finally {
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify(
      {
        complete,
        browser: browser.version(),
        checks,
        errors,
        resources,
        limits: [
          'CDP/AX evidence does not replace actual OS IME or VoiceOver checks (COD-179/COD-180).',
          'Prior COD-167 optional GPU-free Yoga teardown failure predates COD-168; no proven production impact or fix.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
