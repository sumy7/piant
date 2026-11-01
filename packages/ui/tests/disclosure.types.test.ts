import type { PNode, StyleValue, ViewStyles } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  Accordion,
  type AccordionProps,
  Collapsible,
  type CollapsibleProps,
  type DisclosureItem,
  type PanelMountStrategy,
} from '../dist/index.js';

it('exports discriminated disclosure state and panel lifetime contracts', () => {
  const check = (
    style: StyleValue<ViewStyles>,
    mountStrategy: PanelMountStrategy,
  ) => {
    const items: readonly DisclosureItem[] = [
      { value: 'a', label: 'Alpha', children: () => undefined },
    ];
    const collapsible: CollapsibleProps = {
      label: 'More',
      open: false,
      defaultOpen: true,
      disabled: false,
      mountStrategy,
      style,
      triggerStyle: style,
      panelStyle: style,
      children: () => undefined,
      onOpenChange(value) {
        expectTypeOf(value).toEqualTypeOf<boolean>();
      },
      ref(node) {
        expectTypeOf(node).toExtend<PNode>();
      },
    };
    Collapsible(collapsible);
    Accordion({
      type: 'single',
      items,
      value: null,
      defaultValue: 'a',
      collapsible: false,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<string | null>();
      },
    });
    const multiple: AccordionProps = {
      type: 'multiple',
      items,
      value: ['a'],
      defaultValue: [],
      mountStrategy,
      onValueChange(value) {
        expectTypeOf(value).toEqualTypeOf<readonly string[]>();
      },
    };
    Accordion(multiple);
    // @ts-expect-error A named trigger is required.
    Collapsible({ children: () => undefined });
    // @ts-expect-error Panel content is a deferred factory.
    Collapsible({ label: 'More', children: 'text' });
    // @ts-expect-error Multiple state cannot use a scalar value.
    Accordion({ type: 'multiple', items, value: 'a' });
    // @ts-expect-error Single state cannot use an array value.
    Accordion({ type: 'single', items, value: ['a'] });
    // @ts-expect-error collapsible only applies to single mode.
    Accordion({ type: 'multiple', items, collapsible: false });
    // @ts-expect-error Lifetime strategy is an explicit union.
    Collapsible({ ...collapsible, mountStrategy: 'cached' });
  };
  expectTypeOf(check).toBeFunction();
});
