import type { PNode, View } from '@piant/core';
import { expectTypeOf, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogCancel,
  type AlertDialogCancelProps,
  AlertDialogConfirm,
  type AlertDialogConfirmProps,
  AlertDialogContent,
  type AlertDialogContentProps,
  AlertDialogDescription,
  type AlertDialogProps,
  type AlertDialogTextProps,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogTriggerProps,
  type ButtonPressEvent,
  Dialog,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  type DialogProps,
  type DialogTextProps,
  DialogTitle,
  DialogTrigger,
  type DialogTriggerProps,
} from '../dist/index.js';

it('exports typed dialog roots, deferred content and explicit button actions', () => {
  const check = (element: HTMLElement) => {
    const root: DialogProps = {
      open: false,
      defaultOpen: true,
      onOpenChange(open) {
        expectTypeOf(open).toEqualTypeOf<boolean>();
      },
      children: () => undefined,
    };
    const alertRoot: AlertDialogProps = root;
    expectTypeOf(Dialog(root)).toEqualTypeOf<ReturnType<typeof View>>();
    AlertDialog(alertRoot);
    const content: DialogContentProps = {
      name: 'Profile',
      scrollLabel: 'Scroll editor content',
      width: 420,
      height: 300,
      initialFocus: () => element,
      dismissOnEscape: true,
      dismissOnOutsidePointer: false,
      children: () => undefined,
      actions: () => undefined,
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>();
      },
    };
    DialogContent(content);
    const alertContent: AlertDialogContentProps = {
      name: 'Delete',
      children: () => undefined,
      initialFocus: () => undefined,
      dismissOnEscape: false,
    };
    AlertDialogContent(alertContent);
    const trigger: DialogTriggerProps = { children: 'Open' };
    const alertTrigger: AlertDialogTriggerProps = trigger;
    DialogTrigger(trigger);
    AlertDialogTrigger(alertTrigger);
    const close: DialogCloseProps = {
      children: 'Close',
      onPress(event, node) {
        expectTypeOf(event).toEqualTypeOf<ButtonPressEvent>();
        expectTypeOf(node).toEqualTypeOf<PNode>();
        event.preventDefault();
      },
    };
    const cancel: AlertDialogCancelProps = close;
    const confirm: AlertDialogConfirmProps = { ...close, variant: 'danger' };
    DialogClose(close);
    AlertDialogCancel(cancel);
    AlertDialogConfirm(confirm);
    const copy: DialogTextProps = { children: 'Visible title' };
    const alertCopy: AlertDialogTextProps = copy;
    DialogTitle(copy);
    DialogDescription(copy);
    AlertDialogTitle(alertCopy);
    AlertDialogDescription(alertCopy);
    // @ts-expect-error Content creation must be deferred under its root.
    DialogContent({ children: 'eager content' });
    // @ts-expect-error AlertDialog never supports backdrop dismissal.
    AlertDialogContent({ ...alertContent, dismissOnOutsidePointer: true });
    // @ts-expect-error A title supplies plain accessible text.
    DialogTitle({ children: () => 'title' });
    // @ts-expect-error Confirm retains Button's accessible-name requirement.
    AlertDialogConfirm({});
  };
  expectTypeOf(check).toBeFunction();
});
