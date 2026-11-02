import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Use an already installed Playwright; this verification adds no package dependency.
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? 'playwright'
);
const output = resolve(process.env.OVERLAY_EVIDENCE_DIR ?? '/tmp/piant-cod165');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 760 } });
const errors = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
const check = (name, value) => {
  assert.ok(value, name);
  checks.push(name);
  console.log(`PASS ${name}`);
};
const fixture = (fn) => page.evaluate(fn);
const wait = () => page.waitForTimeout(80);
const activate = async (name) => {
  await page.getByRole('button', { name, exact: true }).focus();
  await page.keyboard.press('Enter');
};
const pointer = async (name) => {
  const box = await page
    .getByRole('button', { name, exact: true })
    .boundingBox();
  assert.ok(box, name);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};
try {
  await page.goto(process.env.OVERLAY_TEST_URL ?? 'http://127.0.0.1:4177');
  await page.waitForFunction(() => window.overlayFixture?.b);
  await activate('open-a');
  await page.waitForFunction(() => window.overlayFixture.a.overlay.ready());
  check(
    'opening keyboard event does not dismiss',
    await fixture(() => window.overlayFixture.a.overlay.open()),
  );
  await fixture(() => {
    document.querySelector('#first').style.height = '140px';
  });
  await wait();
  check(
    'surface escapes ancestor overflow clipping',
    await fixture(() => {
      const surface = window.overlayFixture.a.overlay.element();
      const box = surface.getBoundingClientRect();
      return (
        box.bottom >
          document.querySelector('#first').getBoundingClientRect().bottom &&
        surface.contains(document.elementFromPoint(box.x + 10, box.bottom - 10))
      );
    }),
  );
  await fixture(() => window.overlayFixture.a.setTop(true));
  await wait();
  check(
    'Canvas surface occludes background native Input',
    await fixture(() => {
      const input = document.querySelector('[aria-label=background-input-a]');
      const box = input.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + 50, box.y + 10);
      return (
        window.overlayFixture.a.overlay.element().contains(hit) && hit !== input
      );
    }),
  );
  await page
    .getByRole('textbox', { name: 'overlay-input-a', exact: true })
    .fill('前景可编辑');
  check(
    'foreground native Input receives editing and focus',
    (await page
      .getByRole('textbox', { name: 'overlay-input-a', exact: true })
      .inputValue()) === '前景可编辑',
  );
  await page.screenshot({ path: `${output}/input-occlusion.png` });
  await fixture(() => {
    window.overlayFixture.a.setTop(false);
    document.querySelector('#first').style.height = '320px';
    document.querySelector('#first').style.transform = 'scale(.7)';
  });
  await wait();
  check(
    'CSS host scaling converts anchor to viewport pixels',
    await fixture(() => {
      const a = window.overlayFixture.a;
      const anchor = a.anchor().element.getBoundingClientRect();
      const surface = a.overlay.element().getBoundingClientRect();
      return (
        Math.abs(surface.x - anchor.x) < 1 &&
        Math.abs(surface.y - anchor.bottom - 4) < 1 &&
        surface.width === 300
      );
    }),
  );
  await fixture(() => {
    window.overlayFixture.a.instance.app.stage.scale.set(0.9);
  });
  await wait();
  check(
    'Pixi stage scaling updates anchor coordinates',
    await fixture(() => {
      const a = window.overlayFixture.a;
      return (
        Math.abs(
          a.overlay.element().getBoundingClientRect().y -
            a.anchor().element.getBoundingClientRect().bottom -
            4,
        ) < 1
      );
    }),
  );
  await fixture(() => {
    window.overlayFixture.a.instance.app.stage.scale.set(1);
    window.overlayFixture.a.scroller.scrollY = -10;
  });
  await wait();
  check(
    'Canvas ScrollView updates anchor without Yoga relayout',
    await fixture(() => {
      const a = window.overlayFixture.a;
      return (
        Math.abs(a.scroller.scrollY) > 1 &&
        Math.abs(
          a.overlay.element().getBoundingClientRect().y -
            a.anchor().element.getBoundingClientRect().bottom -
            4,
        ) < 1
      );
    }),
  );
  await fixture(() => {
    window.overlayFixture.a.scroller.scrollTop();
    window.overlayFixture.a.setLarge(true);
  });
  await wait();
  check(
    'available height constrains oversized content',
    await fixture(() => {
      const a = window.overlayFixture.a;
      return (
        a.overlay.element().getBoundingClientRect().height <=
        a.overlay.position().availableHeight + 1
      );
    }),
  );
  await fixture(() => window.overlayFixture.a.setLarge(false));
  await fixture(() => {
    document.querySelector('#first').style.transform = '';
    document.querySelector('#first').style.marginLeft = '960px';
    document.querySelector('#first').style.marginTop = '580px';
  });
  await wait();
  check(
    'viewport edge flip and shift',
    await fixture(() => {
      const a = window.overlayFixture.a;
      const rect = a.overlay.element().getBoundingClientRect();
      return (
        a.overlay.position().placement.startsWith('top') &&
        rect.right <= innerWidth - 8 &&
        rect.left >= 8
      );
    }),
  );
  await page.screenshot({ path: `${output}/edge-positioning.png` });
  await page.evaluate(() => window.scrollTo(0, 200));
  await wait();
  check(
    'scroll updates anchored placement',
    await fixture(() => {
      const a = window.overlayFixture.a;
      const rect = a.anchor().element.getBoundingClientRect();
      const surface = a.overlay.element().getBoundingClientRect();
      return (
        Math.abs(surface.y - rect.bottom - 4) < 1 ||
        Math.abs(surface.bottom - rect.top + 4) < 1
      );
    }),
  );
  await page.setViewportSize({ width: 1000, height: 650 });
  await wait();
  check(
    'resize keeps surface within viewport',
    await fixture(
      () =>
        window.overlayFixture.a.overlay.element().getBoundingClientRect()
          .right <=
        innerWidth - 8,
    ),
  );
  await page.setViewportSize({ width: 1120, height: 760 });
  await fixture(() => {
    window.overlayFixture.a.overlay.setOpen(false);
    document.querySelector('#first').removeAttribute('style');
    scrollTo(0, 0);
  });
  await activate('modal-a');
  await page.waitForFunction(() => window.overlayFixture.a.modal.ready());
  check(
    'modal enters native Input',
    await fixture(
      () =>
        document.activeElement.getAttribute('aria-label') === 'modal-input-a',
    ),
  );
  await page.keyboard.press('Shift+Tab');
  check(
    'Shift+Tab wraps inside modal',
    await fixture(
      () =>
        document.activeElement.getAttribute('aria-label') === 'modal-close-a',
    ),
  );
  await page.keyboard.press('Tab');
  check(
    'Tab wraps back to native Input',
    await fixture(
      () =>
        document.activeElement.getAttribute('aria-label') === 'modal-input-a',
    ),
  );
  check(
    'background semantic proxy is inert',
    await fixture(
      () =>
        document
          .querySelector('[aria-label=background-a]')
          .closest('[inert]') !== null,
    ),
  );
  await fixture(() =>
    document.querySelector('[aria-label=background-a]').click(),
  );
  check(
    'AT/programmatic background activation is gated',
    await fixture(() => window.overlayFixture.a.count() === 0),
  );
  await page
    .getByRole('textbox', { name: 'modal-input-a', exact: true })
    .focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text: '中文',
    selectionStart: 2,
    selectionEnd: 2,
  });
  await page.keyboard.press('Escape');
  check(
    'Chrome IME composition Escape does not dismiss modal',
    await fixture(() => window.overlayFixture.a.modal.open()),
  );
  await cdp.send('Input.insertText', { text: '中文' });
  await page.keyboard.press('a'); // settle composition guard with an ordinary key
  await activate('nested-open-a');
  await page.waitForFunction(() => window.overlayFixture.a.nested.ready());
  check(
    'nested autofocus enters child Input',
    await fixture(
      () =>
        document.activeElement.getAttribute('aria-label') === 'nested-input-a',
    ),
  );
  await page.keyboard.press('Escape');
  check(
    'Escape closes only top surface and restores nested trigger',
    await fixture(
      () =>
        !window.overlayFixture.a.nested.open() &&
        window.overlayFixture.a.modal.open() &&
        document.activeElement.getAttribute('aria-label') === 'nested-open-a',
    ),
  );
  await page.screenshot({ path: `${output}/modal-focus.png` });
  await pointer('background-b');
  check(
    'instance modal leaves second Canvas interactive',
    await fixture(
      () =>
        window.overlayFixture.b.count() === 1 &&
        window.overlayFixture.a.modal.open(),
    ),
  );
  await activate('modal-b');
  await page.waitForFunction(() => window.overlayFixture.b.modal.ready());
  await page.keyboard.press('Escape');
  check(
    'Escape and focus state do not cross instances',
    await fixture(
      () =>
        !window.overlayFixture.b.modal.open() &&
        window.overlayFixture.a.modal.open(),
    ),
  );
  // A real pointer outside modal A consumes its entire gesture, even after closing.
  await page.mouse.click(60, 220);
  await wait();
  check(
    'outside pointer dismisses without click-through',
    await fixture(
      () =>
        !window.overlayFixture.a.modal.open() &&
        window.overlayFixture.a.count() === 0,
    ),
  );
  await activate('open-a');
  await page.waitForFunction(() => window.overlayFixture.a.overlay.ready());
  await fixture(() => window.overlayFixture.a.setShown(false));
  await wait();
  check(
    'hidden trigger closes and releases visual surface',
    await fixture(
      () =>
        !window.overlayFixture.a.overlay.open() &&
        !window.overlayFixture.a.overlay.element(),
    ),
  );
  await fixture(() => {
    window.overlayFixture.a.setShown(true);
    for (let i = 0; i < 8; i++) {
      window.overlayFixture.a.overlay.setOpen(true);
      window.overlayFixture.a.overlay.setOpen(false);
    }
  });
  await wait();
  check(
    'rapid open-close cancels pending mounts',
    await fixture(
      () =>
        !window.overlayFixture.a.overlay.ready() &&
        document.querySelectorAll('[data-piant-overlay]').length === 0,
    ),
  );
  await fixture(() => window.overlayFixture.a.overlay.setOpen(true));
  await page.waitForFunction(() => window.overlayFixture.a.overlay.ready());
  await fixture(() => window.overlayFixture.a.modal.setOpen(true));
  await page.waitForFunction(() => window.overlayFixture.a.modal.ready());
  await fixture(() => window.overlayFixture.a.overlay.setOpen(false));
  check(
    'closing an earlier sibling preserves later modal and its focus',
    await fixture(() => {
      const a = window.overlayFixture.a;
      return (
        a.modal.open() &&
        a.modal.ready() &&
        a.modal.element().isConnected &&
        document.activeElement.getAttribute('aria-label') === 'modal-input-a'
      );
    }),
  );
  await fixture(() => window.overlayFixture.a.modal.setOpen(false));
  await page.setViewportSize({ width: 740, height: 760 });
  await fixture(() => window.overlayFixture.a.modal.setOpen(true));
  await page.waitForFunction(() => window.overlayFixture.a.modal.ready());
  await fixture(() => window.overlayFixture.b.overlay.setOpen(true));
  await page.waitForFunction(() => window.overlayFixture.b.overlay.ready());
  const foreign = await page
    .getByRole('textbox', { name: 'overlay-input-b', exact: true })
    .boundingBox();
  check(
    'shifted foreign input genuinely overlaps the other instance target',
    await fixture(() => {
      const input = document
        .querySelector('[aria-label=overlay-input-b]')
        .getBoundingClientRect();
      const target = window.overlayFixture.a.target.getBoundingClientRect();
      return input.left < target.right && input.right > target.left;
    }),
  );
  await page.mouse.click(foreign.x + 20, foreign.y + 10);
  check(
    'foreign overlay pointer keeps modal open and focuses foreign input',
    await fixture(
      () =>
        window.overlayFixture.a.modal.open() &&
        window.overlayFixture.b.overlay.open() &&
        document.activeElement.getAttribute('aria-label') === 'overlay-input-b',
    ),
  );
  await page
    .getByRole('textbox', { name: 'overlay-input-b', exact: true })
    .fill('independent foreign input');
  await page.screenshot({ path: `${output}/foreign-overlay-ownership.png` });
  await fixture(() => {
    window.overlayFixture.b.overlay.setOpen(false);
    window.overlayFixture.a.modal.setOpen(false);
  });
  await page.setViewportSize({ width: 1120, height: 760 });
  await fixture(() => {
    window.overlayFixture.a.modal.setOpen(true);
    const external = document.createElement('div');
    external.id = 'external-app-popover';
    external.popover = 'manual';
    external.style.cssText =
      'position:fixed;inset:auto;left:80px;top:80px;width:200px;height:100px;margin:0';
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'external-app-input');
    external.append(input);
    document.body.append(external);
  });
  await page.waitForFunction(() => window.overlayFixture.a.modal.ready());
  await fixture(() => document.querySelector('#external-app-popover').showPopover());
  await page.getByRole('textbox', { name: 'external-app-input' }).click();
  check(
    'external native popover over Canvas remains interactive without dismissing modal',
    await fixture(
      () =>
        window.overlayFixture.a.modal.open() &&
        document.activeElement.getAttribute('aria-label') === 'external-app-input',
    ),
  );
  await fixture(() => {
    document.querySelector('#external-app-popover').remove();
    window.overlayFixture.a.modal.setOpen(false);
  });
  await activate('open-a');
  await page.waitForFunction(() => window.overlayFixture.a.overlay.ready());
  await fixture(() => window.overlayFixture.a.setDark(true));
  await wait();
  check(
    'theme context stays reactive without recreating content',
    await fixture(() => {
      const a = window.overlayFixture.a;
      return a.overlay.ready() && a.creationCount - a.cleanupCount === 1;
    }),
  );
  await page.screenshot({ path: `${output}/context-dark.png` });
  await fixture(() => {
    window.overlayFixture.a.instance.destroy();
    window.overlayFixture.b.instance.destroy();
  });
  await wait();
  check(
    'unmount removes all overlay DOM and owners',
    await fixture(
      () =>
        document.querySelectorAll('[data-piant-overlay]').length === 0 &&
        window.overlayFixture.a.creationCount ===
          window.overlayFixture.a.cleanupCount,
    ),
  );
  check('no browser runtime errors', errors.length === 0);
  await writeFile(
    `${output}/browser-results.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
} finally {
  await browser.close();
}
