import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = process.env.TOAST_EVIDENCE_DIR ?? '/tmp/piant-cod169';
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
const check = (name, result) => {
  assert.ok(result, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
// Semantic click supports clipped example controls; fixture tests cover real pointer paths.
const invoke = (name) => button(name).evaluate((e) => e.click());
const region = () => page.locator('[role="region"][aria-label="示例通知"]');
const wait = () => page.waitForTimeout(150);
const reveal = async () => {
  const canvas = page.locator('canvas').first();
  await canvas.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await wait();
  const r = await canvas.boundingBox();
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.mouse.move(
    r.x + r.width / 2,
    Math.max(80, Math.min(r.y + 200, 1000)),
  );
  await page.mouse.wheel(0, 1800);
  await wait();
  // Canvas scrolling also lets the wheel reach the page; restore its position.
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await wait();
};
try {
  await page.goto(
    process.env.TOAST_DOCS_URL ?? 'http://127.0.0.1:5173/ui/toast',
  );
  await button('加入 5 条 Toast').waitFor();
  await button('加入 5 条 Toast').focus();
  await page.keyboard.press('Enter');
  await wait();
  check(
    'live example keyboard enqueue displays three FIFO cards and queues two',
    (await region().locator('[role="group"]').count()) === 3 &&
      (await region().getAttribute('aria-description')) === '2 queued',
  );
  check(
    'live example polite announcement excludes queued fourth notice',
    !(await region().getByRole('status').textContent()).includes('排队通知 4'),
  );
  await invoke('加入 5 条 Toast');
  await wait();
  check(
    'live example capacity remains bounded',
    (await region().getAttribute('aria-description')) === '3 queued' &&
      (await region().locator('[role="group"]').count()) === 3,
  );
  await invoke('清空 Toast');
  await invoke('创建或替换上传 Toast');
  await invoke('局部更新上传 Toast');
  await wait();
  check(
    'live example ID partial update retains title and updates message',
    (await page.locator('[role="group"][aria-label="上传任务 1"]').count()) ===
      1 &&
      (await region().getByRole('status').textContent()).includes('进度已更新'),
  );
  await invoke('创建或替换上传 Toast');
  await wait();
  check(
    'live example full upsert retains one row',
    (await region().locator('[role="group"]').count()) === 1 &&
      (await page
        .locator('[role="group"][aria-label="上传任务 2"]')
        .count()) === 1,
  );
  await invoke('清空 Toast');
  await invoke('加入持久操作 Toast');
  await reveal();
  await button('恢复草稿: 草稿可恢复').focus();
  await page.keyboard.press('Enter');
  await wait();
  check(
    'live example keyboard action dismisses its persistent notice',
    (await region().locator('[role="group"]').count()) === 0,
  );
  await invoke('加入重要提醒 Toast');
  await wait();
  check(
    'live example urgent message uses explicit alert channel',
    (await region().getByRole('alert').textContent()).includes('连接已断开'),
  );
  await reveal();
  await page
    .locator('canvas')
    .first()
    .screenshot({ path: `${output}/docs-toast.png` });
  await invoke('切换 Toast 主题、密度与字号');
  await page.setViewportSize({ width: 390, height: 1100 });
  await reveal();
  check(
    'narrow dark compact 200% example keeps dismiss accessible after scrolling',
    (await button('关闭通知: 连接已断开').count()) === 1,
  );
  await button('关闭通知: 连接已断开').focus();
  await page.keyboard.press('Space');
  await wait();
  check(
    'narrow 200% dismiss keyboard path works',
    (await region().locator('[role="group"]').count()) === 0,
  );
  await invoke('加入持久操作 Toast');
  await reveal();
  await page
    .locator('canvas')
    .first()
    .screenshot({ path: `${output}/docs-toast-narrow-200.png` });
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(
    `${output}/docs-accessibility.json`,
    JSON.stringify(ax, null, 2),
  );
  await invoke('加入短暂 Toast');
  await invoke('卸载 ToastProvider');
  await wait();
  check(
    'example provider unmount removes notifications immediately',
    (await region().count()) === 0,
  );
  await invoke('重新挂载 ToastProvider');
  await wait();
  check(
    'example remount starts empty without stale queue',
    (await region().count()) === 1 &&
      (await region().locator('[role="group"]').count()) === 0,
  );
  check('no component runtime exceptions', errors.length === 0);
  check(
    'console errors limited to existing docs favicon404',
    consoleErrors.every((e) => e.location?.url?.endsWith('/favicon.ico')),
  );
  completed = true;
} catch (error) {
  errors.push(error.stack ?? String(error));
  throw error;
} finally {
  await writeFile(
    `${output}/docs-browser-results.json`,
    JSON.stringify(
      {
        completed,
        browser: browser.version(),
        checks,
        errors,
        consoleErrors,
        limits: [
          'Canvas control setup sometimes uses semantic click; action/dismiss use real keyboard, real pointer paths covered by toastVerify.',
          '390px and fontScale2 are not browser zoom/VoiceOver/system IME certification.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
