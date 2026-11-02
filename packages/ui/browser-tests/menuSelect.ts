import { createState, mount, View } from '@piant/core';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuTrigger,
  OverlayHost,
  Select,
  SelectContent,
  type SelectOption,
  SelectTrigger,
  TextField,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  UIProvider,
} from '@piant/ui';

const initial: readonly SelectOption[] = Array.from(
  { length: 80 },
  (_, index) => ({
    value: `item-${index}`,
    label: `Item ${String(index).padStart(2, '0')}`,
    disabled: index === 1,
  }),
);
const [options, setOptions] = createState(initial);
const [value, setValue] = createState<string | null>('item-70');
const [reject, setReject] = createState(false);
const [rejectClose, setRejectClose] = createState(false);
const [dark, setDark] = createState(false);
const [scale, setScale] = createState(1);
let actions = 0,
  background = 0,
  requests = 0,
  closes = 0;
const target = document.createElement('div');
target.style.cssText = 'width:760px;height:620px;position:relative;';
const peer = document.createElement('div');
peer.style.cssText =
  'width:300px;height:180px;position:fixed;right:20px;top:20px;';
const external = document.createElement('input');
external.setAttribute('aria-label', 'External input');
document.body.append(target, peer, external);
document.body.style.margin = '20px';
function choices(nested = false, onlySelect = false) {
  const params = new URLSearchParams(location.search);
  const [menuOpen, setMenuOpen] = createState(
    !nested && params.has('menuOpen'),
  );
  const [selectOpen, setSelectOpen] = createState(
    !nested && params.has('selectOpen'),
  );
  return View({
    style: { flexDirection: 'column', alignItems: 'flex-start', gap: 18 },
    children: [
      ...(onlySelect
        ? []
        : [
            Menu({
              get open() {
                return menuOpen();
              },
              label: nested ? 'Nested menu' : 'Fixture menu',
              items: [
                { value: 'a', label: 'Alpha' },
                { value: 'b', label: 'Beta disabled', disabled: true },
                { value: 'c', label: 'Charlie' },
                { value: 'd', label: 'Delta' },
              ],
              onAction: () => {
                actions++;
              },
              onOpenChange: (next) => {
                if (!next) closes++;
                if (next || !rejectClose()) setMenuOpen(next);
              },
              children: () => [
                MenuTrigger({
                  children: nested
                    ? 'Nested menu trigger'
                    : 'Fixture menu trigger',
                }),
                MenuContent({ width: 240, height: 180 }),
              ],
            }),
          ]),
      Select({
        get open() {
          return selectOpen();
        },
        label: nested ? 'Nested choice' : 'Fixture choice',
        get options() {
          return options();
        },
        get value() {
          return value();
        },
        onValueChange: (next) => {
          requests++;
          if (!reject()) setValue(next);
        },
        onOpenChange: (next) => {
          if (!next) closes++;
          if (next || !rejectClose()) setSelectOpen(next);
        },
        children: () => [
          SelectTrigger({}),
          SelectContent({ width: 280, height: 200 }),
        ],
      }),
    ],
  });
}
function app() {
  if (new URLSearchParams(location.search).has('terminal')) return choices();
  if (new URLSearchParams(location.search).has('terminalModal'))
    return Dialog({
      defaultOpen: true,
      children: () =>
        DialogContent({
          name: 'Terminal modal',
          width: 400,
          height: 300,
          children: () => {
            const select = choices(true, true);
            const position = new URLSearchParams(location.search).get(
              'modalSibling',
            );
            if (!position) return select;
            const sibling = Button({ children: 'Modal sibling' });
            return position === 'before'
              ? [sibling, select]
              : [select, sibling];
          },
        }),
    });
  return View({
    style: {
      padding: 20,
      gap: 20,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    children: [
      choices(),
      Button({
        children: 'Fixture background action',
        onPress: () => {
          background++;
        },
      }),
      TextField({
        'aria-label': 'Fixture draft',
        defaultValue: 'retained draft',
      }),
      Dialog({
        children: () => [
          DialogTrigger({ children: 'Fixture dialog' }),
          DialogContent({
            width: 400,
            height: 390,
            children: () => [
              DialogTitle({ children: 'Fixture modal' }),
              choices(true),
              Tooltip({
                openDelay: 0,
                children: () => [
                  TooltipTrigger({ children: 'Modal help' }),
                  TooltipContent({ children: 'Nested help text' }),
                ],
              }),
            ],
            actions: () => DialogClose({ children: 'Fixture close dialog' }),
          }),
        ],
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
        children: () => OverlayHost({ children: app }),
      }),
    target,
  );
}
let mounted = await mountMain();
const mountedPeer = await mount(
  () =>
    UIProvider({
      children: () =>
        OverlayHost({
          children: () =>
            Button({
              children: 'Peer action',
              onPress: () => {
                background++;
              },
            }),
        }),
    }),
  peer,
);
const fixture = {
  stats: () => ({ actions, background, requests, closes, value: value() }),
  setOptions: (mode: 'initial' | 'reverse' | 'remove' | 'empty') =>
    setOptions(
      mode === 'initial'
        ? initial
        : mode === 'reverse'
          ? [...initial].reverse()
          : mode === 'empty'
            ? []
            : initial.filter((item) => item.value !== value()),
    ),
  reject: setReject,
  rejectClose: setRejectClose,
  appearance: () => {
    setDark(!dark());
    setScale(scale() === 1 ? 2 : 1);
  },
  destroy: () => {
    mounted.destroy();
  },
  remount: async () => {
    mounted = await mountMain();
  },
  destroyPeer: () => mountedPeer.destroy(),
};
Object.assign(window, { menuSelectFixture: fixture });
