import { createState, PNode, PRoot, render, View } from '@piant/core';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { Spacer } from '../dist/index.js';

describe('published Spacer', () => {
  it.each(['row', 'column'] as const)(
    'lays out fixed and flexible gaps in a %s',
    (direction) => {
      const host = new PRoot(new Container(), { width: 200, height: 200 });
      let setSize!: (size: number | undefined) => void;
      let reads = 0;
      let gap!: PNode;
      const dispose = render(() => {
        const [size, update] = createState<number | undefined>(20);
        setSize = update;
        gap = Spacer({
          get size() {
            reads++;
            return size();
          },
        }) as PNode;
        return View({
          style: { width: 200, height: 200, flexDirection: direction },
          children: [
            View({ style: { width: 40, height: 40 } }),
            gap,
            View({ style: { width: 40, height: 40 } }),
          ],
        });
      }, host);
      const length = () =>
        direction === 'row'
          ? gap._layoutNode.getComputedWidth()
          : gap._layoutNode.getComputedHeight();
      try {
        expect(gap).toBeInstanceOf(PNode);
        host.doLayout();
        expect(length()).toBe(20);
        setSize(60);
        host.doLayout();
        expect(length()).toBe(60);
        setSize(undefined);
        host.doLayout();
        expect(length()).toBe(120);
        setSize(0);
        host.doLayout();
        expect(length()).toBe(0);
        dispose();
        const previousReads = reads;
        setSize(30);
        expect(reads).toBe(previousReads);
      } finally {
        dispose();
        host.destroyRecursive();
      }
      expect(gap.isDestroyed).toBe(true);
    },
  );
});
