import { describe, expect, it } from 'vitest';
import {
  createTreeModel,
  flattenTree,
  type TreeNode,
} from '../src/components/internal/treeModel';

describe('tree flattening model', () => {
  const nodes: readonly TreeNode[] = [
    {
      value: 'a',
      label: 'A',
      children: [
        { value: 'a1', label: 'A one' },
        {
          value: 'a2',
          label: 'A two',
          children: [{ value: 'leaf', label: 'Leaf' }],
        },
      ],
    },
    { value: 'b', label: 'B' },
  ];
  it('flattens only expanded descendants with global sibling metadata', () => {
    const model = createTreeModel(nodes);
    expect(flattenTree(model, new Set()).map((row) => row.node.value)).toEqual([
      'a',
      'b',
    ]);
    expect(
      flattenTree(model, new Set(['a', 'a2'])).map(({ node, ...row }) => ({
        key: node.value,
        ...row,
      })),
    ).toEqual([
      { key: 'a', parent: null, level: 1, posinset: 1, setsize: 2 },
      { key: 'a1', parent: 'a', level: 2, posinset: 1, setsize: 2 },
      { key: 'a2', parent: 'a', level: 2, posinset: 2, setsize: 2 },
      { key: 'leaf', parent: 'a2', level: 3, posinset: 1, setsize: 1 },
      { key: 'b', parent: null, level: 1, posinset: 2, setsize: 2 },
    ]);
  });
  it('rejects empty, duplicate and invalid-label keys even below collapsed nodes', () => {
    expect(() => createTreeModel([{ value: '', label: 'Empty' }])).toThrow(
      'non-empty',
    );
    expect(() =>
      createTreeModel([
        {
          value: 'x',
          label: 'X',
          children: [{ value: 'x', label: 'Duplicate' }],
        },
      ]),
    ).toThrow('globally unique');
    expect(() => createTreeModel([{ value: 'x', label: ' ' }])).toThrow(
      'labels',
    );
  });
  it('handles a deeply nested hierarchy without recursive stack overflow', () => {
    let node: TreeNode = { value: '9999', label: 'Leaf' };
    for (let index = 9998; index >= 0; index--)
      node = { value: String(index), label: String(index), children: [node] };
    const model = createTreeModel([node]);
    expect(model.rows.size).toBe(10000);
    const flat = flattenTree(model, new Set(model.rows.keys()));
    expect(flat).toHaveLength(10000);
    expect(flat.at(-1)?.level).toBe(10000);
  });
});
