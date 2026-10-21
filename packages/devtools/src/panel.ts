import { TanStackDevtoolsCore } from '@tanstack/devtools';
import { createInspector } from './inspector';
import type { DevtoolsSnapshot } from './types';

/** Use the framework-independent TanStack shell, docked in the current page. */
export function createPanel(
  mount: HTMLElement,
  select: (id: number) => void,
  refresh: () => void,
  disconnect: () => void,
  onActiveChange: (active: boolean) => void,
  defaultOpen = true,
) {
  const host = mount.ownerDocument.createElement('div');
  host.dataset.piantDevtoolsHost = '';
  mount.appendChild(host);
  let inspector: ReturnType<typeof createInspector> | undefined;
  let snapshot: DevtoolsSnapshot | undefined;
  let removed = false;
  const release = () => {
    onActiveChange(false);
    inspector?.remove();
    inspector = undefined;
  };
  const devtools = new TanStackDevtoolsCore({
    config: {
      defaultOpen,
      hideUntilHover: false,
      triggerMode: 'fixed',
      position: 'bottom-right',
      panelLocation: 'bottom',
    },
    eventBusConfig: { connectToServerBus: false },
    plugins: [
      {
        id: 'piant',
        name: 'Piant',
        defaultOpen: true,
        render(element, props) {
          if (removed) return;
          if (inspector?.host.parentElement !== element) {
            release();
            inspector = createInspector(element, select, refresh, disconnect);
          }
          inspector.host.dataset.theme = props.theme;
          onActiveChange(props.devtoolsOpen);
          if (snapshot) inspector.render(snapshot);
        },
        destroy: release,
      },
    ],
  });
  devtools.mount(host);
  return {
    render(value: DevtoolsSnapshot) {
      snapshot = value;
      inspector?.render(value);
    },
    remove() {
      if (removed) return;
      removed = true;
      try {
        // Also cancels the shell's pending asynchronous mount.
        devtools.unmount();
      } finally {
        release();
        host.remove();
      }
    },
  };
}
