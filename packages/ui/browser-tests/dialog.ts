import { createState, type Getter, mount, Show, Text, View } from '@piant/core';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogConfirm,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  OverlayHost,
  TextField,
  UIProvider,
  useUITheme,
} from '@piant/ui';

const [dark, setDark] = createState(false);
const [scale, setScale] = createState(1);
const [compact, setCompact] = createState(false);
const [open, setOpen] = createState(false);
const [trigger, setTrigger] = createState(true);
const [long, setLong] = createState(false);
const [copy, setCopy] = createState('Fixture title');
let confirmed = 0;
let backgroundPresses = 0;
const target = document.createElement('div');
target.style.cssText = 'width:640px;height:520px;border:1px solid black;';
const other = document.createElement('div');
other.style.cssText = 'width:480px;height:250px;border:1px solid black;';
document.body.style.margin = '20px';
document.body.append(target, other);
function Content() {
  const theme = useUITheme();
  return View({
    style: { flexDirection: 'column', width: '100%', height: '100%', gap: 12 },
    children: [
      TextField({
        'aria-label': 'Fixture background',
        defaultValue: 'blocked',
      }),
      Button({
        children: 'Background action',
        onPress: () => {
          backgroundPresses++;
        },
      }),
      Dialog({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
        children: () => [
          Show({
            get when() {
              return trigger();
            },
            children: (_shown: Getter<boolean>) =>
              DialogTrigger({ children: 'Fixture open' }),
          }),
          DialogContent({
            width: 420,
            height: 300,
            children: () =>
              View({
                style: { flexDirection: 'column', gap: 12 },
                children: [
                  DialogTitle({
                    get children() {
                      return copy();
                    },
                  }),
                  DialogDescription({
                    children: 'Scrollable body and reachable actions',
                  }),
                  TextField({
                    'aria-label': 'Fixture draft',
                    defaultValue: 'selection',
                  }),
                  View({
                    get style() {
                      return { height: long() ? 650 : 0 };
                    },
                    children: Text({
                      get style() {
                        return {
                          color: theme().colors.text,
                          fontSize: theme().typography.fontSize,
                        };
                      },
                      children: 'Overflow content',
                    }),
                  }),
                  TextField({ 'aria-label': 'Overflow draft' }),
                ],
              }),
            actions: () => [
              DialogClose({ children: 'Fixture cancel', variant: 'secondary' }),
              DialogClose({ children: 'Fixture save' }),
            ],
          }),
        ],
      }),
      AlertDialog({
        children: () => [
          AlertDialogTrigger({ children: 'Fixture alert' }),
          AlertDialogContent({
            children: () => [
              AlertDialogTitle({ children: 'Fixture alert title' }),
              AlertDialogDescription({ children: 'Cancel is the safe action' }),
            ],
            actions: () => [
              AlertDialogConfirm({
                children: 'Fixture confirm',
                onPress: () => {
                  confirmed++;
                },
              }),
              AlertDialogCancel({ children: 'Fixture abort' }),
            ],
          }),
        ],
      }),
    ],
  });
}
function createInstance() {
  return mount(
    () =>
      UIProvider({
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        get density() {
          return compact() ? 'compact' : 'comfortable';
        },
        get fontScale() {
          return scale();
        },
        reducedMotion: true,
        children: () => OverlayHost({ children: Content }),
      }),
    target,
  );
}
let current = await createInstance();
const peer = await mount(
  () =>
    UIProvider({
      children: () =>
        OverlayHost({
          children: () =>
            View({
              style: { flexDirection: 'column', gap: 12 },
              children: [
                TextField({ 'aria-label': 'Peer input' }),
                Button({ children: 'Peer action' }),
              ],
            }),
        }),
    }),
  other,
);
Object.assign(window, {
  dialogFixture: {
    setOpen,
    setDark,
    setScale,
    setCompact,
    setTrigger,
    setLong,
    setCopy,
    counts: () => ({ confirmed, backgroundPresses }),
    rapid: () => {
      for (let i = 0; i < 10; i++) {
        setOpen(true);
        setOpen(false);
      }
    },
    destroy: () => current.destroy(),
    remount: async () => {
      current = await createInstance();
    },
    disposePeer: () => peer.destroy(),
  },
});
