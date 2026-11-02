import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.TOAST_EVIDENCE_DIR ?? '/tmp/piant-cod169');
await mkdir(output, { recursive: true });
const checks = [];
const errors = [];
let browser;
let page;
let completed = false;
let failure;
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
try {
  const { chromium } = await import(
    process.env.PLAYWRIGHT_MODULE ?? 'playwright'
  );
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1100, height: 1050 } });
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const group = (name) => page.getByRole('group', { name, exact: true });
  const viewport = () =>
    page.getByRole('region', { name: 'Packed notifications', exact: true });
  const status = () => page.locator('#toast-status');
  const data = (name) => status().getAttribute(`data-${name}`);
  const waitData = (name, value) =>
    page.waitForFunction(
      ({ name, value }) =>
        document
          .getElementById('toast-status')
          ?.getAttribute(`data-${name}`) === value,
      { name, value },
    );
  const mouseClick = async (locator) => {
    const rect = await locator.boundingBox();
    assert.ok(
      rect && rect.width > 0 && rect.height > 0,
      'Packed Canvas control requires a real hit rectangle',
    );
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  };
  await page.goto(
    process.env.TOAST_PACKAGE_URL ?? 'http://127.0.0.1:4188/toast.html',
  );
  await page.locator('#toast-status[data-ready="true"]').waitFor();
  await viewport().waitFor({ state: 'attached' });
  test(
    'packed ToastProvider and useToast initialize an empty scoped viewport',
    (await data('items')) === '0' &&
      (await data('visible')) === '0' &&
      (await data('queued')) === '0',
  );

  const input = page.getByRole('textbox', {
    name: 'Packed toast draft',
    exact: true,
  });
  await input.fill('Selected packed 编辑草稿');
  const originalInput = await input.elementHandle();
  await mouseClick(button('Enqueue packed toast'));
  await input.focus();
  await input.evaluate((element) => element.setSelectionRange(2, 6));
  test(
    'native editing is established before asynchronous notification delivery',
    (await data('pending')) === 'true' &&
      (await group('Packed saved notice').count()) === 0,
  );
  await group('Packed saved notice').waitFor({ state: 'attached' });
  await waitData('items', '1');
  const originalCard = await group('Packed saved notice').elementHandle();
  test(
    'real pointer enqueue creates one toast while asynchronous arrival preserves native focus and selection',
    (await originalInput.evaluate(
      (element) =>
        document.activeElement === element &&
        element.selectionStart === 2 &&
        element.selectionEnd === 6,
    )) &&
      (await data('actions')) === '0' &&
      (await data('close')) === '0' &&
      (await data('action')) === '0',
  );
  await mouseClick(button('Update packed toast'));
  await input.focus();
  await input.evaluate((element) => element.setSelectionRange(1, 5));
  await group('Packed saved update').waitFor({ state: 'attached' });
  test(
    'packed ToastUpdate retains card/input identity and editing selection',
    (await originalCard.evaluate(
      (element) =>
        element.isConnected &&
        element.getAttribute('aria-label') === 'Packed saved update',
    )) &&
      (await originalInput.evaluate(
        (element) =>
          document.activeElement === element &&
          element.value === 'Selected packed 编辑草稿' &&
          element.selectionStart === 1 &&
          element.selectionEnd === 5,
      )) &&
      (await data('items')) === '1',
  );
  await page.waitForFunction(() =>
    document
      .querySelector(
        '[role="region"][aria-label="Packed notifications"] [role="status"]',
      )
      ?.textContent?.includes('Packed saved update'),
  );

  await mouseClick(button('Enqueue packed alert'));
  await group('Packed urgent notice').waitFor({ state: 'attached' });
  await page.waitForFunction(() =>
    document
      .querySelector(
        '[role="region"][aria-label="Packed notifications"] [role="alert"]',
      )
      ?.textContent?.includes('Packed urgent notice'),
  );
  test(
    'packed polite and assertive channels expose the current notification text',
    (await viewport().getByRole('status').textContent()).includes(
      'Packed saved update',
    ) &&
      (await viewport().getByRole('status').getAttribute('aria-live')) ===
        'polite' &&
      (await viewport().getByRole('alert').textContent()).includes(
        'Packed urgent notice',
      ) &&
      (await viewport().getByRole('alert').getAttribute('aria-live')) ===
        'assertive',
  );
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  const nodes = ax.nodes.filter((node) => !node.ignored);
  await writeFile(
    `${output}/packed-toast-accessibility.json`,
    JSON.stringify(nodes, null, 2),
  );
  const live = (role, priority) =>
    nodes.some(
      (node) =>
        node.role?.value === role &&
        node.properties?.some(
          (property) =>
            property.name === 'live' && property.value?.value === priority,
        ),
    );
  test(
    'actual Chrome AX exposes status/polite and alert/assertive roles and labelled toast groups',
    live('status', 'polite') &&
      live('alert', 'assertive') &&
      nodes.some(
        (node) =>
          node.role?.value === 'group' &&
          node.name?.value === 'Packed saved update',
      ) &&
      nodes.some(
        (node) =>
          node.role?.value === 'group' &&
          node.name?.value === 'Packed urgent notice',
      ),
  );
  await page.screenshot({ path: `${output}/packed-toast-announcements.png` });

  await mouseClick(button('Enqueue queued packed toast'));
  await waitData('queued', '1');
  test(
    'packed queue keeps only two visible cards and holds the third without announcing it',
    (await data('items')) === '3' &&
      (await data('visible')) === '2' &&
      (await group('Packed queued notice').count()) === 0 &&
      !(await viewport().getByRole('status').textContent()).includes(
        'Packed queued notice',
      ) &&
      !(await viewport().getByRole('alert').textContent()).includes(
        'Packed queued notice',
      ),
  );
  await mouseClick(button('Undo packed toast: Packed saved update'));
  await group('Packed saved update').waitFor({ state: 'detached' });
  await group('Packed queued notice').waitFor({ state: 'attached' });
  test(
    'real pointer action invokes one current callback, dismisses once and promotes FIFO',
    (await data('actions')) === '1' &&
      (await data('action')) === '1' &&
      (await data('close')) === '0' &&
      (await data('queued')) === '0' &&
      (await data('visible')) === '2',
  );
  await button('Close packed toast: Packed urgent notice').focus();
  await page.keyboard.press('Space');
  await group('Packed urgent notice').waitFor({ state: 'detached' });
  test(
    'real keyboard Space closes one toast without invoking its business action',
    (await data('close')) === '1' &&
      (await data('actions')) === '1' &&
      (await data('action')) === '1',
  );

  await mouseClick(button('Enqueue packed toast'));
  await group('Packed saved notice').waitFor({ state: 'attached' });
  await button('Undo packed toast: Packed saved notice').focus();
  await page.keyboard.press('Enter');
  await group('Packed saved notice').waitFor({ state: 'detached' });
  test(
    'real keyboard Enter action fires exactly once for a fresh toast with a reused ID',
    (await data('actions')) === '2' &&
      (await data('action')) === '2' &&
      (await data('close')) === '1',
  );
  await mouseClick(button('Enqueue packed alert'));
  await group('Packed urgent notice').waitFor({ state: 'attached' });
  await mouseClick(button('Close packed toast: Packed urgent notice'));
  await group('Packed urgent notice').waitFor({ state: 'detached' });
  test(
    'real pointer close dispatches one close reason and leaves action count unchanged',
    (await data('close')) === '2' && (await data('actions')) === '2',
  );
  await page.screenshot({ path: `${output}/packed-toast-keyboard.png` });
  await mouseClick(button('Clear packed toasts'));
  await waitData('items', '0');
  test(
    'packed dismissAll removes the queued toast once with the programmatic reason',
    (await data('programmatic')) === '1' &&
      (await data('visible')) === '0' &&
      (await data('timeout')) === '0',
  );

  await mouseClick(button('Enqueue timed packed toast'));
  await group('Packed timed notice').waitFor({ state: 'attached' });
  const regionElement = await viewport().elementHandle();
  const timedElement = await group('Packed timed notice').elementHandle();
  // Arm a complete 500ms lifetime immediately before the native unmount click;
  // locator polling may already have consumed part of the initial duration.
  assert.equal(
    await page.evaluate(() => window.packedToastPrepareUnmount()),
    true,
  );
  const beforeUnmount = await status().evaluate((element) => ({
    ...element.dataset,
    time: Date.now(),
  }));
  await button('Unmount packed toasts').click();
  const immediateUnmount = await status().evaluate((element) => ({
    ...element.dataset,
    time: Date.now(),
  }));
  await writeFile(
    `${output}/packed-toast-unmount-timing.json`,
    JSON.stringify({ beforeUnmount, immediateUnmount }, null, 2),
  );
  test(
    'packed provider unmount releases Canvas, viewport, cards and native input',
    (await data('mounted')) === 'false' &&
      (await data('items')) === '0' &&
      (await page.locator('#toast-target canvas').count()) === 0 &&
      (await viewport().count()) === 0 &&
      (await regionElement.evaluate((element) => !element.isConnected)) &&
      (await timedElement.evaluate((element) => !element.isConnected)) &&
      (await originalInput.evaluate((element) => !element.isConnected)),
  );
  await page.waitForTimeout(700);
  const afterUnmount = await status().evaluate((element) => ({
    ...element.dataset,
  }));
  await writeFile(
    `${output}/packed-toast-unmount-state.json`,
    JSON.stringify(afterUnmount, null, 2),
  );
  test(
    'provider disposal cancels its pending timeout without late dismissal or action callbacks',
    (await data('timeout')) === '0' &&
      (await data('actions')) === '2' &&
      (await data('action')) === '2' &&
      (await data('close')) === '2' &&
      (await data('programmatic')) === '1' &&
      (await data('pending')) === 'false',
  );
  test(
    'production tarball fixture has no browser runtime or component errors',
    errors.length === 0 && (await data('failure')) === null,
  );
  completed = true;
} catch (error) {
  failure = error.stack ?? String(error);
  if (page)
    await page
      .screenshot({ path: `${output}/packed-toast-failure.png` })
      .catch(() => {});
  throw error;
} finally {
  try {
    await writeFile(
      `${output}/packed-toast-results.json`,
      JSON.stringify(
        {
          completed,
          browser: browser?.version() ?? null,
          checks,
          errors,
          failure,
          source:
            'Changesets-versioned local core/UI tarballs, not registry release verification',
          coverage:
            'Actual Chrome pointer, keyboard and AX; no VoiceOver or OS input-method validation',
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
  }
}
