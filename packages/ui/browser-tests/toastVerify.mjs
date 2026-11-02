import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = process.env.TOAST_EVIDENCE_DIR ?? '/tmp/piant-cod169';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const checks = [],
  errors = [],
  resources = [];
let completed = false;
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
const check = (name, result) => {
  assert.ok(result, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const invoke = (method, ...args) =>
  page.evaluate(
    ([method, args]) => window.toastFixture[method](...args),
    [method, args],
  );
const show = (input) => invoke('show', input);
const stats = () => invoke('stats');
const region = () =>
  page.getByRole('region', { name: 'Fixture notifications', exact: true });
const card = (name) => page.getByRole('group', { name, exact: true });
const button = (name) => page.getByRole('button', { name, exact: true });
const draft = () =>
  page.getByRole('textbox', { name: 'Toast draft', exact: true });
const wait = (ms = 100) => page.waitForTimeout(ms);
const key = async (name, key = 'Enter') => {
  await button(name).focus();
  await page.keyboard.press(key);
  await wait();
};
const click = async (locator) => {
  const r = await locator.boundingBox();
  assert.ok(r);
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await wait();
};
const url = process.env.TOAST_FIXTURE_URL ?? 'http://127.0.0.1:4177/toast.html';
try {
  await page.goto(url);
  await draft().waitFor();
  await draft().focus();
  await draft().evaluate((e) => e.setSelectionRange(1, 5));
  const input = await draft().elementHandle();
  const channels = await region().getByRole('status').elementHandle();
  await show({
    id: 'notice',
    title: 'Saved draft',
    description: 'Available in drafts',
    action: 'normal',
  });
  await card('Saved draft').waitFor({ state: 'attached' });
  await wait();
  check(
    'show preserves native input object, focus and selection',
    await input.evaluate(
      (e) =>
        document.activeElement === e &&
        e.selectionStart === 1 &&
        e.selectionEnd === 5,
    ),
  );
  check(
    'stable polite text channel excludes action and dismiss labels',
    await channels.evaluate(
      (e) =>
        e.isConnected &&
        e.getAttribute('aria-live') === 'polite' &&
        e.getAttribute('aria-atomic') === 'true' &&
        e.textContent === 'Saved draft. Available in drafts',
    ),
  );
  const action = await button('Undo: Saved draft').elementHandle();
  await invoke('update', 'notice', { title: 'Updated draft' });
  await wait();
  check(
    'ID update preserves native action control identity',
    await action.evaluate(
      (e) =>
        e.isConnected && e.getAttribute('aria-label') === 'Undo: Updated draft',
    ),
  );
  await invoke('appearance');
  await wait();
  check(
    'theme/200% update preserves input focus and selection',
    await input.evaluate(
      (e) =>
        document.activeElement === e &&
        e.selectionStart === 1 &&
        e.selectionEnd === 5,
    ),
  );
  await page.screenshot({ path: `${output}/toast-dark-200.png` });
  await invoke('appearance');
  await click(button('Undo: Updated draft'));
  check(
    'real Canvas action executes once and dismisses its record',
    (await stats()).actions === 1 &&
      (await card('Updated draft').count()) === 0 &&
      (await stats()).dismissals.filter((x) => x.id === 'notice').length === 1,
  );
  await show({ id: 'veto', title: 'Action veto', action: 'veto' });
  await card('Action veto').waitFor({ state: 'attached' });
  await key('Undo: Action veto', 'Space');
  check(
    'preventDefault action keeps its toast and semantic focus',
    (await card('Action veto').count()) === 1 &&
      (await button('Undo: Action veto').evaluate(
        (e) => document.activeElement === e,
      )) &&
      (await stats()).actions === 2,
  );
  await page.keyboard.press('Escape');
  await wait();
  check(
    'local Escape dismisses without executing action again',
    (await card('Action veto').count()) === 0 && (await stats()).actions === 2,
  );
  await show({ id: 'replace', title: 'Action updates', action: 'update' });
  await card('Action updates').waitFor({ state: 'attached' });
  await key('Undo: Action updates');
  check(
    'action callback update preserves new toast instead of stale close',
    (await card('Updated in action').count()) === 1 &&
      (await stats()).actions === 3,
  );
  await click(button('Dismiss: Updated in action'));
  check(
    'real Canvas dismiss never invokes action',
    (await card('Updated in action').count()) === 0 &&
      (await stats()).actions === 3,
  );
  for (const gesture of ['Space', 'pointer']) {
    await show({ id: 'gesture', title: 'Gesture action', action: 'normal' });
    await card('Gesture action').waitFor({ state: 'attached' });
    const beforeAction = (await stats()).actions;
    const old = await button('Undo: Gesture action').elementHandle();
    if (gesture === 'Space') {
      await button('Undo: Gesture action').focus();
      await page.keyboard.down('Space');
    } else {
      const r = await button('Undo: Gesture action').boundingBox();
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
    }
    await page.evaluate(() => {
      window.replacementActions = 0;
      window.toastFixture.update('gesture', {
        action: {
          label: 'Replacement',
          onAction: () => {
            window.replacementActions++;
          },
        },
      });
    });
    if (gesture === 'Space') await page.keyboard.up('Space');
    else await page.mouse.up();
    await wait();
    check(
      `${gesture} gesture armed for replaced action cannot activate old or new callback`,
      (await old.evaluate((e) => !e.isConnected)) &&
        (await stats()).actions === beforeAction &&
        (await page.evaluate(() => window.replacementActions)) === 0 &&
        (await card('Gesture action').count()) === 1,
    );
    await key('Replacement: Gesture action');
    check(
      `fresh action after ${gesture} replacement executes exactly once`,
      (await page.evaluate(() => window.replacementActions)) === 1 &&
        (await card('Gesture action').count()) === 0,
    );
  }
  await draft().focus();
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++)
      window.toastFixture.show({ id: `q${i}`, title: `Queue ${i}` });
  });
  await wait();
  check(
    'concurrent queue uses FIFO visible limit and total capacity',
    JSON.stringify((await stats()).visible) ===
      JSON.stringify(['q0', 'q1', 'q2']) &&
      (await stats()).queued === 3 &&
      (await stats()).items.length === 6,
  );
  check(
    'new ID rejected at capacity without evicting focused content',
    (await show({ id: 'excess', title: 'Excess' })) === undefined &&
      (await stats()).items.length === 6,
  );
  await show({ id: 'q0', title: 'Replaced first' });
  await wait();
  check(
    'same-ID upsert succeeds at cap and preserves order',
    (await stats()).visible[0] === 'q0' &&
      (await stats()).items[0].title === 'Replaced first',
  );
  check(
    'queued messages are not announced before promotion',
    !(await region().getByRole('status').textContent()).includes('Queue 3'),
  );
  await invoke('dismiss', 'q0');
  await wait();
  check(
    'dismiss promotes FIFO and announces newly visible entry',
    (await stats()).visible[2] === 'q3' &&
      (await region().getByRole('status').textContent()).includes('Queue 3'),
  );
  const scroll = page.getByRole('region', {
    name: 'Fixture notifications scroll area',
    exact: true,
  });
  await invoke('appearance');
  await wait();
  await scroll.focus();
  await page.keyboard.press('End');
  await wait();
  await page.keyboard.press('Shift+Tab');
  check(
    'overflow scroll stop reveals and reaches last toast control by keyboard',
    await button('Dismiss: Queue 3').evaluate(
      (e) => document.activeElement === e,
    ),
  );
  await invoke('appearance');
  await invoke('clear');
  await draft().focus();
  await show({
    id: 'urgent',
    title: 'Connection failed',
    priority: 'assertive',
  });
  await wait();
  check(
    'explicit urgent notice uses separate assertive alert channel',
    (await region().getByRole('alert').textContent()) === 'Connection failed',
  );
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  check(
    'Chrome AX exposes toast region, named group and dismiss control',
    ax.nodes.some(
      (n) =>
        !n.ignored &&
        n.role?.value === 'region' &&
        n.name?.value === 'Fixture notifications',
    ) &&
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === 'group' &&
          n.name?.value === 'Connection failed',
      ) &&
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === 'button' &&
          n.name?.value === 'Dismiss: Connection failed',
      ),
  );
  await writeFile(
    `${output}/toast-accessibility.json`,
    JSON.stringify(ax, null, 2),
  );
  await invoke('clear');
  await show({ id: 'early', title: 'Never announce early close' });
  await invoke('dismiss', 'early');
  await wait();
  check(
    'early dismissal leaves no delayed stale announcement',
    !(await region().getByRole('status').textContent()).includes(
      'Never announce early close',
    ),
  );
  await show({ id: 'finite', title: 'Finite redundant status', duration: 800 });
  await card('Finite redundant status').waitFor({ state: 'attached' });
  await wait(100);
  const r = await button('Dismiss: Finite redundant status').boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await wait(950);
  check(
    'real pointer hover pauses finite timeout',
    (await card('Finite redundant status').count()) === 1,
  );
  await button('Dismiss: Finite redundant status').focus();
  await page.mouse.move(690, 680);
  await wait(900);
  check(
    'leaving hover does not cancel an independent focus pause',
    (await card('Finite redundant status').count()) === 1,
  );
  await draft().focus();
  await wait(850);
  check(
    'all pause reasons released resumes remaining time without focus steal',
    (await card('Finite redundant status').count()) === 0 &&
      (await draft().evaluate((e) => document.activeElement === e)),
  );
  await show({ id: 'hidden', title: 'Viewport lifetime', duration: 500 });
  await card('Viewport lifetime').waitFor({ state: 'attached' });
  await invoke('viewport', false);
  await wait(650);
  check(
    'unmounting viewport pauses rather than discarding queue',
    (await stats()).items.some((x) => x.id === 'hidden') &&
      (await region().count()) === 0,
  );
  await invoke('viewport', true);
  await card('Viewport lifetime').waitFor({ state: 'attached' });
  await wait(650);
  check(
    'viewport remount resumes finite queue',
    !(await stats()).items.some((x) => x.id === 'hidden'),
  );
  await key('Fixture dialog');
  await page
    .getByRole('textbox', { name: 'Modal draft', exact: true })
    .waitFor();
  await show({ id: 'modal', title: 'Paused behind modal', duration: 500 });
  await wait(700);
  check(
    'modal-inert viewport pauses finite status and keeps modal input focus',
    (await stats()).items.some((x) => x.id === 'modal') &&
      (await page
        .getByRole('textbox', { name: 'Modal draft', exact: true })
        .evaluate((e) => document.activeElement === e)),
  );
  await page.keyboard.press('Escape');
  await wait(650);
  check(
    'Toast does not intercept parent Dialog Escape and resumes after modal',
    (await page.getByRole('dialog').count()) === 0 &&
      !(await stats()).items.some((x) => x.id === 'modal'),
  );
  await invoke('peerShow');
  await page
    .getByRole('group', { name: 'Peer notice', exact: true })
    .waitFor({ state: 'attached' });
  await show({ id: 'main', title: 'Main notice', action: 'normal' });
  await card('Main notice').waitFor({ state: 'attached' });
  const detached = await button('Undo: Main notice').elementHandle();
  const before = await stats();
  await invoke('destroy');
  await detached.evaluate((e) => e.click());
  await wait(1000);
  check(
    'provider destroy removes owned semantics and prevents detached callbacks',
    (await region().count()) === 0 &&
      (await stats()).actions === before.actions &&
      (await stats()).dismissals.length === before.dismissals.length &&
      (await page
        .getByRole('group', { name: 'Peer notice', exact: true })
        .count()) === 1,
  );
  await invoke('remount');
  await draft().waitFor();
  check(
    'fresh provider remount starts an empty independent queue',
    (await stats()).items.length === 0,
  );
  for (let i = 0; i < 3; i++) {
    await show({ id: `cycle${i}`, title: 'Cycle finite', duration: 250 });
    await card('Cycle finite').waitFor({ state: 'attached' });
    await invoke('destroy');
    await invoke('remount');
    await draft().waitFor();
  }
  await wait(400);
  check(
    'repeated provider teardown leaves no stale timer notification',
    (await stats()).items.length === 0 &&
      (await card('Cycle finite').count()) === 0,
  );
  await invoke('destroy');
  await invoke('destroyPeer');
  check(
    'all toast hosts unmount without owned DOM leftovers',
    (await page.getByRole('region').count()) === 0 &&
      (await page.locator('canvas').count()) === 0,
  );
  check('no component runtime or console errors', errors.length === 0);
  check('all fixture resources succeed', resources.length === 0);
  completed = true;
} catch (error) {
  errors.push(error.stack ?? String(error));
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
          'Chrome AX and synthetic composition are not OS IME or VoiceOver validation (COD-179/180).',
          'Prior COD-167 GPU-free Yoga diagnostic predates COD-168; M3 introduction point unknown; not claimed resolved.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
