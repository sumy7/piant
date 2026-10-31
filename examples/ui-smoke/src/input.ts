import {
  createEffect,
  createState,
  Input,
  isComposingInput,
  mount,
  onCleanup,
  type PInput,
  type PScrollView,
  ScrollView,
  Text,
  View,
} from '@piant/core';

document.body.style.fontFamily = 'system-ui, sans-serif';
const heading = document.createElement('h1');
heading.textContent = 'Native Input contract';
const guidance = document.createElement('p');
guidance.textContent =
  'Edit/select/copy/paste in the native input. Check CSS scale, positioned/scrolled host and Canvas overflow clipping. SYNTHETIC composition buttons test event routing only; they do not run a system IME.';
const before = document.createElement('button');
before.textContent = 'Before inputs';
const controls = document.createElement('div');
controls.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0';
const status = document.createElement('pre');
status.setAttribute('role', 'status');
status.style.whiteSpace = 'pre-wrap';
const outsideDescription = document.createElement('p');
outsideDescription.id = 'input-description';
outsideDescription.textContent =
  'Native editing and composition are owned by the browser.';
const scroller = document.createElement('div');
scroller.setAttribute('aria-label', 'DOM scrolling host');
scroller.style.cssText =
  'position:relative;overflow:auto;width:800px;height:460px;border:10px solid #475569;padding:18px;margin:20px 0';
const host = document.createElement('div');
host.style.cssText =
  'position:relative;width:640px;height:480px;margin:22px 130px 120px 35px;transform-origin:0 0;background:#f8fafc';
scroller.append(host);
const after = document.createElement('button');
after.textContent = 'After inputs';
document.body.append(
  heading,
  guidance,
  before,
  controls,
  status,
  outsideDescription,
  scroller,
  after,
);

let basic!: PInput;
let clipped!: PInput;
let scrollInput!: PInput;
let canvasScroll!: PScrollView;
let setControlled!: (value: boolean) => void;
let setValue!: (value: string) => void;
let setReadOnly!: (value: boolean) => void;
let setDisabled!: (value: boolean) => void;
let setLarge!: (value: boolean) => void;
let controlled = true;
let readOnly = false;
let disabled = false;
let large = false;
let scaled = false;
let positioned = false;
let scrolled = false;
let external = 0;
let inputEvents = 0;
let copyEvents = 0;
let cutEvents = 0;
let pasteEvents = 0;
let keyCallbacks = 0;
let parentBubble = 0;
let parentCapture = 0;
let guardedCapture = 0;
let compositionEvents = 0;
let beforeInput = '';
let controlledValue = 'Piant native editor';
let notify = () => {};
let reportTimer: ReturnType<typeof setTimeout> | undefined;
function deferReport() {
  clearTimeout(reportTimer);
  reportTimer = setTimeout(report, 0);
}

function report() {
  if (!basic) return;
  status.textContent = `controlled=${controlled}; value=${controlledValue}; DOM=${basic.element.value}; composing=${basic.isComposing}; readOnly=${readOnly}; disabled=${disabled}; inputs=${inputEvents}; beforeinput=${beforeInput}; copy=${copyEvents}; cut=${cutEvents}; paste=${pasteEvents}; keyCallbacks=${keyCallbacks}; parentBubble=${parentBubble}; capture=${parentCapture}; captureGuarded=${guardedCapture}; compositions=${compositionEvents}; selection=${basic.element.selectionStart}:${basic.element.selectionEnd}; scale=${scaled ? 1.25 : 1}; hostScroll=${scroller.scrollLeft},${scroller.scrollTop}`;
}

