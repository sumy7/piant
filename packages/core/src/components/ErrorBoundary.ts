import { createState, onError } from '../reactivity';
import { cleanup, memo, root, untrack } from '../reactivity/effects';

export type ErrorBoundaryProps = {
  fallback: JSX.Element | ((err: Error, reset: () => void) => JSX.Element);
  children: JSX.Element;
};

function resolveChildren(value: JSX.Element): JSX.Element {
  if (typeof value === 'function' && !value.length) {
    // Resolve each accessor in its own owner so a changing sibling does not
    // recreate stable nodes, and deferred rendering stays inside the boundary.
    return memo(() => resolveChildren(value()));
  }
  return Array.isArray(value) ? value.map(resolveChildren) : value;
}

export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  const [errored, setErrored] = createState<Error | null>(null);

  const fallback = (error: Error) => {
    const value = props.fallback;
    return resolveChildren(
      typeof value === 'function' && value.length
        ? untrack(() => value(error, () => setErrored(null)))
        : value,
    );
  };

  const boundary = memo(() => {
    const error = errored();
    if (error) return fallback(error);

    let active = true;
    let disposeChildren: (() => void) | undefined;
    const dispose = () => {
      if (!active) return;
      active = false;
      disposeChildren?.();
    };
    cleanup(dispose);

    const children = root((disposeRoot) => {
      disposeChildren = disposeRoot;
      onError((cause) => {
        if (!active) return;
        setErrored(
          cause instanceof Error
            ? cause
            : new Error(typeof cause === 'string' ? cause : 'Unknown error', {
                cause,
              }),
        );
      });
      return memo(() => resolveChildren(props.children));
    });

    // An initial construction error can occur before this memo's first run
    // completes. Select fallback now rather than depend on a later rerun.
    const initialError = untrack(errored);
    if (initialError) {
      dispose();
      return fallback(initialError);
    }
    return children;
  });

  return () => {
    let value = boundary();
    while (typeof value === 'function' && !value.length) value = value();
    return value;
  };
}
