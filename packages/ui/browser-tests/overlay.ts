import {
  createState,
  mount,
  onCleanup,
  type PScrollView,
  ScrollView,
  Text,
  View,
} from '@piant/core';
import {
  Button,
  createOverlay,
  createOverlayAnchor,
  type OverlayAnchor,
  OverlayHost,
  type OverlayState,
  Surface,
  TextField,
  UIProvider,
  useUITheme,
} from '../dist/index.js';

const fixtures: Record<string, unknown> = {};
for (const id of ['a', 'b']) {
  const [dark, setDark] = createState(false);
  const [top, setTop] = createState(false);
  const [large, setLarge] = createState(false);
  let scroller: PScrollView;
  const [shown, setShown] = createState(true);
  const [count, setCount] = createState(0);
  let anchor: OverlayAnchor;
  let nestedAnchor: OverlayAnchor;
  let nested: OverlayState;
  let cleanupCount = 0;
  let creationCount = 0;
  const target = document.querySelector<HTMLElement>(`#host-${id}`)!;
  const instance = await mount(
    () =>
      UIProvider({
        reducedMotion: false,
        get colorMode() {
          return dark() ? 'dark' : 'light';
        },
        children: () =>
          OverlayHost({
            children: () => {
              const overlay = createOverlay({
                get anchor() {
                  return anchor;
                },
                get placement() {
                  return top() ? 'top-start' : 'bottom-start';
                },
                get flip() {
                  return !top();
                },
                width: 300,
                get height() {
                  return large() ? 1000 : 180;
                },
                children: () => {
                  creationCount++;
                  onCleanup(() => cleanupCount++);
                  const theme = useUITheme();
                  return Surface({
                    style: {
                      width: '100%',
                      height: '100%',
                      borderWidth: 4,
                      borderColor: '#7c3aed',
                    },
                    get children() {
                      return [
                        Text({
                          get children() {
                            return `${id}: ${theme().colorMode}`;
                          },
                          style: { color: '#e11d48' },
                        }),
                        TextField({
                          'aria-label': `overlay-input-${id}`,
                          defaultValue: '浮层输入',
                        }),
                        Button({
                          children: `close-${id}`,
                          onPress: () => overlay.setOpen(false),
                        }),
                      ];
                    },
                  });
                },
              });
              const modal = createOverlay({
                width: 320,
                height: 240,
                modal: true,
                outsidePointer: 'dismiss',
                children: () => {
                  nested = createOverlay({
                    get anchor() {
                      return nestedAnchor;
                    },
                    width: 240,
                    height: 140,
                    autoFocus: true,
                    children: () =>
                      Surface({
                        style: {
                          width: '100%',
                          height: '100%',
                          borderWidth: 4,
                          borderColor: '#16a34a',
                        },
                        children: [
                          TextField({
                            'aria-label': `nested-input-${id}`,
                            defaultValue: '嵌套',
                          }),
                          Button({
                            children: `nested-close-${id}`,
                            onPress: () => nested.setOpen(false),
                          }),
                        ],
                      }),
                  });
                  return Surface({
                    style: {
                      width: '100%',
                      height: '100%',
                      borderWidth: 4,
                      borderColor: '#2563eb',
                    },
                    children: [
                      TextField({
                        'aria-label': `modal-input-${id}`,
                        defaultValue: '模态输入',
                      }),
                      Button({
                        children: `nested-open-${id}`,
                        ref: (node) => {
                          nestedAnchor = createOverlayAnchor(node);
                        },
                        onPress: () => nested.setOpen(true),
                      }),
                      Button({
                        children: `modal-close-${id}`,
                        onPress: () => modal.setOpen(false),
                      }),
                    ],
                  });
                },
              });
              fixtures[id] = {
                overlay,
                modal,
                get nested() {
                  return nested;
                },
                anchor: () => anchor,
                setLarge,
                get scroller() {
                  return scroller;
                },
                setTop,
                setDark,
                setShown,
                count,
                target,
                get creationCount() {
                  return creationCount;
                },
                get cleanupCount() {
                  return cleanupCount;
                },
              };
              return View({
                style: {
                  width: '100%',
                  height: '100%',
                  padding: 16,
                  gap: 8,
                  backgroundColor: '#f8fafc',
                },
                children: [
                  TextField({
                    'aria-label': `background-input-${id}`,
                    defaultValue: '背景输入框，浮层应遮挡它',
                  }),
                  ScrollView({
                    ref: (node) => {
                      scroller = node;
                    },
                    style: { width: '100%', height: 56 },
                    children: [
                      Button({
                        children: `open-${id}`,
                        ref: (node) => {
                          anchor = createOverlayAnchor(node);
                        },
                        get style(): { display: 'flex' | 'none' } {
                          return { display: shown() ? 'flex' : 'none' };
                        },
                        onPress: () => overlay.setOpen(true),
                      }),
                      View({ style: { height: 180, width: '100%' } }),
                    ],
                  }),
                  Button({
                    children: `modal-${id}`,
                    onPress: () => modal.setOpen(true),
                  }),
                  Button({
                    children: `background-${id}`,
                    onPress: () => setCount(count() + 1),
                  }),
                ],
              });
            },
          }),
      }),
    target,
  );
  Object.assign(fixtures[id] as object, { instance });
}
Object.assign(window, { overlayFixture: fixtures });
