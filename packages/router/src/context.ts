import {
  createContext,
  createState,
  onCleanup,
  onMount,
  useContext,
} from '@piant/core';
import type { Router } from './router';
import type { RouteState } from './types';

interface RouterContextValue {
  router: Router;
  route: () => RouteState;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export interface RouterProviderProps {
  router: Router;
  children?: any;
}

export function RouterProvider(props: RouterProviderProps) {
  const [route, setRoute] = createState<RouteState>(props.router.getState());

  onMount(() => {
    const unsubscribe = props.router.subscribe((nextRoute: RouteState) => {
      setRoute(nextRoute);
    });

    onCleanup(unsubscribe);
  });

  return RouterContext.Provider({
    value: {
      router: props.router,
      route,
    },
    children: props.children,
  });
}

export function useRouter(): Router {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used inside RouterProvider');
  }

  return context.router;
}

export function useRoute() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRoute must be used inside RouterProvider');
  }

  return context.route;
}

export function useNavigate() {
  const router = useRouter();
  return (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      router.replace(to);
      return;
    }
    router.push(to);
  };
}
