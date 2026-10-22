import {
  createEffect,
  onCleanup,
  root,
  Transition,
  type TransitionProps,
} from '@piant/core';
import { useRoute } from '../context';
import type { RouteComponent, RouteMatch } from '../types';

export interface RouteViewProps {
  /** Opt in to enter/exit hooks for each route, loading and error view. */
  transition?: Omit<TransitionProps, 'children'>;
  /** Use a factory to create fresh content when a transition revisits a fallback. */
  fallback?: any;
  /** A node, or a factory producing a new loading view for each visit. */
  loadingFallback?: any;
  errorFallback?: ((error: Error) => any) | any;
}

export function RouteView(props: RouteViewProps = {}) {
  const route = useRoute();

  const render = () => renderState(route());

  const renderState = (state: ReturnType<typeof route>) => {
    if (state.error) {
      const fallback = props.errorFallback;
      if (typeof fallback === 'function') {
        return fallback(state.error);
      }
      return fallback ?? [];
    }

    if (state.loading) {
      return props.loadingFallback ?? props.fallback ?? [];
    }

    if (!state.matches.length) {
      return props.fallback ?? [];
    }

    return renderMatches(
      state.matches,
      state.components,
      state,
      props.fallback ?? [],
    );
  };

  if (!props.transition) return render;

  // Independent roots keep page subscriptions alive during exit. The Transition
  // effect can rerun without disposing a still-visible page's owner.
  const pages = new Map<any, () => void>();
  let lastState: ReturnType<typeof route> | undefined;
  let pending: any;
  onCleanup(() => {
    for (const dispose of pages.values()) dispose();
    pages.clear();
  });
  const output = Transition({
    ...props.transition,
    children: (() => {
      const state = route();
      if (
        lastState &&
        state.fullPath === lastState.fullPath &&
        state.loading === lastState.loading &&
        state.error === lastState.error &&
        state.matches.length === lastState.matches.length &&
        state.matches.every(
          (match, index) => match.id === lastState!.matches[index].id,
        )
      )
        return pending;
      lastState = state;
      let disposePage!: () => void;
      pending = root((dispose) => {
        disposePage = dispose;
        let view = renderState(state);
        // Factory fallbacks create a fresh node when a loading/error stage is
        // revisited; renderer removals destroy nodes, so they cannot be reused.
        while (typeof view === 'function' && view.length === 0) view = view();
        return view;
      });
      // Empty fallback arrays are normalized to null by Transition.
      if (pending == null || (Array.isArray(pending) && !pending.length)) {
        disposePage();
      } else {
        if (pages.has(pending)) disposePage();
        else pages.set(pending, disposePage);
      }
      return pending;
    }) as TransitionProps['children'],
  });
  createEffect(() => {
    const visible = (output as unknown as () => any[])();
    for (const [page, dispose] of pages) {
      if (page !== pending && !visible.includes(page)) {
        pages.delete(page);
        dispose();
      }
    }
  });
  return output;
}

function renderMatches(
  matches: RouteMatch[],
  components: Record<string, RouteComponent>,
  route: ReturnType<ReturnType<typeof useRoute>>,
  fallback: any,
) {
  let children = fallback;

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    const component = components[match.id];
    if (!component) continue;

    children = component({
      route,
      match,
      children,
    });
  }

  return children;
}
