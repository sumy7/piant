import type { RouteMatch, RouteParams, RouteQuery, RouteRecord } from './types';

type CompiledRouteNode = {
  id: string;
  route: RouteRecord;
  segmentStart: number;
  segmentEnd: number;
};

export type CompiledRouteBranch = {
  nodes: CompiledRouteNode[];
  segments: string[];
  score: number;
  index: number;
};

export function normalizePath(path: string): string {
  if (!path) return '/';

  const [pathname, search = ''] = path.split('?');
  const normalizedPathname = normalizePathname(pathname);
  if (!search) return normalizedPathname;
  return `${normalizedPathname}?${search}`;
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';

  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

export function splitPath(path: string): {
  pathname: string;
  query: RouteQuery;
  fullPath: string;
} {
  const normalized = normalizePath(path);
  const [pathnamePart, search = ''] = normalized.split('?');
  const pathname = normalizePathname(pathnamePart);
  const query = parseQuery(search);
  const queryString = new URLSearchParams(search).toString();
  const fullPath = queryString ? `${pathname}?${queryString}` : pathname;

  return {
    pathname,
    query,
    fullPath,
  };
}

export function compileRoutes(routes: RouteRecord[]): CompiledRouteBranch[] {
  const branches: CompiledRouteBranch[] = [];

  const walk = (
    routeList: RouteRecord[],
    parentSegments: string[],
    parentNodes: CompiledRouteNode[],
    indexSeed: { value: number },
  ) => {
    routeList.forEach((route) => {
      const normalizedRoute = normalizeRouteRecord(route);
      const ownSegments = toRouteSegments(normalizedRoute.path);
      const segments = parentSegments.concat(ownSegments);
      const node: CompiledRouteNode = {
        id: String(indexSeed.value),
        route: normalizedRoute,
        segmentStart: parentSegments.length,
        segmentEnd: segments.length,
      };
      indexSeed.value += 1;

      const nodes = parentNodes.concat(node);

      branches.push({
        nodes,
        segments,
        score: scoreRouteSegments(segments),
        index: indexSeed.value,
      });

      if (normalizedRoute.children?.length) {
        walk(normalizedRoute.children, segments, nodes, indexSeed);
      }
    });
  };

  walk(routes, [], [], { value: 0 });

  return branches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });
}

export function findRouteMatchChain(
  pathname: string,
  compiledRoutes: CompiledRouteBranch[],
): RouteMatch[] {
  const targetPathname = normalizePathname(pathname);
  const targetSegments = toSegments(targetPathname);

  for (const compiled of compiledRoutes) {
    if (compiled.segments.length !== targetSegments.length) continue;

    const matches = createMatches(compiled, targetSegments, targetPathname);
    if (matches) return matches;
  }

  return [];
}

export function findRouteMatch(
  pathname: string,
  compiledRoutes: CompiledRouteBranch[],
): RouteMatch | null {
  const chain = findRouteMatchChain(pathname, compiledRoutes);
  return chain[chain.length - 1] ?? null;
}

function toSegments(pathname: string): string[] {
  if (pathname === '/') return [];
  return pathname.split('/').filter(Boolean);
}

function toRouteSegments(pathname: string): string[] {
  if (!pathname || pathname === '/') return [];
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function scoreRouteSegments(segments: string[]): number {
  if (segments.length === 0) return 1;

  let score = 0;
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      score += 3;
    } else {
      score += 10;
    }
  }

  return score;
}

function extractParams(
  routeSegments: string[],
  targetSegments: string[],
  segmentStart: number,
  segmentEnd: number,
  baseParams: RouteParams,
): RouteParams | null {
  if (segmentEnd - segmentStart < 0) return null;
  const params: RouteParams = {};
  Object.assign(params, baseParams);

  for (let i = segmentStart; i < segmentEnd; i += 1) {
    const routeSegment = routeSegments[i];
    const targetSegment = targetSegments[i];

    if (targetSegment === undefined) return null;

    if (routeSegment.startsWith(':')) {
      const key = routeSegment.slice(1);
      if (!key) return null;
      params[key] = decodeURIComponent(targetSegment);
      continue;
    }

    if (routeSegment !== targetSegment) {
      return null;
    }
  }

  return params;
}

function createMatches(
  branch: CompiledRouteBranch,
  targetSegments: string[],
  pathname: string,
): RouteMatch[] | null {
  const matches: RouteMatch[] = [];

  let params: RouteParams = {};
  for (const node of branch.nodes) {
    const nextParams = extractParams(
      branch.segments,
      targetSegments,
      node.segmentStart,
      node.segmentEnd,
      params,
    );
    if (!nextParams) return null;
    params = nextParams;

    matches.push({
      id: node.id,
      route: node.route,
      params: { ...params },
      pathname,
    });
  }

  return matches;
}

function normalizeRouteRecord(route: RouteRecord): RouteRecord {
  const normalizedPath = route.path.trim();

  return {
    ...route,
    path:
      normalizedPath === ''
        ? ''
        : normalizedPath.startsWith('/')
          ? normalizePathname(normalizedPath)
          : normalizedPath,
    children: route.children?.map((child: RouteRecord) =>
      normalizeRouteRecord(child),
    ),
  };
}

function parseQuery(search: string): RouteQuery {
  const params = new URLSearchParams(search);
  const query: RouteQuery = {};

  for (const [key, value] of params.entries()) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
      query[key] = current;
      continue;
    }

    query[key] = [current, value];
  }

  return query;
}
