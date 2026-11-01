import type { PNode } from '@piant/core';
import { Graphics } from 'pixi.js';
import { expectTypeOf, it } from 'vitest';
import {
  Icon,
  type IconDraw,
  type IconProps,
  ProgressBar,
  type ProgressBarProps,
  Spinner,
  type SpinnerProps,
} from '../dist/index.js';

it('exports typed display APIs without admitting interactive or conflicting icon props', () => {
  expectTypeOf<ReturnType<typeof ProgressBar>>().toExtend<PNode>();
  expectTypeOf<ReturnType<typeof Spinner>>().toExtend<PNode>();
  const draw: IconDraw = (graphics, width, height, color) => {
    expectTypeOf(graphics).toEqualTypeOf<Graphics>();
    expectTypeOf(width).toBeNumber();
    expectTypeOf(height).toBeNumber();
    expectTypeOf(color).toBeString();
  };
  const drawn: IconProps = { draw, size: 24, color: '#fff', label: 'Star' };
  const progress: ProgressBarProps = {
    min: 10,
    max: 30,
    value: 20,
    indeterminate: false,
    thickness: 4,
  };
  const spinner: SpinnerProps = { active: false, size: 18, color: '#fff' };
  expectTypeOf(drawn.draw).toBeFunction();
  expectTypeOf(progress.value).toEqualTypeOf<number | undefined>();
  expectTypeOf(spinner.active).toEqualTypeOf<boolean | undefined>();
  const errors = () => {
    // @ts-expect-error A visual icon has one source mode.
    Icon({ src: new Graphics(), draw });
    // @ts-expect-error Asset tint belongs to the caller's Sprite/Graphics.
    Icon({ src: new Graphics(), color: '#fff' });
    // @ts-expect-error An icon must provide a drawing entry or caller asset.
    Icon({ size: 24 });
    // @ts-expect-error Static progress is not an interactive focus registration.
    ProgressBar({ value: 30, onActivate: () => {} });
    // @ts-expect-error Display indicators do not opt into Tab navigation.
    Spinner({ tabIndex: 0 });
  };
  expectTypeOf(errors).toBeFunction();
});
