import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output =
  process.env.COLOR_PICKER_EVIDENCE_DIR ?? '/tmp/piant-cod173/browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1500, height: 1250 },
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
const pause = () => page.waitForTimeout(120);
const call = (method, ...args) =>
  page.evaluate(
    ({ method, args }) => window.colorPickerFixture[method](...args),
    { method, args },
  );
const info = (i = 0) =>
  page.evaluate((n) => window.colorPickerFixture.info()[n], i);
const button = (name) => page.getByRole('button', { name, exact: true });
const popup = (name = 'A 填充') =>
  page.getByRole('dialog', { name: `${name} Color editor`, exact: true });
const hex = (name = 'A 填充') =>
  page.getByRole('textbox', { name: `${name} Hex`, exact: true });
const area = (name = 'A 填充') =>
  page.getByRole('group', {
    name: `${name} Saturation and brightness`,
    exact: true,
  });
const channel = (suffix, name = 'A 填充') =>
  page.getByRole('spinbutton', {
    name: `${name} ${suffix}`,
    exact: true,
    includeHidden: true,
  });
const body = (name = 'A 填充') =>
  page.getByRole('region', {
    name: `${name} Scrollable color editor`,
    exact: true,
  });
const close = async (name = 'A 填充') => {
  await button(`Close ${name} Color editor`).focus();
  await page.keyboard.press('Enter');
  await pause();
};
const open = async (name = 'A 填充') => {
  await button(name).focus();
  await page.keyboard.press('Enter');
  await popup(name).waitFor();
  await pause();
};
async function reveal(locator, name = 'A 填充') {
  const scroller = body(name);
  if (await scroller.isVisible()) {
    await scroller.focus();
    await page.keyboard.press('Home');
    await pause();
  }
  for (let i = 0; i < 8; i++) {
    if (await locator.isVisible()) return;
    await scroller.focus();
    await page.keyboard.press('PageDown');
    await pause();
  }
  assert.ok(await locator.isVisible(), 'scrollable editor reveals target');
}
async function setChannel(suffix, value, name = 'A 填充') {
  const control = channel(suffix, name);
  await reveal(control, name);
  await control.fill(String(value));
  await page.keyboard.press('Enter');
  await pause();
}
async function fillHex(value, name = 'A 填充') {
  await reveal(hex(name), name);
  await hex(name).fill(value);
  await page.keyboard.press('Enter');
  await pause();
}
const center = async (locator, x = 0.5, y = 0.5) => {
  const r = await locator.boundingBox();
  assert.ok(r);
  return { x: r.x + r.width * x, y: r.y + r.height * y };
};
try {
  await page.goto(
    process.env.COLOR_PICKER_URL ?? 'http://127.0.0.1:4177/colorPicker.html',
  );
  await button('A 填充').waitFor();
  await button('B 填充').waitFor();
  check(
    'two layer editor instances initialize independently',
    (await info()).fill === '#3366ff80' && (await info(1)).fill === '#3366ff80',
  );
  let p = await center(button('A 填充'));
  await page.mouse.click(p.x, p.y);
  await popup().waitFor();
  await pause();
  check(
    'real Canvas trigger opens named nonmodal editor and focuses keyboard area',
    (await popup().getAttribute('aria-modal')) === 'false' &&
      (await area().evaluate((e) => document.activeElement === e)),
  );
  check(
    'area describes real numeric input alternatives',
    Boolean(await area().getAttribute('aria-describedby')),
  );
  await fillHex('#0f08');
  check(
    'short RGBA Hex commits canonical sRGB alpha',
    (await info()).fill === '#00ff0088' &&
      (await hex().inputValue()) === '#00ff0088',
  );
  const accepted = (await info()).accepted;
  await fillHex('not a color');
  await fillHex('');
  check(
    'invalid and empty Hex restore accepted value without extra commits',
    (await info()).accepted === accepted &&
      (await hex().inputValue()) === '#00ff0088',
  );
  await hex().fill('#abc');
  await page.keyboard.press('Escape');
  await pause();
  check(
    'first Escape cancels dirty Hex draft before dismissing',
    (await hex().inputValue()) === '#00ff0088' && (await popup().count()) === 1,
  );
  await page.keyboard.press('Escape');
  await pause();
  check(
    'clean Escape closes and restores trigger',
    (await popup().count()) === 0 &&
      (await button('A 填充').evaluate((e) => document.activeElement === e)),
  );
  await open();
  await reveal(hex());
  await hex().focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '中文',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  check(
    'CDP Chinese composition neither commits invalid color nor dismisses editor',
    (await popup().count()) === 1 &&
      (await info()).accepted === accepted &&
      (await hex().inputValue()).includes('中文'),
  );
  await cdp.send('Input.insertText', { text: '中文' });
  await pause();
  await page.keyboard.press('Escape');
  await pause();
  check(
    'post-composition Escape restores canonical draft',
    (await hex().inputValue()) === '#00ff0088',
  );
  await setChannel('Hue', 0);
  await setChannel('Saturation', 100);
  await setChannel('Brightness', 100);
  check(
    'numeric HSV alternatives project to expected accepted color',
    (await info()).fill === '#ff000088',
  );
  await reveal(area());
  p = await center(area());
  await page.mouse.click(p.x, p.y);
  await pause();
  check(
    'pointer plane maps to saturation and brightness consistently',
    Math.abs(Number(await channel('Saturation').inputValue()) - 50) < 2 &&
      Math.abs(Number(await channel('Brightness').inputValue()) - 50) < 2 &&
      (await info()).fill.endsWith('88'),
  );
  await area().focus();
  await page.keyboard.press('ArrowRight');
  await pause();
  const s = Number(await channel('Saturation').inputValue());
  check(
    'area keyboard increments the same saturation channel by one percent',
    s > 50 && s < 52,
  );
  await reveal(channel('Saturation'));
  await channel('Saturation').focus();
  await page.keyboard.press('ArrowUp');
  await pause();
  check(
    'native channel stepping continues the same editing state',
    Number(await channel('Saturation').inputValue()) > s,
  );
  await reveal(
    page.getByRole('slider', { name: 'A 填充 Hue slider', exact: true }),
  );
  await page
    .getByRole('slider', { name: 'A 填充 Hue slider', exact: true })
    .focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await pause();
  check(
    'hue slider has actual keyboard range semantics',
    Number(await channel('Hue').inputValue()) === 1,
  );
  await setChannel('Alpha', 50);
  check(
    'alpha percent serializes to the nearest byte',
    (await info()).fill.endsWith('80'),
  );
  const alphaSlider = page.getByRole('slider', {
    name: 'A 填充 Alpha slider',
    exact: true,
  });
  await reveal(alphaSlider);
  await alphaSlider.focus();
  await page.keyboard.press('Home');
  await pause();
  check(
    'transparent endpoint preserves RGB while setting alpha zero',
    (await info()).fill.endsWith('00'),
  );
  await page.keyboard.press('End');
  await pause();
  check('opaque endpoint sets full alpha', (await info()).fill.endsWith('ff'));
  await call('action', 0, 'setFill', '#80808080');
  await pause();
  await setChannel('Hue', 180);
  await setChannel('Saturation', 100);
  check(
    'gray retains authored hue when saturation becomes meaningful',
    (await info()).fill === '#00808080',
  );
  await fillHex('#00000080');
  await setChannel('Hue', 180);
  await setChannel('Saturation', 100);
  await setChannel('Brightness', 50);
  check(
    'black retains hue and saturation until brightness increases',
    (await info()).fill === '#00808080',
  );
  await call('action', 0, 'setReject', true);
  const requested = (await info()).requests;
  await fillHex('#ffffff80');
  check(
    'rejected controlled updates retain accepted RGB and canonical editor state',
    (await info()).fill === '#00808080' &&
      (await hex().inputValue()) === '#00808080' &&
      (await info()).requests === requested + 1,
  );
  await call('action', 0, 'setReject', false);
  await reveal(channel('Hue'));
  await channel('Hue').fill('75');
  await page.keyboard.press('Escape');
  await pause();
  check(
    'Escape discards uncommitted numeric draft instead of blur committing',
    (await popup().count()) === 0 && (await info()).fill === '#00808080',
  );
  await open();
  await call('action', 0, 'setReadOnly', true);
  await pause();
  await reveal(hex());
  const readonlyBefore = (await info()).requests;
  await hex().focus();
  await hex().evaluate((e) => e.setSelectionRange(0, 3));
  check(
    'read-only editor permits native selection and copy alternatives',
    await hex().evaluate(
      (e) => e.readOnly && e.selectionStart === 0 && e.selectionEnd === 3,
    ),
  );
  await reveal(area());
  p = await center(area(), 0.8, 0.2);
  await page.mouse.click(p.x, p.y);
  await pause();
  check(
    'read-only plane does not request changes',
    (await info()).requests === readonlyBefore,
  );
  await call('action', 0, 'setReadOnly', false);
  await call('action', 0, 'setDisabled', true);
  await pause();
  check(
    'disabling an open picker releases popup and removes trigger from Tab',
    (await popup().count()) === 0 &&
      (await button('A 填充').isDisabled()) &&
      (await button('A 填充').getAttribute('tabindex')) === '-1',
  );
  await open('A 轮廓');
  await fillHex('#abcd', 'A 轮廓');
  check(
    'opaque picker emits six digits and has no alpha controls',
    (await info()).outline === '#aabbcc' &&
      (await channel('Alpha', 'A 轮廓').count()) === 0 &&
      (await popup('A 轮廓').count()) === 1,
  );
  await close('A 轮廓');
  await call('action', 0, 'setDisabled', false);
  await open();
  await reveal(area());
  p = await center(area(), 0.25, 0.25);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  const downColor = (await info()).fill;
  await page.mouse.move(p.x + 50, p.y + 20, { steps: 4 });
  await page.mouse.up();
  await pause();
  check(
    'actual drag changes both channels without dropping alpha',
    (await info()).fill.endsWith('80') && (await info()).fill !== downColor,
  );
  await call('scale', 0, 0.75);
  await pause();
  await reveal(area());
  p = await center(area(), 0.25, 0.25);
  await page.mouse.click(p.x, p.y);
  await pause();
  check(
    'CSS-scaled parent keeps local plane coordinates',
    Math.abs(Number(await channel('Saturation').inputValue()) - 25) < 2 &&
      Math.abs(Number(await channel('Brightness').inputValue()) - 75) < 2,
  );
  await call('scale', 0, 1);
  await pause();
  await reveal(area());
  p = await center(area());
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x + 30, y: p.y - 20, id: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await pause();
  check(
    'Chrome touch input changes SV through the same panel',
    Number(await channel('Saturation').inputValue()) > 50 &&
      Number(await channel('Brightness').inputValue()) > 50,
  );
  p = await center(area());
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(900, 800);
  await page.mouse.up();
  await pause();
  const released = (await info()).fill;
  await page.mouse.move(p.x, p.y);
  await pause();
  check(
    'release outside the popup removes drag ownership',
    (await info()).fill === released,
  );
  p = await center(area());
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.evaluate(() =>
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })),
  );
  const cancelled = (await info()).fill;
  await page.mouse.move(p.x + 70, p.y + 20);
  await page.mouse.up();
  await pause();
  check(
    'pointer cancellation prevents later stale drag changes',
    (await info()).fill === cancelled,
  );
  await reveal(hex());
  const handle = await hex().elementHandle();
  await call('appearance', 0, true);
  await call('width', 0, 300);
  await page.setViewportSize({ width: 390, height: 1100 });
  await pause();
  check(
    'dark compact large text preserves native editor identity',
    await handle.evaluate(
      (e) => e.isConnected && Number.parseFloat(e.style.fontSize) >= 24,
    ),
  );
  const bounds = await popup().boundingBox();
  check(
    'narrow popup stays inside the browser viewport',
    bounds.x >= 0 && bounds.x + bounds.width <= 391,
  );
  await page.screenshot({ path: `${output}/narrow-dark.png` });
  await reveal(channel('Alpha'));
  check(
    'keyboard scrolling reaches the numeric alpha alternative at 200 percent',
    await channel('Alpha').isVisible(),
  );
  const ax = await cdp.send('Accessibility.getFullAXTree');
  await writeFile(`${output}/accessibility.json`, JSON.stringify(ax, null, 2));
  check(
    'Chrome AX exposes named dialog and numeric alternatives',
    ax.nodes.some(
      (n) =>
        !n.ignored &&
        n.role?.value === 'dialog' &&
        n.name?.value === 'A 填充 Color editor',
    ) &&
      ax.nodes.some(
        (n) =>
          !n.ignored &&
          n.role?.value === 'spinbutton' &&
          n.name?.value === 'A 填充 Alpha',
      ),
  );
  await close();
  await call('appearance', 0, false);
  await call('width', 0, 680);
  await page.setViewportSize({ width: 1500, height: 1250 });
  await pause();
  await open();
  await open('B 填充');
  check(
    'two independent instance popups can coexist',
    (await popup().count()) === 1 && (await popup('B 填充').count()) === 1,
  );
  const aState = (await info()).fill;
  await fillHex('#f008', 'B 填充');
  check(
    'editing instance B leaves A unchanged',
    (await info(1)).fill === '#ff000088' && (await info()).fill === aState,
  );
  await close('B 填充');
  check('closing B does not dismiss A', (await popup().count()) === 1);
  await page.screenshot({ path: `${output}/two-instances.png` });
  for (let i = 0; i < 3; i++) {
    await reveal(hex());
    const old = await hex().elementHandle();
    await reveal(area());
    p = await center(area());
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    const during = await info();
    await call('stop', 0);
    await page.mouse.up();
    await old.evaluate((e) => {
      e.value = '#ffffff';
      e.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await pause();
    check(
      `open/drag teardown ${i + 1} releases native editor and ignores stale input`,
      (await old.evaluate((e) => !e.isConnected)) &&
        (await popup().count()) === 0 &&
        (await page.locator('[data-instance=A] canvas').count()) === 0 &&
        (await info()).requests === during.requests,
    );
    await call('start', 0);
    await button('A 填充').waitFor();
    check(
      `remount ${i + 1} resets A while preserving B`,
      (await info()).fill === '#3366ff80' &&
        (await info()).requests === 0 &&
        (await info(1)).fill === '#ff000088',
    );
    await open();
  }
  await call('stop', 0);
  await call('stop', 1);
  await pause();
  check(
    'all color hosts release canvases native inputs and overlay shells',
    (await page.locator('canvas,input,[data-piant-overlay]').count()) === 0,
  );
  check(
    'no browser runtime or resource errors',
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
          'Chrome mouse/touch/CDP composition/AX are engineering evidence, not OS Chinese candidate windows, VoiceOver or touch hardware certification.',
          'pointercancel is dispatched to exercise cleanup.',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
