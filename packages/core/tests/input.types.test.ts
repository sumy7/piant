import { expectTypeOf, it } from 'vitest';
import type { InputProps, InputStyles, PInput } from '../src/index';
import { isComposingInput, StyleSheet } from '../src/index';

it('exports typed native editing, typography and composition integration', () => {
  const sheet = StyleSheet.create({
    native: { caretColor: 'red', textAlign: 'start' },
  });
  expectTypeOf(sheet.native.caretColor).toEqualTypeOf<'red'>();
  expectTypeOf(sheet.native.textAlign).toEqualTypeOf<'start'>();
  const style: InputStyles = {
    color: '#112233',
    caretColor: '#ffffff',
    fontSize: 18,
    lineHeight: '1.5x',
    padding: 8,
    textAlign: 'start',
  };
  const props: InputProps = {
    style,
    readOnly: true,
    'aria-invalid': 'spelling',
    'aria-label': 'Name',
    onInput(value, event) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(event).toEqualTypeOf<Event>();
    },
    onKeyDown(event) {
      expectTypeOf(isComposingInput(event)).toEqualTypeOf<boolean>();
    },
    onCompositionEnd(event) {
      expectTypeOf(event).toEqualTypeOf<CompositionEvent>();
    },
    onPaste(event) {
      expectTypeOf(event).toEqualTypeOf<ClipboardEvent>();
    },
    ref(node) {
      expectTypeOf(node).toEqualTypeOf<PInput>();
      expectTypeOf(node.element).toEqualTypeOf<HTMLInputElement>();
      expectTypeOf(node.domElement.element).toEqualTypeOf<HTMLInputElement>();
      expectTypeOf(node.isComposing).toEqualTypeOf<boolean>();
      node.focus({ preventScroll: true });
      node.element.setSelectionRange(0, 1);
    },
  };
  expectTypeOf(props).toEqualTypeOf<InputProps>();
  // @ts-expect-error readOnly is a boolean native state.
  const bad: InputProps = { readOnly: 'yes' };
  // @ts-expect-error Font sizes use logical pixels.
  const unsupported: InputStyles = { fontSize: '16px' };
  void bad;
  void unsupported;
});
