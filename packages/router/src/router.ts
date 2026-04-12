import { createHistory } from './history';
import { compileRoutes, findRouteMatchChain, splitPath } from './path';
import type {
  CreateRouterOptions,
  GuardResult,
  RouteComponent,
  RouteMatch,
  RouteState,
  RouterListener,
} from './types';

const DEFAULT_MODE = 'browser' as const;

export interface Router {
  getState(): RouteState;
  getMatch(path: string): RouteMatch[];
  push(path: string): RouteState;
  replace(path: string): RouteState;
  navigate(path: string, options?: { replace?: boolean }): Promise<RouteState>;
  subscribe(listener: RouterListener): () => void;
  destroy(): void;
}

class PiantRouter implements Router {
  private static readonly MAX_REDIRECT_DEPTH = 10;

  private listeners = new Set<RouterListener>();

  private readonly componentCache = new Map<string, RouteComponent>();

  private readonly pendingLoaders = new Map<string, Promise<void>>();

  private navigationToken = 0;

  private state: RouteState;

  private readonly compiledRoutes;

  private readonly stopListeningHistory: () => void;

  private readonly history;

  constructor(options: CreateRouterOptions) {
    const mode = options.mode ?? DEFAULT_MODE;
    this.compiledRoutes = compileRoutes(options.routes);
    this.history = createHistory(mode, options.initialPath);
    this.state = this.resolve(this.history.getPath(), null);
    this.stopListeningHistory = this.history.listen(() => {
      this.beginNavigation(this.history.getPath(), {
        fromHistory: true,
      });
    });

    void this.beginNavigation(this.history.getPath(), {
      fromHistory: true,
    });
  }

  getState() {
    return this.state;
  }

  getMatch(path: string) {
    const { pathname } = splitPath(path);
    return findRouteMatchChain(pathname, this.compiledRoutes);
  }

  push(path: string) {
    this.history.push(path);
    this.beginNavigation(path);
    return this.state;
  }

  replace(path: string) {
    this.history.replace(path);
    this.beginNavigation(path, { replace: true });
    return this.state;
  }

  async navigate(path: string, options?: { replace?: boolean }) {
    if (options?.replace) {
      this.history.replace(path);
    } else {
      this.history.push(path);
    }

    return this.beginNavigation(path, {
      replace: options?.replace,
    });
  }

