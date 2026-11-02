import { createState, type Getter, mount, Show, View } from '@piant/core';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  OverlayHost,
  TextField,
  type ToastController,
  type ToastInput,
  ToastProvider,
  ToastViewport,
  UIProvider,
  useToast,
} from '@piant/ui';

const target = document.createElement('div');
target.style.cssText = 'position:relative;width:700px;height:720px;';
const peerTarget = document.createElement('div');
peerTarget.style.cssText =
  'position:fixed;right:20px;top:20px;width:350px;height:500px;';
const external = document.createElement('input');
external.setAttribute('aria-label', 'External field');
document.body.append(target, peerTarget, external);
document.body.style.margin = '20px';
const [shown, setShown] = createState(true);
const [dark, setDark] = createState(false);
const [scale, setScale] = createState(1);
let main!: ToastController, peer!: ToastController;
let actions = 0;
const dismissals: { id: string; reason: string }[] = [];
function mainView() {
  main = useToast();
  return View({
    style: { padding: 16, gap: 12, width: '100%', height: '100%' },
    children: [
      TextField({
        'aria-label': 'Toast draft',
        defaultValue: 'draft selection',
      }),
      Button({ children: 'Fixture application action' }),
      Dialog({
        children: () => [
          DialogTrigger({ children: 'Fixture dialog' }),
          DialogContent({
            name: 'Toast parent modal',
            children: () => TextField({ 'aria-label': 'Modal draft' }),
            actions: () => DialogClose({ children: 'Close modal' }),
          }),
        ],
      }),
      Show({
        get when() {
          return shown();
        },
        children: (_shown: Getter<boolean>) =>
          ToastViewport({
            label: 'Fixture notifications',
            style: { width: 400, height: 390 },
          }),
      }),
    ],
  });
}
function mountMain() {
  return mount(
    () =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        get fontScale() {
          return scale();
        },
        reducedMotion: true,
        children: () =>
          OverlayHost({
            children: () =>
              ToastProvider({
                maxVisible: 3,
                maxToasts: 6,
                children: mainView,
              }),
          }),
      }),
    target,
  );
}
let mounted = await mountMain();
const mountedPeer = await mount(
  () =>
    UIProvider({
      children: () =>
        ToastProvider({
          children: () => {
            peer = useToast();
            return ToastViewport({
              label: 'Peer notifications',
              style: { width: 330, height: 400 },
            });
          },
        }),
    }),
  peerTarget,
);
function show(
  input: Omit<ToastInput, 'action' | 'onDismiss'> & {
    action?: 'normal' | 'veto' | 'update';
  },
) {
  let id: string | undefined;
  id = main.show({
    ...input,
    action: input.action
      ? {
          label: 'Undo',
          onAction(event) {
            actions++;
            if (input.action === 'veto') event.preventDefault();
            if (input.action === 'update' && id)
              main.update(id, { title: 'Updated in action' });
          },
        }
      : undefined,
    onDismiss: (reason) =>
      dismissals.push({ id: id ?? input.id ?? '', reason }),
  });
  return id;
}
Object.assign(window, {
  toastFixture: {
    show,
    peerShow: () => peer.show({ id: 'peer', title: 'Peer notice' }),
    update: (id: string, patch: Parameters<ToastController['update']>[1]) =>
      main.update(id, patch),
    dismiss: (id: string) => main.dismiss(id),
    clear: () => main.dismissAll(),
    stats: () => ({
      items: main.items(),
      visible: main.visible().map((item) => item.id),
      queued: main.queuedCount(),
      actions,
      dismissals,
    }),
    viewport: setShown,
    appearance: () => {
      setDark(!dark());
      setScale(scale() === 1 ? 2 : 1);
    },
    destroy: () => mounted.destroy(),
    remount: async () => {
      mounted = await mountMain();
    },
    destroyPeer: () => mountedPeer.destroy(),
  },
});
