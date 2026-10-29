import { onError, PNode, render } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundaryExample from '../../examples/errorBoundary';

const labels = vi.hoisted(() => new WeakMap<object, string>());

// Keep actual owners, renderer, views, events and node destruction. Text alone
// is replaced to avoid requiring a browser canvas/font implementation in Node.
vi.mock('@piant/core', async (importOriginal) => {
  const core = await importOriginal<typeof import('@piant/core')>();
  return {
    ...core,
    Text(props: { children?: unknown }) {
      const node = new core.PNode();
      core.createEffect(() => {
        let value = props.children;
        while (typeof value === 'function') value = value();
        labels.set(node, String(value));
      });
      return node;
    },
  };
});

describe('ErrorBoundary live example', () => {
  it('isolates render errors and recreates usable children after repeated resets', () => {
    const host = new PNode();
    const reportError = vi.fn();
    const seenNodes = new Set<PNode>([host]);
    const buttons: PNode[] = [];
    const nodes = (): PNode[] => {
      const visit = (node: PNode): PNode[] => {
        seenNodes.add(node);
        return [node, ...node._children.flatMap(visit)];
      };
      return visit(host);
    };
    const findLabel = (label: string) =>
      nodes().find((node) => labels.get(node) === label);
    const click = (label: string) => {
      const button = findLabel(label)?.parentNode;
      expect(button, `button for ${label}`).toBeDefined();
      buttons.push(button!);
      button!._view.emit('pointertap', {} as never);
    };

    const dispose = render(() => {
      // Match the host: failures escaping the component boundary fail the demo.
      onError(reportError);
      return ErrorBoundaryExample();
    }, host);
    try {
      const outerLabel = findLabel('外层界面始终可用');
      expect(outerLabel).toBeDefined();
      let previousPanel = findLabel('子组件正常显示')?.parentNode;
      expect(previousPanel).toBeDefined();

      for (let round = 0; round < 2; round++) {
        const destroyPrevious = vi.spyOn(previousPanel!, 'destroyRecursive');
        click('触发渲染错误');
        expect(findLabel('已捕获：演示组件渲染失败')).toBeDefined();
        expect(findLabel('子组件正常显示')).toBeUndefined();
        expect(findLabel('外层界面始终可用')).toBe(outerLabel);
        expect(outerLabel!._view.destroyed).toBe(false);
        expect(destroyPrevious).toHaveBeenCalledOnce();
        expect(previousPanel!.parentNode).toBeNull();
        expect(reportError).not.toHaveBeenCalled();

        click('修复并重置');
        const nextPanel = findLabel('子组件正常显示')?.parentNode;
        expect(nextPanel).toBeDefined();
        expect(nextPanel).not.toBe(previousPanel);
        expect(nextPanel!._view.destroyed).toBe(false);
        expect(findLabel('已捕获：演示组件渲染失败')).toBeUndefined();
        expect(reportError).not.toHaveBeenCalled();
        previousPanel = nextPanel;
      }
      // Include the current button when checking owner/event cleanup below.
      buttons.push(findLabel('触发渲染错误')!.parentNode!);
    } finally {
      nodes();
      dispose();
      for (const button of buttons) {
        expect(button._view.listenerCount('pointertap')).toBe(0);
      }
      host.destroyRecursive();
      for (const node of seenNodes) expect(node.isDestroyed).toBe(true);
    }
    expect(host._children).toHaveLength(0);
    expect(reportError).not.toHaveBeenCalled();
  });
});
