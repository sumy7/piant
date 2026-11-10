import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(process.env.TODO_EVIDENCE_DIR ?? '/tmp/piant-todos');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
const errors = [];
const checks = [];
let completed = false;
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (
    message.type() === 'error' &&
    !message.text().startsWith('Failed to load resource:')
  )
    errors.push(message.text());
});
page.on('response', (response) => {
  if (
    response.status() >= 400 &&
    !new URL(response.url()).pathname.endsWith('/favicon.ico')
  )
    errors.push(`Resource ${response.status()}: ${response.url()}`);
});
const check = (name, result) => {
  assert.ok(result, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const button = (name) => page.getByRole('button', { name, exact: true });
const task = (name) => page.getByRole('checkbox', { name, exact: true });
const input = () =>
  page.getByRole('textbox', { name: 'New task', exact: true });
const settle = () => page.waitForTimeout(100);
const state = () =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('piant-todos') ?? '{"todos":[]}'),
  );
const add = async (text, pointer = false) => {
  await input().fill(text);
  if (pointer) await button('Add task').click();
  else await input().press('Enter');
  await settle();
};
try {
  await page.goto(process.env.TODO_URL ?? 'http://127.0.0.1:4260');
  await input().waitFor();
  await settle();
  check(
    'fresh installation starts with an empty list',
    (await page.getByRole('status').textContent()) ===
      '0 tasks left · 0 completed',
  );
  check(
    'blank add and clear completed are disabled',
    (await button('Add task').isDisabled()) &&
      (await button('Clear completed tasks').isDisabled()),
  );
  await add('   ');
  check(
    'whitespace Enter does not create a task',
    (await state()).todos.length === 0,
  );
  await add('  Buy groceries  ');
  await task('Buy groceries').waitFor();
  check(
    'Enter adds one trimmed task and clears the focused composer',
    (await state()).todos.length === 1 &&
      (await input().inputValue()) === '' &&
      (await input().evaluate((e) => document.activeElement === e)),
  );
  await add('Read a book', true);
  check(
    'pointer adds a second task',
    (await task('Read a book').count()) === 1,
  );
  await input().fill('中文');
  await input().dispatchEvent('compositionstart');
  await input().press('Enter');
  check(
    'composition Enter does not add a task',
    (await state()).todos.length === 2,
  );
  await input().dispatchEvent('compositionend', { data: '中文' });
  await settle();
  await input().press('Enter');
  await task('中文').waitFor();
  check(
    'post-composition Enter adds exactly one task',
    (await state()).todos.length === 3,
  );
  await task('Buy groceries').click();
  await settle();
  check(
    'pointer completion updates one task and its remaining count',
    (await state()).todos.filter((t) => t.completed).length === 1 &&
      (await page.getByRole('status').textContent()) ===
        '2 tasks left · 1 completed',
  );
  await input().focus();
  const tabOrder = [];
  for (let i = 0; i < 17; i++) {
    await page.keyboard.press('Tab');
    tabOrder.push(
      await page.evaluate(() =>
        document.activeElement?.getAttribute('aria-label'),
      ),
    );
  }
  check(
    'Tab follows visual task order after completion and reaches the footer last',
    tabOrder.indexOf('Buy groceries') >= 0 &&
      tabOrder.indexOf('Buy groceries') < tabOrder.indexOf('Read a book') &&
      tabOrder.indexOf('Read a book') < tabOrder.indexOf('中文') &&
      tabOrder.indexOf('中文') < tabOrder.indexOf('Clear completed tasks'),
  );
  await button('Completed tasks').click();
  await settle();
  check(
    'completed filter shows only completed tasks',
    (await task('Buy groceries').count()) === 1 &&
      (await task('Read a book').count()) === 0,
  );
  await add('Plan the weekend');
  check(
    'adding from completed filter reveals the new active task',
    (await task('Plan the weekend').count()) === 1 &&
      (await button('All tasks').getAttribute('aria-pressed')) === 'true',
  );
  await button('Active tasks').click();
  await settle();
  check(
    'active filter hides completed tasks',
    (await task('Buy groceries').count()) === 0 &&
      (await task('Read a book').count()) === 1,
  );
  await task('Read a book').focus();
  await page.keyboard.press('Space');
  await settle();
  check(
    'Space toggles a checkbox once and removes it from active filter',
    (await task('Read a book').count()) === 0 &&
      (await state()).todos.filter((t) => t.completed).length === 2,
  );
  await button('All tasks').click();
  await settle();
  await button('Edit 中文').click();
  const editor = page.getByRole('textbox', { name: 'Edit task', exact: true });
  await editor.waitFor();
  await settle();
  check(
    'editing focuses and selects the existing title',
    await editor.evaluate(
      (e) =>
        document.activeElement === e &&
        e.selectionStart === 0 &&
        e.selectionEnd === e.value.length,
    ),
  );
  await editor.fill('   ');
  await editor.press('Enter');
  await settle();
  check(
    'blank editing is rejected without deleting or renaming the task',
    (await editor.getAttribute('aria-invalid')) === 'true' &&
      (await state()).todos.some((t) => t.text === '中文'),
  );
  await editor.fill('Draft that should not save');
  await editor.press('Escape');
  await settle();
  check(
    'Escape cancels editing and restores the Edit button',
    (await editor.count()) === 0 &&
      (await state()).todos.some((t) => t.text === '中文') &&
      (await button('Edit 中文').evaluate((e) => e === document.activeElement)),
  );
  await button('Edit 中文').click();
  await editor.waitFor();
  await editor.fill('  Prepare the agenda  ');
  await editor.press('Enter');
  await settle();
  check(
    'Enter saves a trimmed edit without changing task identity',
    (await state()).todos.find((t) => t.id === '3')?.text ===
      'Prepare the agenda' && (await task('Prepare the agenda').count()) === 1,
  );
  await task('Prepare the agenda').focus();
  await page.keyboard.press('Space');
  await settle();
  check(
    'edited task can still be toggled with the keyboard',
    (await task('Prepare the agenda').getAttribute('aria-checked')) === 'true',
  );
  await button('Delete Prepare the agenda').click();
  await settle();
  check(
    'delete removes only its task and preserves other completion states',
    (await state()).todos.length === 3 &&
      (await state()).todos.filter((t) => t.completed).length === 2,
  );
  await task('Mark all tasks complete').click();
  await settle();
  check(
    'mark all completes the remaining tasks',
    (await state()).todos.every((t) => t.completed),
  );
  await task('Mark all tasks active').focus();
  await page.keyboard.press('Space');
  await settle();
  check(
    'mark all active is keyboard operable',
    (await state()).todos.every((t) => !t.completed),
  );
  await task('Buy groceries').click();
  await settle();
  await button('Clear completed tasks').click();
  await settle();
  check(
    'clear completed retains active tasks and restores the composer',
    (await state()).todos.length === 2 &&
      (await state()).todos.every((t) => !t.completed) &&
      (await input().evaluate((e) => e === document.activeElement)),
  );
  await page.reload();
  await input().waitFor();
  await settle();
  check(
    'tasks survive a full page reload',
    (await task('Read a book').count()) === 1 &&
      (await task('Plan the weekend').count()) === 1 &&
      (await state()).todos.length === 2,
  );
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.setViewportSize({ width: 390, height: 760 });
  await settle();
  for (const control of [
    input(),
    button('Add task'),
    button('All tasks'),
    button('Clear completed tasks'),
  ]) {
    const box = await control.boundingBox();
    check(
      `mobile ${await control.getAttribute('aria-label')} fits the viewport`,
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 390 &&
        box.y + box.height <= 760,
    );
  }
  await add(
    'An intentionally long task title that wraps naturally in a narrow window without covering its controls',
  );
  const longTask = task(
    'An intentionally long task title that wraps naturally in a narrow window without covering its controls',
  );
  await page
    .getByRole('region', {
      name: 'Task list. Use arrow keys or Home and End to scroll.',
      exact: true,
    })
    .focus();
  await page.keyboard.press('End');
  await settle();
  await longTask.waitFor();
  check(
    'long task title retains independent edit and delete controls on mobile',
    (await button(
      'Edit An intentionally long task title that wraps naturally in a narrow window without covering its controls',
    ).count()) === 1,
  );
  await page.screenshot({ path: `${output}/mobile.png` });
  for (let i = 0; i < 9; i++) await add(`Scrollable task ${i}`);
  const region = page.getByRole('region', {
    name: 'Task list. Use arrow keys or Home and End to scroll.',
    exact: true,
  });
  await region.focus();
  await page.keyboard.press('End');
  await settle();
  check(
    'keyboard End reveals the final task inside the scroll viewport',
    await task('Scrollable task 8').isVisible(),
  );
  await task('Scrollable task 8').click();
  await settle();
  check(
    'scrolled checkbox hit geometry changes the correct persisted task',
    (await state()).todos.find((t) => t.text === 'Scrollable task 8')
      ?.completed === true,
  );
  await region.focus();
  await page.keyboard.press('Home');
  await settle();
  check(
    'keyboard Home reveals the first task again',
    await task('Read a book').isVisible(),
  );
  await task('Mark all tasks complete').click();
  await settle();
  await button('Clear completed tasks').click();
  await settle();
  check(
    'clearing every task returns to an empty usable list',
    (await state()).todos.length === 0 &&
      (await button('Clear completed tasks').isDisabled()),
  );
  await add('A new beginning');
  await task('A new beginning').waitFor();
  check(
    'adding after clearing all tasks creates a fresh working list',
    (await state()).todos.length === 1,
  );
  await page.setViewportSize({ width: 320, height: 640 });
  await settle();
  const compactControls = [
    input(),
    button('Add task'),
    button('Completed tasks'),
    button('Clear completed tasks'),
  ];
  for (const control of compactControls) {
    const box = await control.boundingBox();
    check(
      `320px ${await control.getAttribute('aria-label')} stays reachable`,
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 320 &&
        box.y + box.height <= 640,
    );
  }
  await page.screenshot({ path: `${output}/compact.png` });
  await page.setViewportSize({ width: 1200, height: 950 });
  await settle();
  check(
    'resizing back to desktop preserves the task list',
    (await task('A new beginning').count()) === 1,
  );
  const blocked = await browser.newPage();
  blocked.on('pageerror', (error) => errors.push(error.message));
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    };
  });
  await blocked.goto(process.env.TODO_URL ?? 'http://127.0.0.1:4260');
  const blockedInput = blocked.getByRole('textbox', {
    name: 'New task',
    exact: true,
  });
  await blockedInput.waitFor();
  await blockedInput.fill('Keep working offline');
  await blockedInput.press('Enter');
  await blocked
    .getByRole('checkbox', { name: 'Keep working offline', exact: true })
    .waitFor();
  check(
    'storage failure leaves the app editable without crashing',
    (await blocked
      .getByRole('checkbox', { name: 'Keep working offline', exact: true })
      .count()) === 1,
  );
  await blocked.close();
  await page.goto(
    new URL('/embedded.html', process.env.TODO_URL ?? 'http://127.0.0.1:4260')
      .href,
  );
  await page
    .getByRole('button', { name: 'Destroy left', exact: true })
    .waitFor();
  check(
    'existing embedded Canvas fixture still mounts both instances',
    (await page.locator('canvas').count()) === 2 &&
      (await page.locator('input').count()) === 2,
  );
  await page.getByRole('button', { name: 'Destroy left', exact: true }).click();
  await settle();
  check(
    'embedded fixture still destroys one instance independently',
    (await page.locator('input').count()) === 1,
  );
  check('no browser runtime or console errors', errors.length === 0);
  completed = true;
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ completed, checks, errors }, null, 2),
  );
  await browser.close();
}