const mounted = await mount(
  () => {
    const [isControlled, control] = createState(true);
    const [value, commit] = createState(controlledValue);
    const [isReadOnly, lock] = createState(false);
    const [isDisabled, disable] = createState(false);
    const [isLarge, size] = createState(false);
    const [revision, update] = createState(0);
    setControlled = control;
    setValue = commit;
    setReadOnly = lock;
    setDisabled = disable;
    setLarge = size;
    notify = () => update((previous) => previous + 1);
    const capture = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;
      if (isComposingInput(event)) guardedCapture++;
      else parentCapture++;
      notify();
    };
    const bubble = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;
      parentBubble++;
      notify();
    };
    host.addEventListener('keydown', capture, true);
    host.addEventListener('keydown', bubble);
    onCleanup(() => {
      host.removeEventListener('keydown', capture, true);
      host.removeEventListener('keydown', bubble);
      clearTimeout(reportTimer);
    });
    const composition = () => {
      compositionEvents++;
      notify();
      deferReport();
    };
    const basicNode = Input({
      ref: (node) => {
        basic = node;
      },
      'aria-label': 'basic input',
      'aria-describedby': 'input-description',
      name: 'basic',
      autoComplete: 'off',
      inputMode: 'text',
      enterKeyHint: 'done',
      get value() {
        return isControlled() ? value() : undefined;
      },
      get readOnly() {
        return isReadOnly();
      },
      get disabled() {
        return isDisabled();
      },
      onInput: (next) => {
        inputEvents++;
        if (isControlled()) commit(next);
        notify();
      },
      onBeforeInput: (event) => {
        beforeInput = event.inputType;
        notify();
      },
      onKeyDown: () => {
        keyCallbacks++;
        notify();
      },
      onKeyUp: () => {
        keyCallbacks++;
        notify();
      },
      onCompositionStart: composition,
      onCompositionUpdate: composition,
      onCompositionEnd: composition,
      onCopy: () => {
        copyEvents++;
        notify();
      },
      onCut: () => {
        cutEvents++;
        notify();
      },
      onPaste: () => {
        pasteEvents++;
        notify();
      },
      onSelect: () => notify(),
      get style() {
        return {
          position: 'absolute' as const,
          left: 20,
          top: 30,
          width: 420,
          height: 54,
          padding: 10,
          borderWidth: 2,
          borderColor: '#1d4ed8',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui',
          fontSize: isLarge() ? 24 : 16,
          fontWeight: isLarge() ? 600 : 400,
          lineHeight: isLarge() ? 30 : 22,
          letterSpacing: isLarge() ? 1 : 0,
          color: isLarge() ? '#7c2d12' : '#0f172a',
          caretColor: '#dc2626',
        };
      },
    });
    const clipping = View({
      style: {
        position: 'absolute',
        left: 20,
        top: 115,
        width: 360,
        height: 100,
        overflow: 'hidden',
        borderRadius: 18,
        backgroundColor: '#cbd5e1',
      },
      children: [
        Text({
          children: 'Rounded Canvas overflow:hidden',
          style: { fontSize: 14, color: '#0f172a', margin: 10 },
        }),
        Input({
          ref: (node) => {
            clipped = node;
          },
          'aria-label': 'clipped input',
          defaultValue: 'CLIPPED native text 1234567890',
          style: {
            position: 'absolute',
            left: 230,
            top: 40,
            width: 260,
            height: 50,
            padding: 8,
            fontSize: 20,
            color: '#9f1239',
            backgroundColor: '#fff1f2',
            borderWidth: 2,
            borderColor: '#be123c',
          },
        }),
      ],
    });
    const scrolling = ScrollView({
      ref: (node) => {
        canvasScroll = node;
      },
      style: {
        position: 'absolute',
        left: 20,
        top: 245,
        width: 500,
        height: 130,
        backgroundColor: '#dbeafe',
        borderRadius: 12,
        overflow: 'hidden',
      },
      children: View({
        style: { width: 500, height: 380 },
        children: [
          Text({
            children: 'Canvas ScrollView — wheel here or use Canvas scroll',
            style: { margin: 12, fontSize: 14, color: '#0f172a' },
          }),
          Input({
            ref: (node) => {
              scrollInput = node;
            },
            'aria-label': 'scroll input',
            defaultValue: 'SCROLL native text',
            style: {
              position: 'absolute',
              left: 25,
              top: 100,
              width: 400,
              height: 60,
              padding: 10,
              fontSize: 22,
              color: '#1e3a8a',
              backgroundColor: '#ffffff',
              borderWidth: 2,
              borderColor: '#2563eb',
            },
          }),
          Text({
            children: 'End of Canvas content',
            style: {
              position: 'absolute',
              top: 330,
              left: 20,
              fontSize: 16,
              color: '#0f172a',
            },
          }),
        ],
      }),
    });
    createEffect(() => {
      revision();
      controlled = isControlled();
      controlledValue = value();
      readOnly = isReadOnly();
      disabled = isDisabled();
      report();
    });
    return View({
      style: { width: 640, height: 480 },
      children: [basicNode, clipping, scrolling],
    });
  },
  host,
  { width: 640, height: 480 },
);

