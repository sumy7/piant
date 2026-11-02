import type { Getter, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  type ButtonPressEvent,
  type ToastAction,
  type ToastController,
  type ToastDismissReason,
  type ToastInput,
  ToastProvider,
  type ToastProviderProps,
  type ToastRecord,
  type ToastUpdate,
  ToastViewport,
  type ToastViewportProps,
  useToast,
} from '../dist/index.js';

it('exports the bounded notification, update, action and viewport contracts from the root', () => {
  const check = () => {
    const action: ToastAction = {
      label: 'Undo',
      onAction(event) {
        expectTypeOf(event).toEqualTypeOf<ButtonPressEvent>();
        event.preventDefault();
      },
    };
    const input: ToastInput = {
      id: 'saved',
      title: 'Saved',
      description: 'Settings retained',
      priority: 'polite',
      duration: 0,
      action,
      onDismiss(reason) {
        expectTypeOf(reason).toEqualTypeOf<ToastDismissReason>();
      },
    };
    const update: ToastUpdate = {
      title: 'Updated',
      action: null,
      priority: 'assertive',
    };
    const controller: ToastController = useToast();
    expectTypeOf(controller.items).toEqualTypeOf<
      Getter<readonly ToastRecord[]>
    >();
    expectTypeOf(controller.visible).toEqualTypeOf<
      Getter<readonly ToastRecord[]>
    >();
    expectTypeOf(controller.queuedCount()).toEqualTypeOf<number>();
    expectTypeOf(controller.show(input)).toEqualTypeOf<string | undefined>();
    expectTypeOf(controller.update('saved', update)).toEqualTypeOf<boolean>();
    expectTypeOf(controller.dismiss('saved')).toEqualTypeOf<boolean>();
    expectTypeOf(controller.dismissAll()).toEqualTypeOf<void>();
    const viewport: ToastViewportProps = {
      label: 'Notifications',
      dismissLabel: 'Close',
      style: { width: 340, height: 300 },
      ref(node) {
        expectTypeOf(node).not.toBeAny();
      },
    };
    expectTypeOf(ToastViewport(viewport)).toEqualTypeOf<
      ReturnType<typeof View>
    >();
    const provider: ToastProviderProps = {
      maxVisible: 3,
      maxToasts: 20,
      duration: 0,
      children: () => ToastViewport(viewport),
    };
    ToastProvider(provider);
    // @ts-expect-error Store lifecycle controls are private to ToastProvider/Viewport.
    controller.setMounted(true);
    // @ts-expect-error Updates cannot change stable notification identity.
    controller.update('saved', { id: 'replacement' });
    // @ts-expect-error No arbitrary live-region politeness values.
    controller.show({ title: 'Saved', priority: 'loud' });
    // @ts-expect-error Notifications require a title.
    controller.show({ description: 'No title' });
    // @ts-expect-error Actions require an explicit accessible label.
    controller.show({ title: 'Action', action: { onAction() {} } });
    // @ts-expect-error Records expose immutable snapshots.
    controller.items()[0].title = 'Mutated';
  };
  expectTypeOf(check).toBeFunction();
});
