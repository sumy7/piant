import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input, type InputProps } from '../src/components/Input';
import { isComposingInput } from '../src/elements/inputComposition';
import type { InputStyles } from '../src/elements/inputStyles';
import type { PInput } from '../src/elements/PInput';
import { PRoot } from '../src/elements/PRoot';
import { root } from '../src/reactivity/effects';
import { createState, onCleanup } from '../src/reactivity/hooks';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(props: InputProps = {}) {
  const scene = new PRoot(new Container(), { width: 300, height: 100 });
  const host = document.createElement('form');
  document.body.append(host);
  let node!: PInput;
  const stop = root((dispose) => {
    node = Input(props) as PInput;
    return dispose;
  });
  scene.appendChild(node);
  scene.doLayout();
  host.append(node.domElement.hostElement);
  cleanups.push(() => {
    stop();
    scene.destroy();
    host.remove();
  });
  return { node, native: node.element, host, scene, stop };
}

function compose(
  native: HTMLInputElement,
  type: 'compositionstart' | 'compositionupdate' | 'compositionend',
  data = '',
) {
  native.dispatchEvent(new CompositionEvent(type, { bubbles: true, data }));
}
function input(native: HTMLInputElement, value: string, composing = false) {
  native.value = value;
  native.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: composing ? 'insertCompositionText' : 'insertText',
      isComposing: composing,
    }),
  );
}
function key(
  native: HTMLInputElement,
  name: string,
  type: 'keydown' | 'keyup' = 'keydown',
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key: name,
    ...options,
  });
  native.dispatchEvent(event);
  return event;
}

describe('native Input contract', () => {
  it('maps public typography and Yoga content insets, restoring inherited styles after removal', () => {
    const [style, setStyle] = createState<InputStyles>({
      width: 200,
      height: 44,
      padding: 8,
      paddingLeft: 14,
      borderWidth: 2,
      fontFamily: 'serif',
      fontSize: 18,
      fontWeight: 600,
      fontStyle: 'italic',
      lineHeight: '1.5x',
      letterSpacing: 2,
      color: '#123456',
      caretColor: '#654321',
      textAlign: 'right',
    });
    const { native, scene } = setup({
      get style() {
        return style();
      },
    });
    expect(native.style.fontFamily).toBe('serif');
    expect(native.style.fontSize).toBe('18px');
    expect(native.style.fontWeight).toBe('600');
    expect(native.style.lineHeight).toBe('1.5');
    expect(native.style.color).toBe('#123456');
    expect(native.style.caretColor).toBe('#654321');
    expect(native.style.paddingLeft).toBe('16px');
    expect(native.style.paddingTop).toBe('10px');
    setStyle({ width: 200, height: 44 });
    scene.doLayout();
    expect(native.style.fontSize).toBe('inherit');
    expect(native.style.color).toBe('inherit');
    expect(native.style.caretColor).toBe('auto');
    expect(native.style.letterSpacing).toBe('inherit');
    expect(native.style.paddingLeft).toBe('0px');
  });

  it('updates native and accessible attributes, removes omitted values, and preserves ref-owned semantics when undeclared', () => {
    const [label, setLabel] = createState<string | undefined>('Account');
    const [readOnly, setReadOnly] = createState(true);
    const { native } = setup({
      id: 'account',
      name: 'account',
      autoComplete: 'username',
      inputMode: 'text',
      enterKeyHint: 'done',
      required: true,
      maxLength: 24,
      get readOnly() {
        return readOnly();
      },
      get 'aria-label'() {
        return label();
      },
      'aria-describedby': 'help',
      'aria-invalid': false,
    });
    expect(native.id).toBe('account');
    expect(native.name).toBe('account');
    expect(native.autocomplete).toBe('username');
    expect(native.required).toBe(true);
    expect(native.maxLength).toBe(24);
    expect(native.readOnly).toBe(true);
    expect(native.getAttribute('aria-invalid')).toBe('false');
    setReadOnly(false);
    setLabel(undefined);
    expect(native.readOnly).toBe(false);
    expect(native.hasAttribute('aria-label')).toBe(false);
    const adapted = setup({
      ref(node) {
        node.element.setAttribute('aria-label', 'Adapter name');
        node.element.tabIndex = -1;
      },
    });
    expect(adapted.native.getAttribute('aria-label')).toBe('Adapter name');
    expect(adapted.native.tabIndex).toBe(-1);
  });

  it('keeps equal controlled values untouched and clamps selection when an external replacement is necessary', () => {
    const [value, setValue] = createState('abcdef');
    const { node, native } = setup({
      get value() {
        return value();
      },
      onInput: setValue,
    });
    node.focus({ preventScroll: true });
    expect(document.activeElement).toBe(native);
    native.setSelectionRange(2, 5, 'backward');
    native.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect([
      native.selectionStart,
      native.selectionEnd,
      native.selectionDirection,
    ]).toEqual([2, 5, 'backward']);
    setValue('xyz');
    expect(native.value).toBe('xyz');
    expect([
      native.selectionStart,
      native.selectionEnd,
      native.selectionDirection,
    ]).toEqual([2, 3, 'backward']);
    expect(document.activeElement).toBe(native);
    node.blur();
    expect(document.activeElement).not.toBe(native);
  });

  it('reconciles accepted, normalized and rejected native edits to the latest controlled value', () => {
    const [value, setValue] = createState('initial');
    const { native } = setup({
      get value() {
        return value();
      },
      onInput(next) {
        if (next !== 'reject') setValue(next.toUpperCase());
      },
    });
    input(native, 'accepted');
    expect(value()).toBe('ACCEPTED');
    expect(native.value).toBe('ACCEPTED');
    input(native, 'reject');
    expect(native.value).toBe('ACCEPTED');
    const plain = setup({ defaultValue: 'uncontrolled' });
    input(plain.native, 'free editing');
    expect(plain.native.value).toBe('free editing');
    expect(plain.native.defaultValue).toBe('uncontrolled');
  });

  it('does not use selection-only APIs for input types that do not support them', () => {
    const [value, setValue] = createState('a@example.com');
    const { native } = setup({
      type: 'email',
      get value() {
        return value();
      },
    });
    const select = vi.spyOn(native, 'setSelectionRange');
    setValue('b@example.com');
    expect(native.value).toBe('b@example.com');
    expect(select).not.toHaveBeenCalled();
  });

  it('routes beforeinput, select and clipboard events without replacing or canceling native editing', () => {
    const before = vi.fn();
    const copy = vi.fn();
    const cut = vi.fn();
    const paste = vi.fn();
    const select = vi.fn();
    const { native } = setup({
      readOnly: true,
      defaultValue: 'original',
      onBeforeInput: before,
      onCopy: copy,
      onCut: cut,
      onPaste: paste,
      onSelect: select,
    });
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '中文 clipboard');
    for (const [name, callback] of [
      ['copy', copy],
      ['cut', cut],
      ['paste', paste],
    ] as const) {
      const event = new ClipboardEvent(name, {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      });
      expect(native.dispatchEvent(event)).toBe(true);
      expect(callback).toHaveBeenCalledWith(event);
      expect(event.defaultPrevented).toBe(false);
    }
    const event = new InputEvent('beforeinput', {
      inputType: 'insertFromPaste',
      cancelable: true,
    });
    native.dispatchEvent(event);
    native.dispatchEvent(new Event('select'));
    expect(before).toHaveBeenCalledWith(event);
    expect(select).toHaveBeenCalledTimes(1);
    // Synthetic ClipboardEvent cannot perform a real paste. The native value
    // stays unchanged because Piant did not implement an alternative editor.
    expect(native.value).toBe('original');
  });
});

