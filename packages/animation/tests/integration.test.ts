import { createState, PNode, PRoot, root, Transition } from '@piant/core';
import { Container, Ticker } from 'pixi.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/index';
import type { PNodeAnimation } from '../src/index';

// Real Pixi ticker, advanced manually to keep the integration deterministic.
const ticker = Ticker.shared;
let time = 0;
let autoStart = true;

beforeEach(() => {
  autoStart = ticker.autoStart;
  ticker.autoStart = false;
  ticker.stop();
  time = Math.ceil(performance.now());
  ticker.update(time);
});

afterEach(() => {
  ticker.stop();
  ticker.autoStart = autoStart;
});

function tick(ms: number) {
  time += ms;
  ticker.update(time);
}

describe('animation integration', () => {
  it('seeks and resumes a real PNode, restoring layout and overrides outside the active phase', () => {
    const layout = new PRoot(new Container(), { width: 200, height: 200 });
    const node = new PNode();
    node.setStyle({ width: 40, height: 40, opacity: 0.8 });
    layout.appendChild(node);
    const anim = node.animate(
      [{ x: 0, alpha: 0, width: 50 }, { x: 100, alpha: 1, width: 150 }],
      { duration: 100, delay: 50, endDelay: 20 },
    );
    try {
      anim.pause();
      anim.currentTime = 75;
      layout.doLayout();
      expect(node._view.x).toBe(25);
      expect(node._view.alpha).toBe(0.25);
      expect(node._layoutStyle.width).toBe(75);
      anim.currentTime = 25;
      layout.doLayout();
      expect(node._view.x).toBe(0);
      expect(node._animAlpha).toBeNull();
      expect(node._view.alpha).toBeCloseTo(0.8);
      expect(node._layoutStyle.width).toBe(40);

      anim.currentTime = 75;
      anim.play();
      tick(25);
      layout.doLayout();
      expect(anim.currentTime).toBe(100);
      expect(node._view.x).toBe(50);
      tick(50);
      layout.doLayout();
      expect(anim.playState).toBe('running');
      expect(node._view.x).toBe(0);
      expect(node._view.alpha).toBeCloseTo(0.8);
      expect(node._layoutStyle.width).toBe(40);
      tick(20);
      expect(anim.playState).toBe('finished');
    } finally {
      anim.finish();
      layout.destroy();
    }
  });

  it('keeps a Transition exit pending across seek and endDelay until finished resolves', async () => {
    const node = new PNode();
    let anim: PNodeAnimation | undefined;
    let dispose = () => {};
    const { rendered, hide } = root((cleanup) => {
      dispose = cleanup;
      const [visible, setVisible] = createState(true);
      const rendered = Transition({
        get children() { return visible() ? node : null; },
        onExit: (_el, done) => {
          anim = node.animate([{ x: 0 }, { x: 100 }], {
            duration: 100, delay: 50, endDelay: 20, fill: 'both',
          });
          void anim.finished.then(done);
        },
      }) as unknown as () => unknown[];
      return { rendered, hide: () => setVisible(false) };
    });
    try {
      hide();
      expect(rendered()).toEqual([node]);
      anim!.pause();
      anim!.currentTime = 160;
      await Promise.resolve();
      expect(rendered()).toEqual([node]);
      expect(node._animTranslate.x).toBe(100);
      anim!.play();
      tick(5);
      await Promise.resolve();
      expect(rendered()).toEqual([node]);
      tick(5);
      await anim!.finished;
      expect(anim!.playState).toBe('finished');
      expect(rendered()).toEqual([]);
    } finally {
      anim?.finish();
      dispose();
      node.destroy();
    }
  });
});
