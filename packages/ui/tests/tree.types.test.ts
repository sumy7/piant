import type { PScrollView } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  Tree,
  type TreeHandle,
  type TreeNode,
  type TreeProps,
} from '../dist/index.js';

it('exports a single selection tree and keyed virtualization handle', () => {
  const check = () => {
    const nodes: readonly TreeNode[] = [
      {
        value: 'folder',
        label: 'Folder',
        children: [{ value: 'child', label: 'Child', disabled: true }],
      },
    ];
    const props: TreeProps = {
      label: 'Files',
      nodes,
      value: null,
      defaultValue: 'folder',
      expandedValues: ['folder'],
      defaultExpandedValues: [],
      rowHeight: 32,
      overscan: 2,
      disabled: false,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string | null>();
      },
      onExpandedValuesChange(values) {
        expectTypeOf(values).toEqualTypeOf<string[]>();
      },
      ref(node) {
        expectTypeOf(node).toEqualTypeOf<PScrollView>();
      },
      apiRef(handle) {
        expectTypeOf(handle).toEqualTypeOf<TreeHandle>();
        handle.scrollToKey('child', 'nearest');
        handle.focus();
      },
    };
    Tree(props);
    // @ts-expect-error Tree requires an accessible label.
    Tree({ nodes });
    // @ts-expect-error Selection is single-valued.
    Tree({ ...props, value: ['child'] });
    // @ts-expect-error Tree requires globally keyed nodes.
    Tree({ ...props, nodes: [{ label: 'No key' }] });
  };
  expectTypeOf(check).toBeFunction();
});
