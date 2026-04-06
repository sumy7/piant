import { Graphics } from 'pixi.js';
import CheckSvg from './check.svg?raw';
import TrashSvg from './trash.svg?raw';
import UncheckSvg from './uncheck.svg?raw';

export const UncheckIcon = (color: string = '#000') =>
  new Graphics().svg(UncheckSvg.replaceAll('currentColor', color));

export const CheckIcon = (color: string = '#000') =>
  new Graphics().svg(CheckSvg.replaceAll('currentColor', color));

export const TrashIcon = (color: string = '#000') =>
  new Graphics().svg(TrashSvg.replaceAll('currentColor', color));