describe('Input composition synchronization and keyboard boundaries', () => {
  it('honors composing InputEvent flags even if the start notification was not observed', () => {
    vi.useFakeTimers();
    const [value, setValue] = createState('controlled');
    const { native, node } = setup({
      get value() {
        return value();
      },
      onInput: (next) => setValue(next.toUpperCase()),
    });
    input(native, 'draft', true);
    expect(node.isComposing).toBe(true);
    expect(native.value).toBe('draft');
    expect(value()).toBe('DRAFT');
    compose(native, 'compositionend');
    vi.advanceTimersByTime(0);
    expect(native.value).toBe('DRAFT');
  });
  it.each(['before', 'after'] as const)(
    'keeps Chinese drafts intact and handles a final input %s compositionend without a duplicate callback',
    (finalInput) => {
      vi.useFakeTimers();
      const [value, setValue] = createState('initial');
      const onInput = vi.fn((next: string) => setValue(next));
      const onEnd = vi.fn();
      const { node, native } = setup({
        get value() {
          return value();
        },
        onInput,
        onCompositionEnd: onEnd,
      });
      compose(native, 'compositionstart');
      input(native, 'zhong', true);
      setValue('external while composing');
      expect(node.isComposing).toBe(true);
      expect(native.value).toBe('zhong');
      compose(native, 'compositionupdate', '中');
      if (finalInput === 'before') input(native, '中文', true);
      compose(native, 'compositionend', '中文');
      if (finalInput === 'after') input(native, '中文');
      expect(native.value).toBe('中文');
      expect(onEnd).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(0);
      expect(node.isComposing).toBe(false);
      expect(value()).toBe('中文');
      expect(native.value).toBe('中文');
      expect(onInput).toHaveBeenCalledTimes(2);
    },
  );

  it('applies the latest external value after composition when the consumer does not accept the draft', () => {
    vi.useFakeTimers();
    const [value, setValue] = createState('initial');
    const onInput = vi.fn();
    const { native } = setup({
      get value() {
        return value();
      },
      onInput,
    });
    compose(native, 'compositionstart');
    input(native, '中文草稿', true);
    setValue('newest server value');
    expect(native.value).toBe('中文草稿');
    compose(native, 'compositionend', '中文草稿');
    expect(native.value).toBe('中文草稿');
    vi.advanceTimersByTime(0);
    expect(native.value).toBe('newest server value');
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('guards Enter/Escape callbacks and bubbling, while capture consumers can inspect the public state before target dispatch', () => {
    vi.useFakeTimers();
    const down = vi.fn();
    const up = vi.fn();
    const bubble = vi.fn();
    const capture = vi.fn();
    const { node, native, host } = setup({ onKeyDown: down, onKeyUp: up });
    const captured: boolean[] = [];
    host.addEventListener(
      'keydown',
      (event) => {
        const guarded = isComposingInput(event);
        captured.push(guarded);
        if (!guarded) capture();
      },
      true,
    );
    host.addEventListener('keydown', bubble);
    compose(native, 'compositionstart');
    const enter = key(native, 'Enter');
    const escapeEvent = key(native, 'Escape');
    expect(enter.defaultPrevented).toBe(false);
    expect(escapeEvent.defaultPrevented).toBe(false);
    expect(captured).toEqual([true, true]);
    expect(down).not.toHaveBeenCalled();
    expect(bubble).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    compose(native, 'compositionend');
    vi.advanceTimersByTime(0);
    expect(node.isComposing).toBe(false);
    key(native, 'Enter', 'keyup');
    key(native, 'Escape', 'keyup');
    expect(up).not.toHaveBeenCalled();
    key(native, 'Enter');
    key(native, 'Enter', 'keyup');
    expect(down).toHaveBeenCalledTimes(1);
    expect(up).toHaveBeenCalledTimes(1);
    expect(bubble).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])(
    'recognizes boundary keyboard flags %s without compositionstart',
    (options) => {
      const callback = vi.fn();
      const { native } = setup({ onKeyDown: callback, onKeyUp: callback });
      key(native, 'Enter', 'keydown', options);
      key(native, 'Enter', 'keyup');
      expect(callback).not.toHaveBeenCalled();
    },
  );

  it('does not let an earlier settling timer interrupt a new composition session', () => {
    vi.useFakeTimers();
    const { native, node } = setup({ value: 'external' });
    compose(native, 'compositionstart');
    input(native, '一', true);
    compose(native, 'compositionend');
    compose(native, 'compositionstart');
    input(native, '第二轮', true);
    vi.advanceTimersByTime(0);
    expect(node.isComposing).toBe(true);
    expect(native.value).toBe('第二轮');
  });

  it.each(['disabled', 'readOnly'] as const)(
    'settles composition if %s interrupts editing',
    (property) => {
      vi.useFakeTimers();
      const [locked, setLocked] = createState(false);
      const props = {
        value: 'external',
        get [property]() {
          return locked();
        },
      };
      const { native, node } = setup(props);
      compose(native, 'compositionstart');
      input(native, '草稿', true);
      setLocked(true);
      expect(native[property]).toBe(true);
      vi.advanceTimersByTime(0);
      expect(native.value).toBe('external');
      expect(node.isComposing).toBe(false);
    },
  );

  it.each(['node', 'owner'] as const)(
    'removes every DOM listener, pending timer and reactive write on %s cleanup',
    (method) => {
      vi.useFakeTimers();
      const add = vi.spyOn(HTMLInputElement.prototype, 'addEventListener');
      const remove = vi.spyOn(
        HTMLInputElement.prototype,
        'removeEventListener',
      );
      const [disabled, setDisabled] = createState(false);
      const onInput = vi.fn();
      let reads = 0;
      let cleanup = 0;
      const { node, native, stop } = setup({
        value: 'controlled',
        get disabled() {
          reads++;
          return disabled();
        },
        onInput,
        ref() {
          onCleanup(() => cleanup++);
        },
      });
      compose(native, 'compositionstart');
      input(native, '草稿', true);
      compose(native, 'compositionend');
      const expected = add.mock.calls.slice();
      if (method === 'node') node.destroy();
      else stop();
      const previous = reads;
      setDisabled(true);
      vi.advanceTimersByTime(0);
      expect(native.value).toBe('草稿');
      expect(node.isComposing).toBe(false);
      expect(reads).toBe(previous);
      expect(cleanup).toBe(1);
      for (const [name, handler] of expected)
        expect(remove).toHaveBeenCalledWith(name, handler);
      native.dispatchEvent(new Event('input'));
      expect(onInput).toHaveBeenCalledTimes(1);
      stop();
      expect(cleanup).toBe(1);
    },
  );
});
