import { CustomView, createState, onTick, StyleSheet } from '@piant/core';
import type { Graphics } from 'pixi.js';

const TWO_PI = Math.PI * 2;

function drawClock(
  graphics: Graphics,
  width: number,
  height: number,
  now: number,
) {
  const size = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const r = size / 2 - 8;

  graphics.clear();

  // Clock face background
  graphics
    .circle(cx, cy, r)
    .fill({ color: 0xffffff })
    .stroke({ color: 0x1e293b, width: 4 });

  // Tick marks: 60 minute marks, 12 are wider hour marks
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * TWO_PI - Math.PI / 2;
    const isHour = i % 5 === 0;
    const outerR = r - 2;
    const innerR = r - (isHour ? 14 : 6);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    graphics
      .moveTo(cx + cos * innerR, cy + sin * innerR)
      .lineTo(cx + cos * outerR, cy + sin * outerR)
      .stroke({
        color: isHour ? 0x1e293b : 0x94a3b8,
        width: isHour ? 2.5 : 1,
      });
  }

  // Compute time components
  const date = new Date(now);
  const ms = date.getMilliseconds();
  const sec = date.getSeconds() + ms / 1000;
  const min = date.getMinutes() + sec / 60;
  const hr = (date.getHours() % 12) + min / 60;
  const subsec = ms / 1000;

  // Helper: draw a clock hand
  const drawHand = (
    fraction: number,
    length: number,
    color: number,
    width: number,
  ) => {
    const angle = fraction * TWO_PI - Math.PI / 2;
    graphics
      .moveTo(cx, cy)
      .lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length)
      .stroke({ color, width, cap: 'round' });
  };

  // Subsecond hand (silver) — sweeps every second
  drawHand(subsec, r * 0.82, 0xc0c0c0, 2);
  // Hour hand (dark)
  drawHand(hr / 12, r * 0.5, 0x1e293b, 5);
  // Minute hand (dark)
  drawHand(min / 60, r * 0.7, 0x1e293b, 3);
  // Second hand (red)
  drawHand(sec / 60, r * 0.8, 0xef4444, 2);

  // Center pivot dot
  graphics.circle(cx, cy, 5).fill({ color: 0x1e293b });
}

const styles = StyleSheet.create({
  clock: {
    width: 300,
    height: 300,
  },
});

export function Clock() {
  const [now, setNow] = createState(Date.now());

  onTick(() => {
    setNow(Date.now());
  });

  return (
    <CustomView
      style={styles.clock}
      onDraw={(g, w, h) => {
        drawClock(g, w, h, now());
      }}
    />
  );
}
