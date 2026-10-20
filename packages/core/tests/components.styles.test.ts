import { Container, Graphics } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import {
  Align,
  BoxSizing,
  Direction,
  Display,
  FlexDirection,
  Justify,
  Overflow,
  PositionType,
  Unit,
  Wrap,
} from 'yoga-layout';
import { CustomView } from '../src/components/CustomView';
import { Image } from '../src/components/Image';
import { Input } from '../src/components/Input';
import { ScrollView } from '../src/components/ScrollView';
import { Text } from '../src/components/Text';
import { View } from '../src/components/View';
import type { ViewStyles } from '../src/elements/layout/viewStyles';
import type { PNode } from '../src/elements/PNode';
import { PRoot } from '../src/elements/PRoot';
import type { PText } from '../src/elements/PText';
import { root } from '../src/reactivity/effects';
import { createState } from '../src/reactivity/hooks';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  writable: true,
  value: () => ({
    font: '',
    measureText: (text: string) => ({ width: text.length * 8 }),
  }),
});

describe('component style bindings', () => {
  it('clears removed visual and Yoga styles while restoring element defaults', () => {
    root(() => {
      const [style, setStyle] = createState<ViewStyles>({
        width: 100,
        backgroundColor: 'red',
        opacity: 0.4,
        display: 'none',
        overflow: 'hidden',
        alignItems: 'center',
        alignContent: 'center',
        alignSelf: 'center',
        boxSizing: 'content-box',
        direction: 'rtl',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        position: 'absolute',
      });
      const element = View({
        get style() {
          return style();
        },
      }) as PNode;
      const appRoot = new PRoot(new Container(), { width: 200, height: 100 });
      appRoot.appendChild(element);

      expect(element._layoutNode.getWidth().value).toBe(100);
      expect(element._layoutNode.getDisplay()).toBe(Display.None);
      expect(element._layoutNode.getAlignItems()).toBe(Align.Center);
      expect(element._layoutNode.getPositionType()).toBe(PositionType.Absolute);

      setStyle({});
      appRoot.doLayout();

      expect(element._layoutStyle.backgroundColor).toBeUndefined();
      expect(element._layoutStyle.opacity).toBeUndefined();
      expect(element._view.alpha).toBe(1);
      expect(element._layoutNode.getWidth().unit).toBe(Unit.Undefined);
      expect(element._layoutNode.getDisplay()).toBe(Display.Flex);
      expect(element._layoutNode.getOverflow()).toBe(Overflow.Visible);
      expect(element._layoutNode.getAlignContent()).toBe(Align.FlexStart);
      expect(element._layoutNode.getAlignItems()).toBe(Align.Stretch);
      expect(element._layoutNode.getAlignSelf()).toBe(Align.Auto);
      expect(element._layoutNode.getBoxSizing()).toBe(BoxSizing.BorderBox);
      expect(element._layoutNode.getDirection()).toBe(Direction.Inherit);
      expect(element._layoutNode.getFlexDirection()).toBe(
        FlexDirection.Column,
      );
      expect(element._layoutNode.getFlexWrap()).toBe(Wrap.NoWrap);
      expect(element._layoutNode.getJustifyContent()).toBe(Justify.FlexStart);
      expect(element._layoutStyle.position).toBe('static');
      expect(element._layoutNode.getPositionType()).toBe(PositionType.Static);
    });
  });

  it('diffs flattened style arrays against their previous resolved value', () => {
    root(() => {
      const [active, setActive] = createState(true);
      const element = View({
        get style() {
          return [
            { width: 40, backgroundColor: 'blue' },
            active() && { width: 80, opacity: 0.5 },
          ];
        },
      }) as PNode;

      expect(element._layoutStyle.width).toBe(80);
      expect(element._layoutStyle.opacity).toBe(0.5);

      setActive(false);

      expect(element._layoutStyle.width).toBe(40);
      expect(element._layoutStyle.backgroundColor).toBe('blue');
      expect(element._layoutStyle.opacity).toBeUndefined();
    });
  });

  it('tracks mutations of the same observable style object', () => {
    root(() => {
      const [style] = createState<ViewStyles>({
        width: 20,
        backgroundColor: 'green',
      });
      const element = View({
        get style() {
          return style();
        },
      }) as PNode;

      style().width = 60;
      delete style().backgroundColor;

      expect(element._layoutStyle.width).toBe(60);
      expect(element._layoutStyle.backgroundColor).toBeUndefined();
    });
  });

  it.each<[
    string,
    (props: { style?: ViewStyles }) => unknown,
    PositionType,
  ]>([
    [
      'Image',
      (props: { style?: ViewStyles }) =>
        Image({
          src: new Graphics(),
          get style() {
            return props.style;
          },
        }),
      PositionType.Relative,
    ],
    ['Input', (props) => Input(props), PositionType.Static],
    ['CustomView', (props) => CustomView(props), PositionType.Relative],
    ['ScrollView', (props) => ScrollView(props), PositionType.Static],
  ])(
    'clears removed styles for %s',
    (_name, createComponent, defaultPosition) => {
    root(() => {
      const [style, setStyle] = createState<ViewStyles>({
        width: 75,
        position: 'absolute',
      });
      const element = createComponent({
        get style() {
          return style();
        },
      }) as PNode;

      expect(element._layoutNode.getWidth().value).toBe(75);
      setStyle({});
      expect(element._layoutNode.getWidth().unit).toBe(Unit.Undefined);
      expect(element._layoutNode.getPositionType()).toBe(defaultPosition);
    });
    },
  );

  it('restores Text defaults when text-specific overrides are removed', () => {
    root(() => {
      const [style, setStyle] = createState({
        fontSize: 30,
        color: 'red',
        position: 'absolute' as const,
      });
      const createText = Text({
        get style() {
          return style();
        },
        children: 'hello',
      });
      const element = createText() as PText;

      expect(element._textLayoutStyle.fontSize).toBe(30);
      expect(element._textLayoutStyle.color).toBe('red');

      setStyle({} as ReturnType<typeof style>);

      expect(element._textLayoutStyle.fontSize).toBe(16);
      expect(element._textLayoutStyle.color).toBe('#000000');
      expect(element._layoutStyle.position).toBe('static');
      expect(element._layoutNode.getPositionType()).toBe(PositionType.Static);
    });
  });
});