  subscribe(listener: RouterListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy() {
    this.stopListeningHistory();
    this.listeners.clear();
    this.pendingLoaders.clear();
  }

  private async beginNavigation(
    path: string,
    options?: {
      fromHistory?: boolean;
      replace?: boolean;
      redirectedFrom?: string | null;
    },
  ) {
    const token = ++this.navigationToken;
    const fromState = this.state;

    try {
      const next = await this.resolveWithGuards(
        path,
        fromState,
        token,
        options?.redirectedFrom ?? null,
      );

      if (!next) return this.state;
      if (token !== this.navigationToken) return this.state;

      this.state = next;
      this.emit(this.state);
      this.preloadMatchedComponents(this.state, token);

      return this.state;
    } catch (error) {
      if (token !== this.navigationToken) return this.state;

      this.state = {
        ...fromState,
        loading: false,
        error: toError(error),
      };
      this.emit(this.state);
      return this.state;
    }
  }

  private resolve(path: string, redirectedFrom: string | null): RouteState {
    const { pathname, query, fullPath } = splitPath(path);
    const matches = findRouteMatchChain(pathname, this.compiledRoutes);
    const match = matches[matches.length - 1] ?? null;

    const components: Record<string, RouteComponent> = {};
    let loading = false;
    matches.forEach((item: RouteMatch) => {
      const directComponent = item.route.component;
      if (directComponent) {
        components[item.id] = directComponent;
        return;
      }

      const loaded = this.componentCache.get(item.id);
      if (loaded) {
        components[item.id] = loaded;
        return;
      }

      if (item.route.loader) {
        loading = true;
      }
    });

    return {
      path: pathname,
      fullPath,
      params: match?.params ?? {},
      query,
      match,
      matches,
      redirectedFrom,
      loading,
      error: null,
      components,
    };
  }

  private async resolveWithGuards(
    path: string,
    fromState: RouteState,
    token: number,
    redirectedFrom: string | null,
    redirectDepth = 0,
  ): Promise<RouteState | null> {
    if (redirectDepth > PiantRouter.MAX_REDIRECT_DEPTH) {
      throw new Error('router redirect limit exceeded');
    }

    const next = this.resolve(path, redirectedFrom);
    const redirect = await this.detectRedirect(next, fromState);
    if (!redirect) {
      return next;
    }

    const targetPath = redirect.to;
    const redirected = redirectedFrom ?? next.fullPath;
    if (redirect.replace) {
      this.history.replace(targetPath);
    } else {
      this.history.push(targetPath);
    }

    if (token !== this.navigationToken) {
      return null;
    }

    return this.resolveWithGuards(
      targetPath,
      fromState,
      token,
      redirected,
      redirectDepth + 1,
    );
  }

  private async detectRedirect(
    to: RouteState,
    from: RouteState,
  ): Promise<{ to: string; replace: boolean } | null> {
    for (const match of to.matches) {
      const route = match.route;

      if (route.redirect) {
        const toPath =
          typeof route.redirect === 'function'
            ? route.redirect(match.params, to.query)
            : route.redirect;
        return {
          to: toPath,
          replace: true,
        };
      }

      if (!route.beforeEnter) continue;

      const result = await route.beforeEnter({ to, from });
      const redirect = normalizeGuardResult(result, from.fullPath || '/');
      if (redirect) return redirect;
    }

    return null;
  }

  private preloadMatchedComponents(state: RouteState, token: number) {
    const jobs = state.matches
      .filter((match: RouteMatch) => !!match.route.loader)
      .map((match: RouteMatch) => this.loadMatchComponent(match, token));

    if (!jobs.length) return;

    Promise.allSettled(jobs).then(() => {
      if (token !== this.navigationToken) return;
      const refreshed = this.resolve(
        this.state.fullPath,
        this.state.redirectedFrom,
      );
      this.state = {
        ...refreshed,
        error: this.state.error,
      };
      this.emit(this.state);
    });
  }

  private loadMatchComponent(match: RouteMatch, token: number) {
    if (this.componentCache.has(match.id)) {
      return Promise.resolve();
    }

    const pending = this.pendingLoaders.get(match.id);
    if (pending) return pending;

    const loader = match.route.loader;
    if (!loader) return Promise.resolve();

    const task = loader()
      .then(
        (
          loaded: Awaited<
            ReturnType<NonNullable<RouteMatch['route']['loader']>>
          >,
        ) => {
          const component = normalizeLoadedComponent(loaded);
          this.componentCache.set(match.id, component);
        },
      )
      .catch((error: unknown) => {
        if (token !== this.navigationToken) return;
        this.state = {
          ...this.state,
          loading: false,
          error: toError(error),
        };
        this.emit(this.state);
      })
      .finally(() => {
        this.pendingLoaders.delete(match.id);
      });

    this.pendingLoaders.set(match.id, task);
    return task;
  }

  private emit(state: RouteState) {
    this.listeners.forEach((listener) => listener(state));
  }
}

function normalizeLoadedComponent(
  loaded: Awaited<ReturnType<NonNullable<RouteMatch['route']['loader']>>>,
) {
  if (typeof loaded === 'function') {
    return loaded;
  }

  return loaded.default;
}

function normalizeGuardResult(
  result: GuardResult,
  fallbackPath: string,
): { to: string; replace: boolean } | null {
  if (result === undefined || result === true) return null;

  if (result === false) {
    return {
      to: fallbackPath,
      replace: true,
    };
  }

  if (typeof result === 'string') {
    return {
      to: result,
      replace: false,
    };
  }

  return {
    to: result.to,
    replace: result.replace ?? true,
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export function createRouter(options: CreateRouterOptions): Router {
  return new PiantRouter(options);
}
