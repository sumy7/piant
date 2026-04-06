import { createState, onError } from '../reactivity';
import { memo, untrack } from '../reactivity/effects';

export function ErrorBoundary(props: {
  fallback: JSX.Element | ((err: Error, reset: () => void) => JSX.Element);
  children: JSX.Element;
}): JSX.Element {
  const [errored, setErrored] = createState<Error | null>(null);

  onError(setErrored);

  return memo(() => {
    const e = errored();
    if (e) {
      const f = props.fallback;

      return typeof f === 'function' && f.length
        ? untrack(() => f(e, () => setErrored(null)))
        : f;
    } else return props.children;
  });
}
