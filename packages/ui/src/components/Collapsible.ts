import {
  type PNode,
  type StyleValue,
  View,
  type ViewStyles,
} from '@piant/core';
import { createControllableState } from '../primitives/createControllableState';
import { getFocusScope } from '../primitives/focusScope';
import { useUITheme } from '../theme/UIProvider';
import { componentRoot } from './internal/componentRoot';
import {
  compositeId,
  createCompositePanel,
  createCompositeTrigger,
  type PanelMountStrategy,
} from './internal/compositeParts';

export interface CollapsibleProps {
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  mountStrategy?: PanelMountStrategy;
  children: () => unknown;
  style?: StyleValue<ViewStyles>;
  triggerStyle?: StyleValue<ViewStyles>;
  panelStyle?: StyleValue<ViewStyles>;
  ref?: Parameters<typeof View>[0]['ref'];
}

export function Collapsible(props: CollapsibleProps): ReturnType<typeof View> {
  getFocusScope();
  return componentRoot(() => {
    const scope = getFocusScope();
    const theme = useUITheme();
    const label = () => {
      if (!props.label?.trim())
        throw new Error('Collapsible requires a non-empty label.');
      return props.label;
    };
    label();
    const [open, setOpen] = createControllableState({
      get value() {
        return props.open;
      },
      defaultValue: props.defaultOpen ?? false,
      onChange: (value) => props.onOpenChange?.(value),
    });
    const triggerId = compositeId('disclosure-trigger');
    const panelId = compositeId('disclosure-panel');
    const trigger = createCompositeTrigger({
      get label() {
        return label();
      },
      id: triggerId,
      controls: panelId,
      get expanded() {
        return open();
      },
      get disabled() {
        return props.disabled;
      },
      get style(): StyleValue<ViewStyles> {
        return props.triggerStyle;
      },
      onActivate() {
        if (!props.disabled) setOpen(!open());
      },
    });
    const panel = createCompositePanel({
      id: panelId,
      labelledBy: triggerId,
      get active() {
        return open();
      },
      get mountStrategy() {
        return props.mountStrategy;
      },
      get style(): StyleValue<ViewStyles> {
        return props.panelStyle;
      },
      get children() {
        return props.children;
      },
      onBeforeHide() {
        if (!trigger.focus.focus()) scope.focusFirst();
      },
    });
    return View({
      get style(): StyleValue<ViewStyles> {
        return [
          { flexDirection: 'column', minWidth: 0, gap: theme().spacing.xs },
          props.style,
        ];
      },
      children: [trigger.node, panel],
    }) as PNode;
  }, props.ref);
}
