import { mount, onError } from '@piant/core';

export type ExampleComponent = () => unknown;

export async function mountExample(
  host: HTMLElement,
  component: ExampleComponent,
  signal: AbortSignal,
  reportError: (error: unknown) => void,
): Promise<() => void> {
  const instance = await mount(
    () => {
      onError(reportError);
      return component();
    },
    host,
    {
      signal,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    },
  );
  return instance.destroy;
}
