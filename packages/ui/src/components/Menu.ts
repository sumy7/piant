import type { StyleValue, TextProps, View, ViewStyles } from '@piant/core';
import type { ButtonProps } from './Button';
import {
  type ChoiceContentProps,
  type ChoiceOption,
  type ChoiceSelectEvent,
  choiceContent,
  choiceItem,
  choiceRoot,
  choiceTrigger,
} from './internal/choiceList';

export type { ChoiceSelectEvent } from './internal/choiceList';
export interface MenuOption extends ChoiceOption {}
export interface MenuProps {
  label: string;
  items: readonly MenuOption[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  onAction?: (value: string, event: ChoiceSelectEvent) => void;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}
export type MenuTriggerProps = ButtonProps;
export interface MenuContentProps extends ChoiceContentProps {}
export interface MenuItemProps {
  value: string;
  onSelect?: (event: ChoiceSelectEvent) => void;
  style?: StyleValue<ViewStyles>;
  textStyle?: TextProps['style'];
  ref?: Parameters<typeof View>[0]['ref'];
}
export function Menu(props: MenuProps): ReturnType<typeof View> {
  return choiceRoot('menu', props);
}
export function MenuTrigger(props: MenuTriggerProps): ReturnType<typeof View> {
  return choiceTrigger('menu', props);
}
export function MenuContent(props: MenuContentProps): ReturnType<typeof View> {
  return choiceContent('menu', props);
}
export function MenuItem(props: MenuItemProps): ReturnType<typeof View> {
  return choiceItem('menu', props);
}
