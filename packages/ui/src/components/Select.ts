import type { StyleValue, View, ViewStyles } from '@piant/core';
import {
  type ChoiceContentProps,
  type ChoiceOption,
  choiceContent,
  choiceItem,
  choiceRoot,
  choiceTrigger,
} from './internal/choiceList';
import type { ButtonOptions } from './internal/createButton';
import type { MenuItemProps } from './Menu';

export interface SelectOption extends ChoiceOption {}
export interface SelectProps {
  label: string;
  options: readonly SelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
export interface SelectTriggerProps extends ButtonOptions {}
export interface SelectContentProps extends ChoiceContentProps {}
export interface SelectItemProps extends MenuItemProps {}
/** A select-only combobox: fixed options, no text input or free values. */
export function Select(props: SelectProps): ReturnType<typeof View> {
  return choiceRoot('select', props);
}
export function SelectTrigger(
  props: SelectTriggerProps,
): ReturnType<typeof View> {
  return choiceTrigger('select', props);
}
export function SelectContent(
  props: SelectContentProps,
): ReturnType<typeof View> {
  return choiceContent('select', props);
}
export function SelectItem(props: SelectItemProps): ReturnType<typeof View> {
  return choiceItem('select', props);
}
