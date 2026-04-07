import type { ColorSource } from 'pixi.js';
import type { YogaStyles } from './yogaStyles';

export type VisualStyles = {
  /**
   * Background color using PIXI color source format
   */
  backgroundColor: ColorSource;
  /**
   * Border color using PIXI color source format
   */
  borderColor: ColorSource;
  /**
   * Border radius in pixels for rounded corners
   */
  borderRadius: number;
  /**
   * Top-left border radius in pixels
   */
  borderTopLeftRadius: number;
  /**
   * Top-right border radius in pixels
   */
  borderTopRightRadius: number;
  /**
   * Bottom-right border radius in pixels
   */
  borderBottomRightRadius: number;
  /**
   * Bottom-left border radius in pixels
   */
  borderBottomLeftRadius: number;

  /**
   * Opacity of the view (0 to 1)
   */
  opacity: number;

  /**
   * Stacking order of the view
   */
  zIndex: number;
};

export type ViewStyles = Partial<VisualStyles> & YogaStyles;

export interface ImageStyles extends ViewStyles {
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}
