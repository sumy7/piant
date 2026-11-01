import {
  createState,
  onError,
  PInput,
  type PNode,
  PRoot,
  render,
  View,
} from '@piant/core';
import {
  Container,
  DOMContainer,
  EventBoundary,
  FederatedPointerEvent,
} from 'pixi.js';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  Field,
  TextField,
  type TextFieldProps,
  UIProvider,
  type UIProviderProps,
} from '../dist/index.js';

const cleanups: Array<() => void> = [];
const originalGetContext = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
);
beforeAll(() => {
  vi.stubGlobal('OffscreenCanvas', undefined);
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      font: '14px Arial',
      setTransform() {},
      clearRect() {},
      fillText() {},
      fillRect() {},
      measureText(text: string) {
        const size = Number.parseFloat(
          this.font.match(/([\d.]+)px/)?.[1] ?? '14',
        );
        return {
          width: (text.length * size) / 2,
          actualBoundingBoxAscent: size * 0.75,
          actualBoundingBoxDescent: size * 0.25,
        };
      },
    }),
  });
});
afterAll(() => {
  if (originalGetContext)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getContext',
      originalGetContext,
    );
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function fixture(create: () => unknown, options: UIProviderProps = {}) {
  const dom = document.createElement('div');
  document.body.append(dom);
  const host = new PRoot(new Container(), { width: 400, height: 300 });
  const props = Object.create(options) as UIProviderProps;
  props.children = () =>
    View({
      style: { width: 400, alignItems: 'stretch' },
      children: create() as ReturnType<typeof View>,
    });
  const dispose = render(() => UIProvider(props), host);
  function syncDOM() {
    const visit = (node: PNode) => {
      for (const child of node._view.children) {
        if (child instanceof DOMContainer && !dom.contains(child.element))
          dom.append(child.element);
      }
      for (const child of node._children) visit(child);
    };
    visit(host);
    host.doLayout();
  }
  syncDOM();
  cleanups.push(() => {
    dispose();
    host.destroyRecursive();
    dom.remove();
  });
  return { host, dom, dispose, syncDOM };
}

function standalone(props: TextFieldProps, options?: UIProviderProps) {
  let node!: PInput;
  const forwarded = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(props),
  ) as TextFieldProps;
  const originalRef = props.ref;
  forwarded.ref = (current) => {
    node = current;
    originalRef?.(current);
  };
  const scene = fixture(() => TextField(forwarded), options);
  return { ...scene, node, element: node.element };
}

function input(
  element: HTMLInputElement,
  value: string,
  options: InputEventInit = {},
) {
  element.value = value;
  const event = new InputEvent('input', { bubbles: true, ...options });
  element.dispatchEvent(event);
  return event;
}

function key(
  element: HTMLInputElement,
  type: 'keydown' | 'keyup',
  value: string,
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}

