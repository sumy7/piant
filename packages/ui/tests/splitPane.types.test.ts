import type { PNode } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import { SplitPane, type SplitPaneProps } from '../dist/index.js';

it('exports two pane renderers and a numeric controlled size', () => {
  const check = () => {
    const props: SplitPaneProps = {
      name: 'Panels',
      first: () => null,
      second: () => null,
      size: 120,
      defaultSize: 100,
      minSize: 20,
      maxSize: 200,
      minSecondSize: 40,
      orientation: 'vertical',
      step: 5,
      disabled: false,
      onSizeChange(size) {
        expectTypeOf(size).toEqualTypeOf<number>();
      },
      ref(node) {
        expectTypeOf(node).toExtend<PNode>();
      },
    };
    SplitPane(props);
    // @ts-expect-error Accessible name is required.
    SplitPane({ first: () => null, second: () => null });
    // @ts-expect-error Both panes are required.
    SplitPane({ name: 'Panels', first: () => null });
    // @ts-expect-error Size is a logical pixel number.
    SplitPane({ ...props, size: '50%' });
  };
  expectTypeOf(check).toBeFunction();
});