function button(label: string, action: () => void) {
  const element = document.createElement('button');
  element.textContent = label;
  // Keep the input/IME session active while exercising fixture controls.
  element.onmousedown = (event) => event.preventDefault();
  element.onclick = action;
  controls.append(element);
}
button('Toggle controlled', () => setControlled(!controlled));
button('External value update', () => setValue(`External ${++external}`));
button('Toggle readOnly', () => setReadOnly(!readOnly));
button('Toggle disabled', () => setDisabled(!disabled));
button('Toggle text style', () => {
  large = !large;
  setLarge(large);
});
button('Toggle CSS scale', () => {
  scaled = !scaled;
  host.style.transform = scaled ? 'scale(1.25)' : '';
  report();
});
button('Toggle host position', () => {
  positioned = !positioned;
  host.style.left = positioned ? '45px' : '0';
  host.style.top = positioned ? '35px' : '0';
  report();
});
button('DOM host scroll', () => {
  scroller.scrollTo({
    left: scroller.scrollLeft ? 0 : 90,
    top: scroller.scrollTop ? 0 : 110,
  });
  report();
});
button('Canvas scroll', () => {
  scrolled = !scrolled;
  if (scrolled) canvasScroll.scrollIntoView(scrollInput, { block: 'end' });
  else canvasScroll.scrollTop();
  report();
});
button('Scroll input fully out', () => {
  canvasScroll.scrollY = -220;
});
button('Focus basic input', () => basic.focus({ preventScroll: true }));
button('Select basic range', () => {
  basic.focus({ preventScroll: true });
  basic.element.setSelectionRange(1, 5);
  report();
});
button('SYNTHETIC composition start', () => {
  basic.focus({ preventScroll: true });
  basic.element.dispatchEvent(
    new CompositionEvent('compositionstart', { bubbles: true, data: '' }),
  );
  basic.element.value = '拼';
  basic.element.dispatchEvent(
    new CompositionEvent('compositionupdate', { bubbles: true, data: '拼' }),
  );
  basic.element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: '拼',
      inputType: 'insertCompositionText',
      isComposing: true,
    }),
  );
  report();
});
button('SYNTHETIC IME Enter/Escape', () => {
  for (const key of ['Enter', 'Escape'])
    for (const type of ['keydown', 'keyup'])
      basic.element.dispatchEvent(
        new KeyboardEvent(type, {
          key,
          bubbles: true,
          cancelable: true,
          isComposing: true,
          keyCode: 229,
        }),
      );
  report();
});
button('SYNTHETIC composition end + input', () => {
  basic.element.value = '拼音';
  basic.element.dispatchEvent(
    new CompositionEvent('compositionend', { bubbles: true, data: '拼音' }),
  );
  basic.element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: '拼音',
      inputType: 'insertText',
      isComposing: false,
    }),
  );
  deferReport();
});
button('Unmount', () => {
  const inputs = [basic, clipped, scrollInput];
  mounted.destroy();
  if (
    inputs.some((node) => !node.isDestroyed || node.element.isConnected) ||
    host.querySelector('canvas')
  )
    throw new Error('Input cleanup failed');
  const previous = keyCallbacks;
  basic.element.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
  if (keyCallbacks !== previous)
    throw new Error('Input keyboard listener survived unmount');
  status.textContent =
    'Unmounted: all input nodes, native elements, canvas and owned keyboard listeners removed';
  controls.querySelectorAll('button').forEach((element) => {
    element.disabled = true;
  });
});
report();
