/** Public Tree data uses globally unique keys, including collapsed descendants. */
export interface TreeNode {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly children?: readonly TreeNode[];
}
export interface TreeRow {
  readonly node: TreeNode;
  readonly parent: string | null;
  readonly level: number;
  readonly posinset: number;
  readonly setsize: number;
}
export interface TreeModel {
  readonly roots: readonly TreeNode[];
  readonly rows: ReadonlyMap<string, TreeRow>;
}

/** Iterative traversal also supports deeply nested, collapsed data without recursion. */
export function createTreeModel(nodes: readonly TreeNode[]): TreeModel {
  const rows = new Map<string, TreeRow>();
  const pending: TreeRow[] = [];
  const push = (
    siblings: readonly TreeNode[],
    parent: string | null,
    level: number,
  ) => {
    for (let index = siblings.length - 1; index >= 0; index--)
      pending.push({
        node: siblings[index]!,
        parent,
        level,
        posinset: index + 1,
        setsize: siblings.length,
      });
  };
  push(nodes, null, 1);
  while (pending.length) {
    const row = pending.pop()!;
    const key = row.node.value;
    if (typeof key !== 'string' || !key.trim() || rows.has(key))
      throw new Error('Tree values must be globally unique non-empty strings.');
    if (typeof row.node.label !== 'string' || !row.node.label.trim())
      throw new Error('Tree labels must be non-empty strings.');
    rows.set(key, row);
    if (row.node.children?.length) push(row.node.children, key, row.level + 1);
  }
  return { roots: nodes, rows };
}

/** Only expanded descendants enter the virtual collection; metadata counts siblings. */
export function flattenTree(
  model: TreeModel,
  expanded: ReadonlySet<string>,
): TreeRow[] {
  const visible: TreeRow[] = [];
  const pending = [...model.roots].reverse();
  while (pending.length) {
    const node = pending.pop()!;
    visible.push(model.rows.get(node.value)!);
    if (expanded.has(node.value) && node.children?.length)
      for (let index = node.children.length - 1; index >= 0; index--)
        pending.push(node.children[index]!);
  }
  return visible;
}
