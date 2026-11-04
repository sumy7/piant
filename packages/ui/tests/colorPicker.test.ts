import './anchoredFixture';

import { createState, type PNode } from '@piant/core';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker, type ColorPickerProps } from '../dist/index.js';
import { fixture, key, named, press, runtime, settle } from './anchoredFixture';

function input(label: string, text: string) {
  const element = named(label) as HTMLInputElement;
  element.focus();
  element.value = text;
  element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
  return element;
}
function number(label: string, text: string) {
  key(input(label, text), 'Enter');
}
const hex = () => named('Fill Hex') as HTMLInputElement;
async function picker(props: Partial<ColorPickerProps> = {}) {
  const fixtureResult = fixture(() => ColorPicker({ label: 'Fill', ...props }));
  press('Fill');
  await settle();
  return fixtureResult;
}

describe('ColorPicker', () => {
  it('canonicalizes shorthand and commits Hex on Enter and blur, never on draft input', async () => {
    const changes = vi.fn();
    await picker({ defaultValue: '#abc', onValueChange: changes });
    expect(hex().value).toBe('#aabbccff');
    input('Fill Hex', '#F008');
    expect(changes).not.toHaveBeenCalled();
    key(hex(), 'Enter');
    expect(changes).toHaveBeenLastCalledWith('#ff000088');
    expect(hex().value).toBe('#ff000088');
    input('Fill Hex', ' #00F ');
    named('Fill Hue').focus();
    expect(changes).toHaveBeenLastCalledWith('#0000ffff');
  });

  it('rolls back invalid or empty Hex; first Escape cancels dirty text and second closes', async () => {
    const changes = vi.fn();
    await picker({ onValueChange: changes });
    for (const invalid of ['', '#ggg', '#12', 'red']) {
      input('Fill Hex', invalid);
      key(hex(), 'Enter');
      expect(hex().value).toBe('#3366ffff');
    }
    input('Fill Hex', '#fff');
    key(hex(), 'Escape');
    await settle();
    expect(hex().value).toBe('#3366ffff');
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(changes).not.toHaveBeenCalled();
    key(hex(), 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('retains Hue on gray and saturation on black without emitting unchanged RGB', async () => {
    const changes = vi.fn();
    await picker({ defaultValue: '#808080', onValueChange: changes });
    number('Fill Hue', '240');
    expect(changes).not.toHaveBeenCalled();
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('240');
    number('Fill Saturation', '100');
    expect(hex().value).toBe('#000080ff');
    number('Fill Brightness', '0');
    number('Fill Hue', '120');
    number('Fill Saturation', '50');
    expect(hex().value).toBe('#000000ff');
    number('Fill Brightness', '100');
    expect(hex().value).toBe('#80ff80ff');
  });

  it('honors controlled rejection, canonical aliases and current callbacks', async () => {
    const [value, setValue] = createState('#808080');
    const [accept, setAccept] = createState(false);
    const changes = vi.fn();
    fixture(() =>
      ColorPicker({
        label: 'Fill',
        get value() {
          return value();
        },
        get onValueChange() {
          return accept()
            ? (next: string) => {
                changes(next);
                setValue(next);
              }
            : changes;
        },
      }),
    );
    press('Fill');
    await settle();
    number('Fill Hue', '240');
    number('Fill Saturation', '100');
    expect(changes).toHaveBeenLastCalledWith('#000080ff');
    expect(hex().value).toBe('#808080ff');
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('240');
    setAccept(true);
    input('Fill Hex', '#F00');
    key(hex(), 'Enter');
    expect(value()).toBe('#ff0000ff');
    setValue('#0F0');
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('120');
    // A focused draft remains distinct until explicit submission/cancellation.
    key(hex(), 'Escape');
    expect(hex().value).toBe('#00ff00ff');
  });

  it('forces opaque six-digit output when alpha is disabled and toggles alpha controls', async () => {
    const [alpha, setAlpha] = createState(false);
    fixture(() =>
      ColorPicker({
        label: 'Fill',
        defaultValue: '#f008',
        get alpha() {
          return alpha();
        },
      }),
    );
    press('Fill');
    await settle();
    expect(hex().value).toBe('#ff0000');
    expect(document.querySelector('[aria-label="Fill Alpha"]')).toBeNull();
    input('Fill Hex', '#00f0');
    key(hex(), 'Enter');
    expect(hex().value).toBe('#0000ff');
    setAlpha(true);
    await settle();
    expect(hex().value).toBe('#0000ffff');
    number('Fill Alpha', '50');
    expect(hex().value).toBe('#0000ff80');
  });

  it('rolls back empty numeric drafts and clamps channels, wrapping Hue360', async () => {
    await picker({ defaultValue: '#ff0000' });
    number('Fill Hue', '');
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('0');
    number('Fill Hue', '360');
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('0');
    number('Fill Saturation', '150');
    expect(hex().value).toBe('#ff0000ff');
    number('Fill Brightness', '-5');
    expect(hex().value).toBe('#000000ff');
  });

  it('does not submit or dismiss during IME composition', async () => {
    const changes = vi.fn();
    await picker({ onValueChange: changes });
    const element = hex();
    element.focus();
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    element.value = '#中文';
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, isComposing: true }),
    );
    key(element, 'Enter', { isComposing: true });
    key(element, 'Escape', { isComposing: true });
    element.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'Enter',
        bubbles: true,
        isComposing: true,
      }),
    );
    element.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'Escape',
        bubbles: true,
        isComposing: true,
      }),
    );
    expect(changes).not.toHaveBeenCalled();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    key(element, 'Escape');
    expect(element.value).toBe('#3366ffff');
  });

  it('allows Escape from another control after an abandoned IME Hex draft', async () => {
    const changes = vi.fn();
    await picker({ onValueChange: changes });
    const element = hex();
    element.focus();
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    element.value = '#中文';
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, isComposing: true }),
    );
    named('Fill Hue').focus();
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    key(named('Fill Hue'), 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(changes).not.toHaveBeenCalled();
  });

  it('readOnly opens inspectable native fields but disables changes; disabled never opens', async () => {
    const changes = vi.fn();
    const [disabled, setDisabled] = createState(false);
    fixture(() =>
      ColorPicker({
        label: 'Fill',
        readOnly: true,
        onValueChange: changes,
        get disabled() {
          return disabled();
        },
      }),
    );
    press('Fill');
    await settle();
    expect(hex().readOnly).toBe(true);
    number('Fill Hue', '100');
    expect(changes).not.toHaveBeenCalled();
    press('Close Fill Color editor');
    await settle();
    setDisabled(true);
    press('Fill');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('closes uncontrolled state on disable and waits for an explicit opening after re-enable', async () => {
    const [disabled, setDisabled] = createState(false);
    const opens = vi.fn();
    fixture(() =>
      ColorPicker({
        label: 'Fill',
        get disabled() {
          return disabled();
        },
        onOpenChange: opens,
      }),
    );
    press('Fill');
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    setDisabled(true);
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(opens.mock.calls).toEqual([[true], [false]]);
    setDisabled(false);
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(named('Fill').getAttribute('aria-expanded')).toBe('false');
    press('Fill');
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(opens.mock.calls).toEqual([[true], [false], [true]]);
  });

  it('requests disable closure while a rejected controlled open remains caller-owned', async () => {
    const [disabled, setDisabled] = createState(false);
    const [open, setOpen] = createState(false);
    const opens = vi.fn();
    fixture(() =>
      ColorPicker({
        label: 'Fill',
        get disabled() {
          return disabled();
        },
        get open() {
          return open();
        },
        onOpenChange: opens,
      }),
    );
    setOpen(true);
    named('Fill').focus();
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    setDisabled(true);
    await settle();
    expect(opens).toHaveBeenLastCalledWith(false);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(open()).toBe(true);
    setDisabled(false);
    named('Fill').focus();
    await settle();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
  });

  it('keeps already committed color on dismissal and discards an unsubmitted numeric draft', async () => {
    const changes = vi.fn();
    await picker({ onValueChange: changes });
    number('Fill Hue', '120');
    const accepted = changes.mock.calls.at(-1)![0];
    const numeric = input('Fill Hue', '240');
    key(numeric, 'Escape');
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    press('Fill');
    await settle();
    expect(hex().value).toBe(accepted);
    expect((named('Fill Hue') as HTMLInputElement).value).toBe('120');
  });

  it('cancels a rapid pending open and remains usable on the next opening', async () => {
    fixture(() => ColorPicker({ label: 'Fill' }));
    runtime.pending = true;
    press('Fill');
    press('Fill');
    runtime.pending = false;
    for (const finish of runtime.finish.splice(0)) finish();
    await settle();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    press('Fill');
    await settle();
    expect(hex().value).toBe('#3366ffff');
  });

  it.each(['owner', 'node'] as const)(
    'releases pending/open resources on %s teardown and isolates another instance',
    async (method) => {
      let node!: PNode;
      const [value, setValue] = createState('#f00');
      const first = fixture(() =>
        ColorPicker({
          label: 'First',
          get value() {
            return value();
          },
          ref: (current) => {
            node = current;
          },
        }),
      );
      fixture(() => ColorPicker({ label: 'Second' }));
      runtime.pending = true;
      press('First');
      if (method === 'owner') first.dispose();
      else node.destroyRecursive();
      setValue('#0f0');
      runtime.pending = false;
      for (const finish of runtime.finish.splice(0)) finish();
      await settle();
      expect(document.querySelector('[role=dialog]')).toBeNull();
      press('Second');
      await settle();
      expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
      expect(named('Second Hex')).toBeDefined();
    },
  );

  it('stops after a value callback destroys its owner', async () => {
    let node!: PNode;
    const opens = vi.fn();
    await picker({
      ref: (current) => {
        node = current;
      },
      onValueChange() {
        node.destroyRecursive();
      },
      onOpenChange: opens,
    });
    opens.mockClear();
    input('Fill Hex', '#000');
    key(hex(), 'Enter');
    await settle();
    expect(node.isDestroyed).toBe(true);
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(opens).not.toHaveBeenCalled();
  });
});
