import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(
  process.env.CONTAINERS_EVIDENCE_DIR ?? '/tmp/piant-cod164',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
const test = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const tab = (name) => page.getByRole('tab', { name, exact: true });
const button = (name) => page.getByRole('button', { name, exact: true });
const input = (name) => page.getByRole('textbox', { name, exact: true });
const activate = async (name) => {
  await button(name).focus();
  await page.keyboard.press('Enter');
};
const activeName = () =>
  page.evaluate(() => document.activeElement.getAttribute('aria-label'));
const invokeWithoutFocus = (name) =>
  page.evaluate(
    (name) =>
      [...document.querySelectorAll('button')]
        .find((element) => element.getAttribute('aria-label') === name)
        .click(),
    name,
  );
const wait = () => page.waitForTimeout(70);
try {
  await page.goto(
    process.env.CONTAINERS_TEST_URL ?? 'http://127.0.0.1:5173/ui/containers',
  );
  await tab('资料').waitFor();
  await button('声音选项').waitFor();
  test(
    'stable tab IDs reference panels even before lazy creation',
    await page.evaluate(() =>
      [...document.querySelectorAll('[role=tab]')].every(
        (element) =>
          document
            .getElementById(element.getAttribute('aria-controls'))
            ?.getAttribute('aria-labelledby') === element.id,
      ),
    ),
  );
  test(
    'one tab header participates in Tab',
    await page.evaluate(
      () =>
        [...document.querySelectorAll('[role=tab]')].filter(
          (element) => element.tabIndex === 0,
        ).length === 1,
    ),
  );
  await tab('资料').focus();
  await page.keyboard.press('Tab');
  test(
    'Tab enters the labelled tabpanel',
    await page.evaluate(
      () => document.activeElement.getAttribute('role') === 'tabpanel',
    ),
  );
  await page.keyboard.press('Tab');
  test(
    'Tab then enters native panel input',
    (await activeName()) === '资料草稿',
  );
  await page.keyboard.press('Shift+Tab');
  test(
    'Shift+Tab returns from input to its panel',
    await page.evaluate(
      () => document.activeElement.getAttribute('role') === 'tabpanel',
    ),
  );
  await page.keyboard.press('Shift+Tab');
  test(
    'Shift+Tab returns from panel to current tab header',
    (await activeName()) === '资料',
  );
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await input('资料草稿').fill('保留的资料');
  const profile = await input('资料草稿').elementHandle();
  await tab('资料').focus();
  await page.keyboard.press('ArrowRight');
  await input('偏好草稿').waitFor();
  test(
    'automatic arrow navigation selects and reveals next panel',
    (await tab('偏好').getAttribute('aria-selected')) === 'true',
  );
  test(
    'retained hidden input rejects programmatic focus',
    await profile.evaluate((element) => {
      element.focus();
      return document.activeElement !== element;
    }),
  );
  await activate('改为手动激活');
  await tab('偏好').focus();
  await page.keyboard.press('Home');
  test(
    'manual Home moves focus without selecting',
    (await activeName()) === '资料' &&
      (await tab('偏好').getAttribute('aria-selected')) === 'true',
  );
  await page.keyboard.press('Enter');
  await input('资料草稿').waitFor();
  test(
    'manual Enter selects retained content and preserves identity',
    (await input('资料草稿').inputValue()) === '保留的资料' &&
      (await profile.evaluate(
        (element) => document.getElementById(element.id) === element,
      )),
  );
  await activate('禁用高级页');
  await tab('资料').focus();
  await page.keyboard.press('End');
  test(
    'End skips disabled tab',
    (await activeName()) === '偏好' && (await tab('高级').isDisabled()),
  );
  await activate('启用高级页');
  await tab('高级').focus();
  await page.keyboard.press('Space');
  await input('高级草稿').fill('被删除的草稿');
  await invokeWithoutFocus('移除高级页');
  await tab('高级').waitFor({ state: 'detached' });
  await wait();
  test(
    'removing selected controlled key closes panel and safely repairs focus',
    (await page.getByRole('tabpanel').count()) === 0 &&
      (await page.evaluate(
        () =>
          document.activeElement !== document.body &&
          document.activeElement.isConnected,
      )),
  );
  await activate('恢复高级页');
  await tab('高级').focus();
  await page.keyboard.press('Enter');
  await input('高级草稿').waitFor();
  test(
    'readding removed key creates fresh content',
    (await input('高级草稿').inputValue()) === '高级初始内容',
  );
  await tab('资料').focus();
  await page.keyboard.press('Enter');
  await activate('反转标签顺序');
  await activate('切换标签主题');
  test(
    'reorder and theme preserve keyed input identity and draft',
    (await input('资料草稿').inputValue()) === '保留的资料' &&
      (await profile.evaluate(
        (element) => document.getElementById(element.id) === element,
      )),
  );
  await page
    .locator('.live-example')
    .nth(0)
    .screenshot({ path: `${output}/tabs.png` });
  await input('保留草稿').fill('折叠后继续');
  const kept = await input('保留草稿').elementHandle();
  await invokeWithoutFocus('保留编辑内容');
  await wait();
  test(
    'Collapsible hide restores trigger focus',
    (await activeName()) === '保留编辑内容' &&
      (await button('保留编辑内容').getAttribute('aria-expanded')) === 'false',
  );
  test(
    'lazy hidden field is outside keyboard focus and AX queries',
    (await input('保留草稿').count()) === 0 &&
      (await kept.evaluate((element) => {
        element.focus();
        return document.activeElement !== element;
      })),
  );
  await activate('保留编辑内容');
  await input('保留草稿').waitFor();
  test(
    'lazy reopen preserves native input object and text',
    (await input('保留草稿').inputValue()) === '折叠后继续' &&
      (await kept.evaluate(
        (element) => document.getElementById(element.id) === element,
      )),
  );
  await input('释放草稿').fill('此值应释放');
  const released = await input('释放草稿').elementHandle();
  await activate('关闭释放内容');
  await wait();
  test(
    'unmount policy destroys old input',
    !(await released.evaluate((element) => element.isConnected)),
  );
  await activate('关闭释放内容');
  await input('释放草稿').waitFor();
  test(
    'unmount reopen resets the draft with a fresh input',
    (await input('释放草稿').inputValue()) !== '此值应释放' &&
      !(await released.evaluate(
        (element) => document.getElementById(element.id) === element,
      )),
  );
  await activate('禁用保留面板');
  test(
    'disabled disclosure is excluded from Tab',
    (await button('保留编辑内容').isDisabled()) &&
      (await button('保留编辑内容').getAttribute('tabindex')) === '-1',
  );
  await activate('启用保留面板');
  await page
    .locator('.live-example')
    .nth(1)
    .screenshot({ path: `${output}/collapsible.png` });
  await input('单开账户草稿').fill('账户保留');
  const account = await input('单开账户草稿').elementHandle();
  await button('账户设置').focus();
  await page.keyboard.press('ArrowDown');
  test(
    'Accordion arrow moves focus without opening',
    (await activeName()) === '显示设置' &&
      (await button('显示设置').getAttribute('aria-expanded')) === 'false',
  );
  await page.keyboard.press('Enter');
  await input('单开显示草稿').waitFor();
  test(
    'single Accordion closes old item and opens one new item',
    (await input('单开账户草稿').count()) === 0 &&
      (await button('账户设置').getAttribute('aria-expanded')) === 'false',
  );
  await activate('账户设置');
  await activate('反转单开标题顺序');
  await activate('切换手风琴主题');
  test(
    'Accordion keyed reorder preserves retained input',
    (await input('单开账户草稿').inputValue()) === '账户保留' &&
      (await account.evaluate(
        (element) => document.getElementById(element.id) === element,
      )),
  );
  test(
    'all enabled Accordion headings retain Tab stops',
    (await button('账户设置').getAttribute('tabindex')) === '0' &&
      (await button('显示设置').getAttribute('tabindex')) === '0',
  );
  await activate('禁用显示设置');
  await button('账户设置').focus();
  await page.keyboard.press('Home');
  test(
    'Accordion navigation skips disabled heading',
    (await activeName()) === '账户设置' &&
      (await button('显示设置').isDisabled()),
  );
  await activate('启用显示设置');
  await activate('声音选项');
  await input('多开声音草稿').waitFor();
  test(
    'multiple Accordion shows independent expanded items',
    (await input('多开声音草稿').count()) === 1 &&
      (await input('多开画面草稿').count()) === 1,
  );
  await input('多开声音草稿').focus();
  await invokeWithoutFocus('声音选项');
  await wait();
  test(
    'closing one multiple item restores focus and leaves peer open',
    (await activeName()) === '声音选项' &&
      (await input('多开声音草稿').count()) === 0 &&
      (await input('多开画面草稿').count()) === 1,
  );
  const cdp = await page.context().newCDPSession(page);
  const ax = await cdp.send('Accessibility.getFullAXTree');
  const nodes = ax.nodes.filter((node) => !node.ignored);
  test(
    'AX exposes tablist, labelled panel and native input',
    nodes.some(
      (node) =>
        node.role?.value === 'tablist' && node.name?.value === '个人设置',
    ) &&
      nodes.some(
        (node) =>
          node.role?.value === 'tabpanel' && node.name?.value === '资料',
      ) &&
      nodes.some(
        (node) =>
          node.role?.value === 'textbox' && node.name?.value === '资料草稿',
      ),
  );
  test(
    'AX exposes Accordion heading and excludes hidden content',
    nodes.some(
      (node) =>
        node.role?.value === 'heading' && node.name?.value === '账户设置',
    ) &&
      !nodes.some(
        (node) =>
          node.role?.value === 'textbox' &&
          ['偏好草稿', '高级草稿', '多开声音草稿', '单开显示草稿'].includes(
            node.name?.value,
          ),
      ),
  );
  await input('单开账户草稿').scrollIntoViewIfNeeded();
  await wait();
  const inputRect = await input('单开账户草稿').boundingBox();
  test(
    'region adoption preserves native input hit position',
    await page.evaluate(
      ({ x, y, width, height }) =>
        document
          .elementFromPoint(x + width / 2, y + height / 2)
          ?.getAttribute('aria-label') === '单开账户草稿',
      inputRect,
    ),
  );
  await page
    .locator('.live-example')
    .nth(2)
    .screenshot({ path: `${output}/accordion.png` });
  await writeFile(
    `${output}/accessibility.json`,
    JSON.stringify(
      nodes.filter((node) =>
        [
          'tablist',
          'tab',
          'tabpanel',
          'heading',
          'button',
          'textbox',
          'region',
        ].includes(node.role?.value),
      ),
      null,
      2,
    ),
  );
  const handles = [profile, kept, account];
  const rerun = page.getByRole('button', { name: '重新运行代码', exact: true });
  for (let i = 0; i < 3; i++) {
    await rerun.nth(i).click();
    await wait();
  }
  await tab('资料').waitFor();
  test(
    'rerunning each example releases old native nodes',
    (
      await Promise.all(
        handles.map((handle) =>
          handle.evaluate((element) => !element.isConnected),
        ),
      )
    ).every(Boolean),
  );
  test('no browser runtime errors', errors.length === 0);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify({ browser: browser.version(), checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
