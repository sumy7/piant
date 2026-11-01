import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(process.env.SLIDER_EVIDENCE_DIR ?? '/tmp/piant-cod163');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1380, height: 900 } });
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
const test = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const read = (fn) => page.evaluate(fn);
const point = (fraction, cross = 0, id = 'a') =>
  page.evaluate(
    ([fraction, cross, id]) => window.sliderFixture[id].point(fraction, cross),
    [fraction, cross, id],
  );
const move = async (fraction, cross = 0, id = 'a') => {
  const p = await point(fraction, cross, id);
  await page.mouse.move(p.x, p.y, { steps: 4 });
  return p;
};
const slider = (id = 'a') =>
  page.getByRole('slider', { name: `speed-${id}`, exact: true });
const value = () => read(() => window.sliderFixture.a.value());
const wait = () => page.waitForTimeout(50);
try {
  await page.goto(
    process.env.SLIDER_TEST_URL ?? 'http://127.0.0.1:4177/slider.html',
  );
  await page.waitForFunction(() => window.sliderFixture?.b);
  test(
    'initial state and semantic range do not emit changes',
    await read(() => {
      const a = window.sliderFixture.a;
      const proxy = document.querySelector('[aria-label=speed-a]');
      return (
        a.value() === 0 &&
        a.events.length === 0 &&
        proxy.getAttribute('aria-valuemin') === '-1' &&
        proxy.getAttribute('aria-valuemax') === '1' &&
        proxy.getAttribute('aria-valuetext') === '0x'
      );
    }),
  );
  await move(0.75);
  await page.mouse.down();
  await page.mouse.up();
  test(
    'track click snaps decimal value once',
    (await value()) === 0.5 &&
      (await read(() => window.sliderFixture.a.events.length === 1)),
  );
  test(
    'pointer click focuses the slider proxy',
    await read(
      () => document.activeElement.getAttribute('aria-label') === 'speed-a',
    ),
  );
  const start = await point(0.75);
  await page.mouse.move(start.x + 5, start.y);
  await page.mouse.down();
  test('grabbing the thumb edge does not jump', (await value()) === 0.5);
  const end = await point(0.9);
  await page.mouse.move(end.x + 5, end.y, { steps: 6 });
  await page.mouse.up();
  test('drag preserves thumb grab offset', (await value()) === 0.8);
  await move(0.9);
  await page.mouse.down();
  await move(2);
  test('dragging outside Canvas clamps to maximum', (await value()) === 1);
  await move(-1);
  await page.mouse.up();
  test(
    'outside release clamps to minimum and ends drag',
    (await value()) === -1,
  );
  const count = await read(() => window.sliderFixture.a.events.length);
  await move(0.5);
  test(
    'movement after outside release emits nothing',
    (await read(() => window.sliderFixture.a.events.length)) === count,
  );
  await read(() => {
    const a = window.sliderFixture.a;
    a.outer()._view.scale.set(1.2, 0.8);
    a.inner()._view.rotation = 0.18;
    a.inner()._view.skew.set(0.08, -0.04);
    document.querySelector('#clip-a').style.transform = 'scale(.75)';
  });
  await move(0.25);
  await page.mouse.down();
  await move(0.8);
  await page.mouse.up();
  test(
    'CSS scaling and nested Pixi scale/rotation/skew use local coordinates',
    (await value()) === 0.6,
  );
  await page.screenshot({ path: `${output}/slider-transforms.png` });
  await read(() => {
    const a = window.sliderFixture.a;
    a.outer()._view.scale.set(1);
    a.inner()._view.rotation = 0;
    a.inner()._view.skew.set(0);
    document.querySelector('#clip-a').style.transform = '';
    a.setValue(0);
    a.setAccept(false);
  });
  await move(0.75);
  await page.mouse.down();
  await page.mouse.up();
  test(
    'controlled rejection preserves thumb and range value',
    (await value()) === 0 &&
      (await slider().getAttribute('aria-valuenow')) === '0',
  );
  await read(() => window.sliderFixture.a.setAccept(true));
  await slider().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  test(
    'keyboard decimal steps have stable value and text',
    (await value()) === 0.3 &&
      (await slider().getAttribute('aria-valuetext')) === '0.3x',
  );
  await page.keyboard.press('Home');
  test('Home selects minimum', (await value()) === -1);
  await page.keyboard.press('End');
  test('End selects maximum', (await value()) === 1);
  await read(() => {
    const a = window.sliderFixture.a;
    a.setMin(0);
    a.setMax(10);
    a.setStep(3);
    a.setValue(0);
  });
  await page.keyboard.press('End');
  test(
    'unaligned maximum uses last legal step',
    (await value()) === 9 &&
      (await slider().getAttribute('aria-valuemax')) === '10',
  );
  await read(() => {
    const a = window.sliderFixture.a;
    a.setMin(-1);
    a.setMax(1);
    a.setStep(0.1);
    a.setValue(0);
    a.setDir('rtl');
  });
  await page.keyboard.press('ArrowRight');
  test(
    'RTL Right moves toward visual right and decreases value',
    (await value()) === -0.1,
  );
  await move(0);
  await page.mouse.down();
  await page.mouse.up();
  test('RTL left endpoint is maximum', (await value()) === 1);
  await read(() => {
    const a = window.sliderFixture.a;
    a.setDir('ltr');
    a.setValue(0);
  });
  await move(0.5);
  await page.mouse.down();
  await move(0.8);
  const beforeCancel = await value();
  await page.evaluate(() =>
    window.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }),
    ),
  );
  await move(0.2);
  await page.mouse.up();
  test(
    'native pointercancel signal retains latest value and stops updates',
    (await value()) === beforeCancel,
  );
  await move(0.5);
  await page.mouse.down();
  await move(0.7);
  const beforeDisable = await value();
  await read(() => window.sliderFixture.a.setDisabled(true));
  await move(0.1);
  await page.mouse.up();
  test(
    'disabled during drag cancels and prevents further changes',
    (await value()) === beforeDisable && (await slider().isDisabled()),
  );
  const disabledCount = await read(() => window.sliderFixture.a.events.length);
  await move(0.9);
  await page.mouse.down();
  await page.mouse.up();
  test(
    'disabled pointer interaction emits nothing',
    (await read(() => window.sliderFixture.a.events.length)) === disabledCount,
  );
  await read(() => window.sliderFixture.a.setDisabled(false));
  await move(0.5);
  await page.mouse.down();
  await move(0.65);
  const beforeBlur = await value();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await move(0.2);
  await page.mouse.up();
  test('window blur clears drag resources', (await value()) === beforeBlur);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await move(0.5);
  await page.mouse.down();
  await move(0.7);
  const beforeModal = await value();
  await read(() => window.sliderFixture.a.modal.setOpen(true));
  await page.waitForFunction(() => window.sliderFixture.a.modal.ready());
  await move(0.2);
  await page.mouse.up();
  test(
    'opening instance modal during drag cancels background changes',
    (await value()) === beforeModal,
  );
  await read(() => window.sliderFixture.a.modal.setOpen(false));
  const vertical = page.getByRole('slider', {
    name: 'vertical-a',
    exact: true,
  });
  await vertical.focus();
  await page.keyboard.press('ArrowUp');
  test(
    'vertical range increases upward with correct orientation',
    (await vertical.getAttribute('aria-valuenow')) === '6' &&
      (await vertical.getAttribute('aria-orientation')) === 'vertical',
  );
  const vbox = await vertical.boundingBox();
  await page.mouse.move(vbox.x + vbox.width / 2, vbox.y + 15);
  await page.mouse.down();
  await page.mouse.up();
  test(
    'vertical top endpoint selects maximum',
    (await vertical.getAttribute('aria-valuenow')) === '10',
  );
  await move(0.8, 0, 'b');
  await page.mouse.down();
  await page.mouse.up();
  test(
    'two Canvas instances keep independent values and callbacks',
    await read(
      () =>
        window.sliderFixture.b.value() === 0.6 &&
        window.sliderFixture.a.value() !== 0.6,
    ),
  );
  await read(() => {
    window.sliderFixture.a.setDark(true);
    window.sliderFixture.a.setValue(0.2);
  });
  await wait();
  test(
    'theme update preserves semantic node and live value',
    (await slider().getAttribute('aria-valuenow')) === '.2' ||
      (await slider().getAttribute('aria-valuenow')) === '0.2',
  );
  await page.screenshot({ path: `${output}/slider-dark.png` });
  await move(0.6);
  await page.mouse.down();
  await move(0.75);
  await read(() => window.sliderFixture.a.instance.destroy());
  const unmountedCount = await read(() => window.sliderFixture.a.events.length);
  await page.mouse.move(20, 20);
  await page.mouse.up();
  test(
    'unmount during drag removes semantics and late callbacks',
    (await slider().count()) === 0 &&
      (await read(() => window.sliderFixture.a.events.length)) ===
        unmountedCount,
  );
  await read(() => window.sliderFixture.b.instance.destroy());
  await wait();
  test(
    'all instance proxies released on teardown',
    (await page.getByRole('slider').count()) === 0,
  );
  test('no browser runtime errors', errors.length === 0);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify({ browser: browser.version(), checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
