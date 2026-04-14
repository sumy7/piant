import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../src/components/Input';
import { PInput } from '../src/elements/PInput';
import { PRoot } from '../src/elements/PRoot';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

function createRoot() {
  return new PRoot(new Container(), { width: 200, height: 100 });
}

describe('Input', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a PInput element', () => {
    root(() => {
      const el = Input({});
      expect(el).toBeInstanceOf(PInput);
    });
  });

  it('sets defaultValue on the underlying input element (initialization only)', () => {
    root(() => {
      const el = Input({ defaultValue: 'hello' }) as PInput;
      expect(el._inputElement.value).toBe('hello');
    });
  });

  it('sets controlled value on the underlying input element', () => {
    root(() => {
      const el = Input({ value: 'controlled' }) as PInput;
      expect(el._inputElement.value).toBe('controlled');
    });
  });

  it('updates the input element when controlled value changes reactively', () => {
    root(() => {
      const [value, setValue] = createState('initial');
      const el = Input({
        get value() {
          return value();
        },
      }) as PInput;

      expect(el._inputElement.value).toBe('initial');

      setValue('updated');
      expect(el._inputElement.value).toBe('updated');
    });
  });

  it('sets placeholder on the underlying input element', () => {
    root(() => {
      const el = Input({ placeholder: 'Enter text...' }) as PInput;
      expect(el._inputElement.placeholder).toBe('Enter text...');
    });
  });

  it('sets type on the underlying input element', () => {
    root(() => {
      const el = Input({ type: 'password' }) as PInput;
      expect(el._inputElement.type).toBe('password');
    });
  });

  it('sets disabled on the underlying input element', () => {
    root(() => {
      const el = Input({ disabled: true }) as PInput;
      expect(el._inputElement.disabled).toBe(true);
    });
  });

  it('calls onInput callback with current value when input event fires', () => {
    root(() => {
      const onInput = vi.fn();
      const el = Input({ onInput }) as PInput;

      el._inputElement.value = 'typed';
      el._inputElement.dispatchEvent(new Event('input'));

      expect(onInput).toHaveBeenCalledTimes(1);
      expect(onInput).toHaveBeenCalledWith('typed', expect.any(Event));
    });
  });

  it('calls onChange callback with current value when change event fires', () => {
    root(() => {
      const onChange = vi.fn();
      const el = Input({ onChange }) as PInput;

      el._inputElement.value = 'changed';
      el._inputElement.dispatchEvent(new Event('change'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('changed', expect.any(Event));
    });
  });

  it('calls onFocus callback when focus event fires', () => {
    root(() => {
      const onFocus = vi.fn();
      const el = Input({ onFocus }) as PInput;

      el._inputElement.dispatchEvent(new FocusEvent('focus'));

      expect(onFocus).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onBlur callback when blur event fires', () => {
    root(() => {
      const onBlur = vi.fn();
      const el = Input({ onBlur }) as PInput;

      el._inputElement.dispatchEvent(new FocusEvent('blur'));

      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  it('removes event listeners from the input element on cleanup', () => {
    const addSpy = vi.spyOn(
      HTMLInputElement.prototype,
      'addEventListener',
    );
    const removeSpy = vi.spyOn(
      HTMLInputElement.prototype,
      'removeEventListener',
    );

    let dispose: () => void;
    root((d) => {
      dispose = d;
      Input({
        onInput: vi.fn(),
        onChange: vi.fn(),
        onFocus: vi.fn(),
        onBlur: vi.fn(),
      });
    });

    const addedEvents = addSpy.mock.calls.map((c) => c[0]);
    expect(addedEvents).toContain('input');
    expect(addedEvents).toContain('change');
    expect(addedEvents).toContain('focus');
    expect(addedEvents).toContain('blur');

    dispose!();

    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('input');
    expect(removedEvents).toContain('change');
    expect(removedEvents).toContain('focus');
    expect(removedEvents).toContain('blur');
  });

  it('forwards ref to the PInput element', () => {
    root(() => {
      let captured: PInput | null = null;
      Input({ ref: (el) => (captured = el) });
      expect(captured).toBeInstanceOf(PInput);
    });
  });

  it('applies layout size from Yoga to the DOMContainer on applyLayout', () => {
    root(() => {
      const appRoot = createRoot();
      const el = Input({}) as PInput;
      appRoot.appendChild(el);
      el.setStyle({ width: 120, height: 36 });
      appRoot.doLayout();

      // Yoga layout node should reflect the computed dimensions
      expect(el._layoutNode.getComputedWidth()).toBe(120);
      expect(el._layoutNode.getComputedHeight()).toBe(36);
    });
  });
});
