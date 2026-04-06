import type { TickerCallback } from 'pixi.js';
import { Ticker } from 'pixi.js';
import { onCleanup } from '../reactivity';

const ticker = new Ticker();
ticker.autoStart = true;

export function onTick<T>(callback: TickerCallback<T>) {
  ticker.add(callback);

  onCleanup(() => {
    ticker.remove(callback);
  });
}
