export type RouteParams = Record<string, string>;

export type RouteQueryValue = string | string[];

export type RouteQuery = Record<string, RouteQueryValue>;

export type RouteComponent = (props?: {
  route: RouteState;
  match: RouteMatch;
  children?: any;
}) => any;

export type RouteLoader = () => Promise<
  | RouteComponent
  | {
      default: RouteComponent;
    }
>;

export interface RouteRedirect {
  to: string;
  replace?: boolean;
}

export type GuardResult = boolean | string | RouteRedirect | void;

export interface RouteRecord {
  path: string;
  name?: string;
  meta?: unknown;
  children?: RouteRecord[];
  component?: RouteComponent;
  loader?: RouteLoader;
  redirect?: string | ((params: RouteParams, query: RouteQuery) => string);
  beforeEnter?: (context: {
    to: RouteState;
    from: RouteState;
  }) => GuardResult | Promise<GuardResult>;
}

export interface RouteMatch {
  id: string;
  route: RouteRecord;
  params: RouteParams;
  pathname: string;
}

export interface RouteState {
  path: string;
  fullPath: string;
  params: RouteParams;
  query: RouteQuery;
  match: RouteMatch | null;
  matches: RouteMatch[];
  redirectedFrom: string | null;
  loading: boolean;
  error: Error | null;
  components: Record<string, RouteComponent>;
}

export interface RouterListener {
  (state: RouteState): void;
}

export type RouterMode = 'browser' | 'memory';

export interface CreateRouterOptions {
  routes: RouteRecord[];
  mode?: RouterMode;
  initialPath?: string;
}