function refs(element: HTMLElement, attribute: string) {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

describe('published TextField value and native editing', () => {
  it('requires a provider and reports missing standalone names without creating an unnamed native input', () => {
    expect(() => TextField({ 'aria-label': 'Name' })).toThrow('UIProvider');
    const errors = vi.fn();
    const { dom } = fixture(() => {
      onError(errors);
      return TextField({});
    });
    expect(dom.querySelectorAll('input')).toHaveLength(0);
    expect(
      errors.mock.calls.some(([error]) =>
        String(error).includes('accessible name'),
      ),
    ).toBe(true);
  });

  it('reports attempts to clear a standalone name while retaining the last valid native name', () => {
    const [label, setLabel] = createState('Name');
    const errors = vi.fn();
    let node!: PInput;
    const { dom } = fixture(() => {
      onError(errors);
      return TextField({
        get 'aria-label'() {
          return label();
        },
        ref: (current) => {
          node = current;
        },
      });
    });
    const element = node.element;
    setLabel('');
    expect(
      errors.mock.calls.some(([error]) =>
        String(error).includes('accessible name'),
      ),
    ).toBe(true);
    expect(element.getAttribute('aria-label')).toBe('Name');
    setLabel('Updated name');
    expect(element.getAttribute('aria-label')).toBe('Updated name');
    expect(dom.querySelector('input')).toBe(element);
  });

  it('preserves standalone external name, description and error references across native focus registration', () => {
    const label = document.createElement('span');
    label.id = 'text-field-external-name';
    label.textContent = 'External name';
    const details = document.createElement('span');
    details.id = 'text-field-external-details';
    details.textContent = 'External details';
    const error = document.createElement('span');
    error.id = 'text-field-external-error';
    error.textContent = 'External error';
    document.body.append(label, details, error);
    cleanups.push(() => {
      label.remove();
      details.remove();
      error.remove();
    });
    const { node, element } = standalone({
      'aria-labelledby': label.id,
      'aria-describedby': details.id,
      'aria-errormessage': error.id,
      invalid: true,
    });
    expect(refs(element, 'aria-labelledby')).toEqual([label.id]);
    expect(refs(element, 'aria-describedby')).toEqual([details.id]);
    expect(refs(element, 'aria-errormessage')).toEqual([error.id]);
    node.focus();
    node.blur();
    expect(refs(element, 'aria-describedby')).toEqual([details.id]);
    expect(element.getAttribute('aria-invalid')).toBe('true');
  });

  it('retains the native editing callback surface without converting beforeinput, clipboard or selection events into value notifications', () => {
    const onValueChange = vi.fn();
    const onBeforeInput = vi.fn();
    const onCopy = vi.fn();
    const onCut = vi.fn();
    const onPaste = vi.fn();
    const onSelect = vi.fn();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const { element } = standalone({
      'aria-label': 'Name',
      onValueChange,
      onBeforeInput,
      onCopy,
      onCut,
      onPaste,
      onSelect,
      onFocus,
      onBlur,
    });
    for (const [callback, event] of [
      [
        onBeforeInput,
        new InputEvent('beforeinput', { inputType: 'insertText', data: 'A' }),
      ],
      [onCopy, new ClipboardEvent('copy')],
      [onCut, new ClipboardEvent('cut')],
      [onPaste, new ClipboardEvent('paste')],
      [onSelect, new Event('select')],
      [onFocus, new FocusEvent('focus')],
      [onBlur, new FocusEvent('blur')],
    ] as const) {
      element.dispatchEvent(event);
      expect(callback).toHaveBeenCalledExactlyOnceWith(event);
    }
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('uses one PInput/native input and forwards accepted and rejected controlled edits through the latest callbacks', () => {
    const [value, setValue] = createState('saved');
    const [accept, setAccept] = createState(false);
    const first = vi.fn();
    const second = vi.fn((next: string) => setValue(next));
    const onInput = vi.fn();
    const onChange = vi.fn();
    let exposed!: PInput;
    const { node, element, dom } = standalone({
      'aria-label': 'Name',
      get value() {
        return value();
      },
      get onValueChange() {
        return accept() ? second : first;
      },
      onInput,
      onChange,
      ref: (current) => {
        exposed = current;
      },
    });
    expect(node).toBeInstanceOf(PInput);
    expect(exposed).toBe(node);
    expect(dom.querySelectorAll('input')).toHaveLength(1);
    expect(dom.querySelectorAll('button')).toHaveLength(0);
    const rejected = input(element, 'rejected');
    expect(first).toHaveBeenCalledExactlyOnceWith('rejected', rejected);
    expect(onInput).toHaveBeenCalledExactlyOnceWith('rejected', rejected);
    expect(element.value).toBe('saved');
    setAccept(true);
    const accepted = input(element, 'accepted');
    expect(second).toHaveBeenCalledExactlyOnceWith('accepted', accepted);
    expect(element.value).toBe('accepted');
    expect(onInput).toHaveBeenCalledTimes(2);
    const changed = new Event('change', { bubbles: true });
    element.dispatchEvent(changed);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('accepted', changed);
    expect(second).toHaveBeenCalledTimes(1);
    expect(dom.querySelector('input')).toBe(element);
  });

  it('reads the uncontrolled default only during initialization and preserves subsequent native edits', () => {
    const [initial, setInitial] = createState('initial');
    let reads = 0;
    const onValueChange = vi.fn();
    const { element } = standalone({
      'aria-label': 'Name',
      get defaultValue() {
        reads++;
        return initial();
      },
      onValueChange,
    });
    const initialReads = reads;
    expect(element.value).toBe('initial');
    input(element, 'edited');
    setInitial('new default');
    expect(element.value).toBe('edited');
    expect(reads).toBe(initialReads);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('updates an email input through core without reading unsupported selection properties', () => {
    const [value, setValue] = createState('first@example.com');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { element } = standalone({
      'aria-label': 'Email',
      type: 'email',
      get value() {
        return value();
      },
    });
    const start = vi
      .spyOn(element, 'selectionStart', 'get')
      .mockImplementation(() => {
        throw new Error('Unsupported selection');
      });
    const end = vi
      .spyOn(element, 'selectionEnd', 'get')
      .mockImplementation(() => {
        throw new Error('Unsupported selection');
      });
    expect(() => setValue('updated@example.com')).not.toThrow();
    expect(element.value).toBe('updated@example.com');
    expect(start).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('forwards native input attributes, type, placeholder, readOnly and disabled through reactive getters', async () => {
    const [locked, setLocked] = createState(false);
    const [password, setPassword] = createState(false);
    const { node, element } = standalone({
      'aria-label': 'Account',
      id: 'account-test',
      name: 'account',
      autoComplete: 'username',
      inputMode: 'text',
      minLength: 2,
      maxLength: 30,
      pattern: '[A-Za-z]+',
      required: true,
      get type() {
        return password() ? 'password' : 'text';
      },
      get placeholder() {
        return locked() ? 'Locked' : 'Enter name';
      },
      get readOnly() {
        return locked();
      },
      get disabled() {
        return password();
      },
    });
    expect(element.id).toBe('account-test');
    expect(element.name).toBe('account');
    expect(element.getAttribute('autocomplete')).toBe('username');
    expect(element.getAttribute('inputmode')).toBe('text');
    expect(element.minLength).toBe(2);
    expect(element.maxLength).toBe(30);
    expect(element.pattern).toBe('[A-Za-z]+');
    expect(element.required).toBe(true);
    expect(element.type).toBe('text');
    expect(element.placeholder).toBe('Enter name');
    setLocked(true);
    expect(element.readOnly).toBe(true);
    expect(element.disabled).toBe(false);
    expect(element.tabIndex).toBe(0);
    node.focus();
    expect(document.activeElement).toBe(element);
    node.blur();
    expect(document.activeElement).not.toBe(element);
    setPassword(true);
    await Promise.resolve();
    expect(element.type).toBe('password');
    expect(element.disabled).toBe(true);
    expect(element.tabIndex).toBe(-1);
  });

  it('keeps input, focus, value and selection while theme, density, font scale and style props update', () => {
    const [large, setLarge] = createState(false);
    const [override, setOverride] = createState(false);
    const { node, element, dom, host } = standalone(
      {
        'aria-label': 'Name',
        defaultValue: 'editable selection',
        get size() {
          return large() ? 'lg' : 'md';
        },
        get style() {
          return override()
            ? {
                fontSize: 30,
                lineHeight: 42,
                color: '#00ff00',
                caretColor: '#ff0000',
                width: 180,
              }
            : undefined;
        },
      },
      {
        get colorMode() {
          return large() ? 'dark' : 'light';
        },
        get density() {
          return large() ? 'compact' : 'comfortable';
        },
        get fontScale() {
          return large() ? 2 : 1;
        },
      },
    );
    node.focus();
    element.setSelectionRange(2, 8, 'backward');
    expect(element.style.fontSize).toBe('14px');
    expect(element.style.getPropertyValue('--piant-placeholder-color')).toBe(
      '#475569',
    );
    const marker = element.getAttribute('data-piant-text-field');
    expect(marker).toBeTruthy();
    expect(dom.querySelector('style')?.textContent).toContain(
      `input[data-piant-text-field="${marker}"]::placeholder`,
    );
    const originalHeight = node._layoutNode.getComputedHeight();
    setLarge(true);
    host.doLayout();
    expect(element.style.fontSize).toBe('28px');
    expect(element.style.getPropertyValue('--piant-placeholder-color')).toBe(
      '#cbd5e1',
    );
    expect(node._layoutNode.getComputedHeight()).toBeGreaterThan(
      originalHeight,
    );
    expect(element.value).toBe('editable selection');
    expect(document.activeElement).toBe(element);
    expect([
      element.selectionStart,
      element.selectionEnd,
      element.selectionDirection,
    ]).toEqual([2, 8, 'backward']);
    setOverride(true);
    host.doLayout();
    expect(element.style.fontSize).toBe('30px');
    expect(element.style.lineHeight).toBe('42px');
    expect(element.style.color).toBe('#00ff00');
    expect(element.style.caretColor).toBe('#ff0000');
    expect(node._layoutNode.getComputedWidth()).toBe(180);
    expect(dom.querySelector('input')).toBe(element);
    expect(document.activeElement).toBe(element);
    expect(element.selectionStart).toBe(2);
  });

  it('keeps composition ordering, guards business Enter/Escape and emits value notifications only for actual input', () => {
    vi.useFakeTimers();
    const [value, setValue] = createState('saved');
    const onValueChange = vi.fn();
    const onInput = vi.fn();
    const onCompositionStart = vi.fn();
    const onCompositionEnd = vi.fn();
    const onKeyDown = vi.fn();
    const onKeyUp = vi.fn();
    const { node, element, dom } = standalone({
      'aria-label': 'Name',
      get value() {
        return value();
      },
      onValueChange,
      onInput,
      onCompositionStart,
      onCompositionEnd,
      onKeyDown,
      onKeyUp,
    });
    const outer = vi.fn();
    dom.addEventListener('keydown', outer);
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { data: '' }),
    );
    expect(node.isComposing).toBe(true);
    const first = input(element, '拼', {
      isComposing: true,
      inputType: 'insertCompositionText',
    });
    key(element, 'keydown', 'Enter');
    key(element, 'keyup', 'Enter');
    key(element, 'keydown', 'Escape');
    key(element, 'keyup', 'Escape');
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(onKeyUp).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
    setValue('controlled during composition');
    expect(element.value).toBe('拼');
    element.dispatchEvent(
      new CompositionEvent('compositionend', { data: '拼音' }),
    );
    const final = input(element, '拼音', { inputType: 'insertText' });
    expect(element.value).toBe('拼音');
    expect(onValueChange.mock.calls).toEqual([
      ['拼', first],
      ['拼音', final],
    ]);
    expect(onInput).toHaveBeenCalledTimes(2);
    expect(onCompositionStart).toHaveBeenCalledTimes(1);
    expect(onCompositionEnd).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(element.value).toBe('controlled during composition');
    expect(node.isComposing).toBe(false);
    expect(onValueChange).toHaveBeenCalledTimes(2);
    key(element, 'keydown', 'Enter');
    key(element, 'keyup', 'Enter');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyUp).toHaveBeenCalledTimes(1);
    expect(outer).toHaveBeenCalledTimes(1);
  });
});

describe('Field names, descriptions and validation', () => {
  it('links real label, description and error elements while keeping caller references and one native input', () => {
    const [labelText, setLabelText] = createState('Account');
    const [message, setMessage] = createState<string>();
    const [required, setRequired] = createState(false);
    const extra = document.createElement('span');
    extra.id = 'external-field-description';
    extra.textContent = 'External details';
    document.body.append(extra);
    cleanups.push(() => extra.remove());
    let node!: PInput;
    const { dom, host } = fixture(() =>
      Field({
        get label() {
          return labelText();
        },
        description: 'Use a short name',
        get error() {
          return message();
        },
        get required() {
          return required();
        },
        children: () =>
          TextField({
            'aria-describedby': extra.id,
            ref: (current) => {
              node = current;
            },
          }),
      }),
    );
    const element = node.element;
    const label = dom.querySelector('label')!;
    const descriptionId = refs(element, 'aria-describedby').find(
      (id) => id !== extra.id,
    )!;
    expect(label.textContent).toBe('Account');
    expect(label.htmlFor).toBe(element.id);
    expect(refs(element, 'aria-labelledby')).toContain(label.id);
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      'Use a short name',
    );
    expect(refs(element, 'aria-describedby')).toContain(extra.id);
    expect(element.hasAttribute('aria-errormessage')).toBe(false);
    expect(element.getAttribute('aria-invalid')).not.toBe('true');
    expect(element.required).toBe(false);
    setMessage('Already taken');
    setRequired(true);
    host.doLayout();
    const [errorId] = refs(element, 'aria-errormessage');
    expect(document.getElementById(errorId)?.textContent).toBe('Already taken');
    expect(refs(element, 'aria-describedby')).toEqual(
      expect.arrayContaining([extra.id, descriptionId, errorId]),
    );
    expect(element.getAttribute('aria-invalid')).toBe('true');
    expect(element.required).toBe(true);
    expect(element.getAttribute('aria-required')).toBe('true');
    expect(dom.querySelectorAll('input')).toHaveLength(1);
    expect(dom.querySelectorAll('button')).toHaveLength(0);
    setMessage(undefined);
    setRequired(false);
    host.doLayout();
    expect(refs(element, 'aria-describedby')).not.toContain(errorId);
    expect(element.hasAttribute('aria-errormessage')).toBe(false);
    expect(element.getAttribute('aria-invalid')).not.toBe('true');
    expect(element.required).toBe(false);
    expect(dom.querySelector('input')).toBe(element);
    setLabelText('Updated account');
    host.doLayout();
    expect(label.textContent).toBe('Updated account');
    expect(refs(element, 'aria-labelledby')).toContain(label.id);
    expect(refs(element, 'aria-describedby')).toContain(extra.id);
    expect(dom.querySelector('input')).toBe(element);
  });

  it('combines local required/invalid with Field requirements and keeps a caller-provided input id', () => {
    const [fieldRequired, setFieldRequired] = createState(true);
    const [localRequired, setLocalRequired] = createState(false);
    const [invalid, setInvalid] = createState(false);
    const [id, setId] = createState('custom-field-control');
    let node!: PInput;
    const { dom } = fixture(() =>
      Field({
        label: 'Name',
        get required() {
          return fieldRequired();
        },
        children: () =>
          TextField({
            get id() {
              return id();
            },
            get required() {
              return localRequired();
            },
            get invalid() {
              return invalid();
            },
            ref: (current) => {
              node = current;
            },
          }),
      }),
    );
    expect(node.element.id).toBe('custom-field-control');
    expect(dom.querySelector('label')?.htmlFor).toBe('custom-field-control');
    setId('updated-field-control');
    expect(node.element.id).toBe('updated-field-control');
    expect(dom.querySelector('label')?.htmlFor).toBe('updated-field-control');
    expect(node.element.required).toBe(true);
    setFieldRequired(false);
    expect(node.element.required).toBe(false);
    setLocalRequired(true);
    expect(node.element.required).toBe(true);
    setInvalid(true);
    expect(node.element.getAttribute('aria-invalid')).toBe('true');
    setInvalid(false);
    expect(node.element.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('keeps nested Field control names, error associations and ids isolated', () => {
    let outer!: PInput;
    let inner!: PInput;
    const { dom } = fixture(() =>
      Field({
        label: 'Outer',
        description: 'Outer help',
        children: () =>
          View({
            children: [
              TextField({
                ref: (current) => {
                  outer = current;
                },
              }),
              Field({
                label: 'Inner',
                error: 'Inner error',
                children: () =>
                  TextField({
                    ref: (current) => {
                      inner = current;
                    },
                  }),
              }),
            ],
          }),
      }),
    );
    expect(outer.element.id).not.toBe(inner.element.id);
    const outerLabel = refs(outer.element, 'aria-labelledby');
    const innerLabel = refs(inner.element, 'aria-labelledby');
    expect(outerLabel).toHaveLength(1);
    expect(innerLabel).toHaveLength(1);
    expect(outerLabel[0]).not.toBe(innerLabel[0]);
    expect(document.getElementById(outerLabel[0])?.textContent).toBe('Outer');
    expect(document.getElementById(innerLabel[0])?.textContent).toBe('Inner');
    const [innerError] = refs(inner.element, 'aria-errormessage');
    expect(document.getElementById(innerError)?.textContent).toBe(
      'Inner error',
    );
    expect(refs(outer.element, 'aria-describedby')).not.toContain(innerError);
    expect(outer.element.getAttribute('aria-invalid')).not.toBe('true');
    expect(inner.element.getAttribute('aria-invalid')).toBe('true');
    expect(dom.querySelectorAll('input')).toHaveLength(2);
    expect(dom.querySelectorAll('style')).toHaveLength(2);
    expect(outer.element.getAttribute('data-piant-text-field')).not.toBe(
      inner.element.getAttribute('data-piant-text-field'),
    );
    expect(dom.querySelectorAll('button')).toHaveLength(0);
  });

  it('focuses its input from the Canvas label and ignores a disabled control', () => {
    const [disabled, setDisabled] = createState(false);
    let field!: PNode;
    let node!: PInput;
    fixture(() =>
      Field({
        label: 'Name',
        ref: (current) => {
          field = current;
        },
        children: () =>
          TextField({
            get disabled() {
              return disabled();
            },
            ref: (current) => {
              node = current;
            },
          }),
      }),
    );
    field._children[0]._view.emit(
      'pointertap',
      new FederatedPointerEvent(new EventBoundary()),
    );
    expect(document.activeElement).toBe(node.element);
    node.blur();
    setDisabled(true);
    field._children[0]._view.emit(
      'pointertap',
      new FederatedPointerEvent(new EventBoundary()),
    );
    expect(document.activeElement).not.toBe(node.element);
  });
});

describe('TextField lifecycle', () => {
  it('keeps a live Field usable after only its TextField node is destroyed without recreating native input or placeholder styles', () => {
    const errors = vi.fn();
    const consoleErrors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const [changed, setChanged] = createState(false);
    let field!: PNode;
    let node!: PInput;
    let inputCreations = 0;
    const { dom, host, syncDOM } = fixture(() => {
      onError(errors);
      return Field({
        get label() {
          return changed() ? 'Updated name' : 'Name';
        },
        get description() {
          return changed() ? 'Updated help' : 'Help';
        },
        get error() {
          return changed() ? 'Invalid value' : undefined;
        },
        get required() {
          return changed();
        },
        ref: (current) => {
          field = current;
        },
        children: () =>
          TextField({
            placeholder: 'Enter a name',
            ref: (current) => {
              node = current;
              inputCreations++;
            },
          }),
      });
    });
    const element = node.element;
    const label = dom.querySelector('label')!;
    expect(dom.querySelectorAll('input')).toHaveLength(1);
    expect(dom.querySelectorAll('style')).toHaveLength(1);
    node.destroyRecursive();
    expect(field.isDestroyed).toBe(false);
    expect(element.isConnected).toBe(false);
    expect(dom.querySelectorAll('input,style')).toHaveLength(0);
    expect(element.hasAttribute('data-piant-text-field')).toBe(false);
    expect(element.style.getPropertyValue('--piant-placeholder-color')).toBe(
      '',
    );
    expect(() => {
      for (const next of [true, false, true]) {
        setChanged(next);
        host.doLayout();
        syncDOM();
      }
    }).not.toThrow();
    expect(label.textContent).toBe('Updated name');
    expect(dom.textContent).toContain('Updated help');
    expect(dom.textContent).toContain('Invalid value');
    expect(field.isDestroyed).toBe(false);
    expect(node.isDestroyed).toBe(true);
    expect(inputCreations).toBe(1);
    expect(dom.querySelectorAll('input,style')).toHaveLength(0);
    expect(errors).not.toHaveBeenCalled();
    expect(consoleErrors).not.toHaveBeenCalled();
  });

  it('destroys the Field label, help/error targets and its native child before later Field updates', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const [changed, setChanged] = createState(false);
    const onValueChange = vi.fn();
    let field!: PNode;
    let node!: PInput;
    const { dom, host } = fixture(() =>
      Field({
        get label() {
          return changed() ? 'Updated name' : 'Name';
        },
        description: 'Help',
        get error() {
          return changed() ? 'New error' : 'Invalid';
        },
        get required() {
          return changed();
        },
        ref: (current) => {
          field = current;
        },
        children: () =>
          TextField({
            defaultValue: 'kept',
            onValueChange,
            ref: (current) => {
              node = current;
            },
          }),
      }),
    );
    const element = node.element;
    const labelIds = refs(element, 'aria-labelledby');
    const descriptionIds = refs(element, 'aria-describedby');
    field.destroyRecursive();
    expect(node.isDestroyed).toBe(true);
    expect(element.isConnected).toBe(false);
    expect(dom.querySelectorAll('input,label')).toHaveLength(0);
    for (const id of [...labelIds, ...descriptionIds])
      expect(document.getElementById(id)).toBeNull();
    expect(() => {
      setChanged(true);
      host.doLayout();
    }).not.toThrow();
    input(element, 'detached');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(['owner', 'node'] as const)(
    'releases native events and semantic registration on %s disposal before reactive updates',
    (method) => {
      vi.useFakeTimers();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [changed, setChanged] = createState(false);
      const onValueChange = vi.fn();
      const onInput = vi.fn();
      const { node, element, dispose, host, dom } = standalone(
        {
          'aria-label': 'Name',
          get value() {
            return changed() ? 'after destroy' : 'initial';
          },
          get placeholder() {
            return changed() ? 'changed' : 'initial';
          },
          get size() {
            return changed() ? 'lg' : 'md';
          },
          onValueChange,
          onInput,
        },
        {
          get colorMode() {
            return changed() ? 'dark' : 'light';
          },
          get density() {
            return changed() ? 'compact' : 'comfortable';
          },
          get fontScale() {
            return changed() ? 2 : 1;
          },
        },
      );
      element.dispatchEvent(new CompositionEvent('compositionstart'));
      element.dispatchEvent(new CompositionEvent('compositionend'));
      if (method === 'owner') dispose();
      else node.destroyRecursive();
      expect(element.isConnected).toBe(false);
      expect(dom.querySelectorAll('input')).toHaveLength(0);
      expect(dom.querySelector('style')).toBeNull();
      const previous = element.value;
      expect(() => {
        setChanged(true);
        host.doLayout();
        vi.advanceTimersByTime(1);
      }).not.toThrow();
      expect(element.value).toBe(previous);
      input(element, 'detached edit');
      expect(onInput).not.toHaveBeenCalled();
      expect(onValueChange).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
    },
  );
});
