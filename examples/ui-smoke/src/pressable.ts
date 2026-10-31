import {
  createEffect,
  createState,
  mount,
  type PNode,
  Text,
  View,
} from '@piant/core';
import {
  createControllableState,
  createPressable,
  type PressableState,
} from '@piant/ui';

const heading = document.createElement('h1');
heading.textContent = 'Shared pointer press and controllable state';
const host = document.createElement('div');
host.style.cssText = 'width:480px;height:160px';
const status = document.createElement('p');
status.setAttribute('role', 'status');
const controls = document.createElement('div');
document.body.append(heading, host, status, controls);
function button(label: string, action: () => void) {
  const button = document.createElement('button');
  button.textContent = label;
  button.onclick = action;
  controls.append(button);
  return button;
}
let setControlled!: (value: boolean) => void;
let setAccept!: (value: boolean) => void;
let setDisabled!: (value: boolean) => void;
let setLatest!: (value: boolean) => void;
let state!: PressableState;
let node!: PNode;
let controlled = true;
let accept = false;
let disabled = false;
let latest = false;
let armed: 'disable' | 'cancel' | undefined;
let reads = 0;
const mounted = await mount(() => {
  const [isControlled, control] = createState(true);
  setControlled = control;
  const [acceptRequests, allow] = createState(false);
  setAccept = allow;
  const [isDisabled, disable] = createState(false);
  setDisabled = disable;
  const [useLatest, useNew] = createState(false);
  setLatest = useNew;
  const [external, commit] = createState(false);
  const [requests, setRequests] = createState(0);
  const [callback, setCallback] = createState('none');
  function change(value: boolean, version: string) {
    setRequests((count) => count + 1);
    setCallback(version);
    if (acceptRequests()) commit(value);
  }
  const [value, setValue] = createControllableState({
    get value() {
      return isControlled() ? external() : undefined;
    },
    defaultValue: false,
    get onChange() {
      return useLatest()
        ? (next: boolean) => change(next, 'new')
        : (next: boolean) => change(next, 'old');
    },
  });
  const label = Text({
    children: 'Press this Canvas region',
    style: { color: '#ffffff', fontSize: 20 },
  });
  node = View({
    ref: (node) => {
      state = createPressable(node, {
        get disabled() {
          reads++;
          return isDisabled();
        },
        onPress: () => setValue((previous) => !previous),
      });
    },
    onPointerDown: (event) => {
      const next = armed;
      armed = undefined;
      if (next === 'disable') {
        disabled = true;
        setDisabled(true);
      }
      if (next === 'cancel')
        window.dispatchEvent(
          new PointerEvent('pointercancel', { pointerId: event.pointerId }),
        );
    },
    get style() {
      return {
        width: 320,
        height: 100,
        padding: 16,
        borderRadius: 8,
        backgroundColor: state.disabled()
          ? '#64748b'
          : state.pressed()
            ? '#1e3a8a'
            : state.hovered()
              ? '#2563eb'
              : '#1d4ed8',
      };
    },
    children: label,
  }) as PNode;
  createEffect(() => {
    status.textContent = `value=${value()}; requests=${requests()}; callback=${callback()}; controlled=${isControlled()}; accept=${acceptRequests()}; disabled=${state.disabled()}; hovered=${state.hovered()}; pressed=${state.pressed()}`;
  });
  return node;
}, host);
button('Toggle controlled', () => {
  controlled = !controlled;
  setControlled(controlled);
});
button('Accept/reject requests', () => {
  accept = !accept;
  setAccept(accept);
});
button('Disable/enable', () => {
  disabled = !disabled;
  setDisabled(disabled);
});
button('Use latest callback', () => {
  latest = !latest;
  setLatest(latest);
});
button('Disable on next down', () => {
  armed = 'disable';
});
button('Native cancel on next down', () => {
  armed = 'cancel';
});
button('Unmount', () => {
  mounted.destroy();
  const previous = reads;
  setDisabled(!disabled);
  if (
    !node.isDestroyed ||
    host.querySelector('canvas') ||
    reads !== previous ||
    state.pressed()
  )
    throw new Error('Pressable cleanup failed');
  status.textContent =
    'Unmounted: canvas/node/pressable effects and listeners disposed';
  controls.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
});
