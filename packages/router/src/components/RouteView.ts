import { useRoute } from '../context';
import type { RouteComponent, RouteMatch } from '../types';

export interface RouteViewProps {
  fallback?: any;
  loadingFallback?: any;
  errorFallback?: ((error: Error) => any) | any;
}

export function RouteView(props: RouteViewProps = {}) {
  const route = useRoute();

  return () => {
    const state = route();

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
