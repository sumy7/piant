import {
  createState,
  type Getter,
  mount,
  type PNode,
  Show,
  Text,
  View,
} from '@piant/core';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  OverlayHost,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  TextField,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UIProvider,
  useUITheme,
} from '@piant/ui';

const [x, setX] = createState(280);
const [y, setY] = createState(100);
const [open, setOpen] = createState(false);
const [reject, setReject] = createState(false);
const [shown, setShown] = createState(true);
const [tipShown, setTipShown] = createState(true);
const [dark, setDark] = createState(false);
const [scale, setScale] = createState(1);
const [compact, setCompact] = createState(false);
let presses = 0;
let requests = 0;
let triggerNode: PNode | undefined;
const scroller = document.createElement('div');
scroller.id = 'fixture-scroll';
scroller.style.cssText =
  'width:760px;height:420px;overflow:auto;border:1px solid black;';
const target = document.createElement('div');
target.style.cssText = 'position:relative;width:1000px;height:700px;';
scroller.append(target);
const peerTarget = document.createElement('div');
peerTarget.style.cssText =
  'position:fixed;right:20px;top:20px;width:320px;height:240px;border:1px solid black;';
const external = document.createElement('input');
external.setAttribute('aria-label', 'External input');
external.style.cssText = 'position:fixed;right:20px;bottom:20px;width:200px;';
document.body.style.margin = '20px';
document.body.append(scroller, peerTarget, external);
function help(label: string, text: string) {
  return Tooltip({
    openDelay: 80,
    closeDelay: 120,
    children: () => [
      TooltipTrigger({
        children: label,
        onPress: () => {
          presses++;
        },
      }),
      TooltipContent({ children: text, width: 240 }),
    ],
  });
}
function App() {
  const theme = useUITheme();
  return View({
    style: { width: '100%', height: '100%' },
    children: [
      View({
        style: { position: 'absolute' as const, left: 20, top: 10, width: 220 },
        children: TextField({
          'aria-label': 'Fixture background',
          defaultValue: 'background',
        }),
      }),
      View({
        style: { position: 'absolute' as const, left: 20, top: 65 },
        children: Button({
          children: 'Fixture background action',
          onPress: () => {
            presses++;
          },
        }),
      }),
      Popover({
        get open() {
          return open();
        },
        onOpenChange(value) {
          requests++;
          if (value || !reject()) setOpen(value);
        },
        get style() {
          return { position: 'absolute' as const, left: x(), top: y() };
        },
        children: () => [
          Show({
            get when() {
              return shown();
            },
            children: (_visible: Getter<boolean>) =>
              PopoverTrigger({
                children: 'Fixture popover',
                ref: (node) => {
                  triggerNode = node;
                },
              }),
          }),
          PopoverContent({
            name: 'Fixture editor',
            width: 320,
            height: 240,
            children: () =>
              View({
                style: { flexDirection: 'column', gap: 12 },
                children: [
                  TextField({
                    'aria-label': 'Fixture popover draft',
                    defaultValue: 'select me',
                  }),
                  help('Nested help', 'Nested explanatory text'),
                ],
              }),
            actions: () => PopoverClose({ children: 'Fixture popover close' }),
          }),
        ],
      }),
      View({
        style: { position: 'absolute' as const, left: 20, top: 155 },
        children: Button({
          children: 'Fixture next',
          onPress: () => {
            presses++;
          },
        }),
      }),
      View({
        style: { position: 'absolute' as const, left: 20, top: 215 },
        children: Show({
          get when() {
            return tipShown();
          },
          children: (_visible: Getter<boolean>) =>
            help('Fixture tooltip', 'Fixture hover description'),
        }),
      }),
      Dialog({
        style: { position: 'absolute' as const, left: 20, top: 280 },
        children: () => [
          DialogTrigger({ children: 'Fixture dialog' }),
          DialogContent({
            width: 340,
            height: 280,
            children: () =>
              View({
                style: { flexDirection: 'column', gap: 12 },
                children: [
                  DialogTitle({ children: 'Fixture modal' }),
                  TextField({ 'aria-label': 'Fixture modal draft' }),
                  help('Modal help', 'Modal explanatory text'),
                  Popover({
                    children: () => [
                      PopoverTrigger({ children: 'Modal popover' }),
                      PopoverContent({
                        name: 'Modal popover editor',
                        width: 280,
                        height: 180,
                        children: () =>
                          TextField({ 'aria-label': 'Modal popover draft' }),
                        actions: () =>
                          PopoverClose({ children: 'Modal popover close' }),
                      }),
                    ],
                  }),
                ],
              }),
            actions: () => DialogClose({ children: 'Fixture dialog close' }),
          }),
        ],
      }),
      Text({
        get style() {
          return {
            position: 'absolute' as const,
            left: 20,
            top: 500,
            color: theme().colors.text,
            fontSize: theme().typography.fontSize,
          };
        },
        children: 'Scrollable Canvas fixture',
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
        get density() {
          return compact() ? 'compact' : 'comfortable';
        },
        reducedMotion: true,
        children: () => OverlayHost({ children: App }),
      }),
    target,
  );
}
let current = await mountMain();
// An unregistered native target exercises the host focus redirect as well as inert.
const raw = document.createElement('input');
raw.setAttribute('aria-label', 'Raw background focus probe');
raw.style.cssText = 'position:absolute;left:580px;top:10px;width:140px;';
target.append(raw);
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
                Dialog({
                  children: () => [
                    DialogTrigger({ children: 'Peer dialog' }),
                    DialogContent({
                      name: 'Peer modal',
                      width: 280,
                      height: 180,
                      children: () =>
                        TextField({ 'aria-label': 'Peer modal draft' }),
                      actions: () =>
                        DialogClose({ children: 'Peer dialog close' }),
                    }),
                  ],
                }),
              ],
            }),
        }),
    }),
  peerTarget,
);
Object.assign(window, {
  popupFixture: {
    setOpen,
    setReject,
    setShown,
    setTipShown,
    setDark,
    setScale,
    setCompact,
    move: (nextX: number, nextY: number) => {
      setX(nextX);
      setY(nextY);
    },
    counts: () => ({ presses, requests, open: open() }),
    scaleCanvas: (factor: number) => {
      current.canvas.style.transformOrigin = '0 0';
      current.canvas.style.transform = `scale(${factor})`;
    },
    scaleTrigger: (factor: number) => {
      triggerNode?._view.scale.set(factor);
    },
    rapid: () => {
      for (let i = 0; i < 8; i++) {
        setOpen(true);
        setOpen(false);
      }
    },
    destroy: () => current.destroy(),
    remount: async () => {
      current = await mountMain();
    },
    disposePeer: () => peer.destroy(),
  },
});
