import { normalizePath } from './path';
import type { RouterMode } from './types';

export interface RouterHistory {
  getPath(): string;
  push(path: string): void;
  replace(path: string): void;
  listen(listener: () => void): () => void;
}

export function createHistory(
  mode: RouterMode,
  initialPath: string = '/',
): RouterHistory {
  if (mode === 'browser' && canUseBrowserHistory()) {
    return createBrowserHistory();
  }

  return createMemoryHistory(initialPath);
}

function canUseBrowserHistory() {
  return typeof window !== 'undefined' && typeof window.history !== 'undefined';
}

function createBrowserHistory(): RouterHistory {
  return {
    getPath() {
      return normalizePath(
        `${window.location.pathname}${window.location.search}`,
      );
    },
    push(path: string) {
      window.history.pushState({}, '', normalizePath(path));
    },
    replace(path: string) {
      window.history.replaceState({}, '', normalizePath(path));
    },
    listen(listener: () => void) {
      const onPopState = () => listener();
      window.addEventListener('popstate', onPopState);
      return () => {
        window.removeEventListener('popstate', onPopState);
      };
    },
  };
}

function createMemoryHistory(initialPath: string): RouterHistory {
  let currentPath = normalizePath(initialPath);

  return {
    getPath() {
      return currentPath;
    },
    push(path: string) {
      currentPath = normalizePath(path);
    },
    replace(path: string) {
      currentPath = normalizePath(path);
    },
    listen() {
      return () => undefined;
    },
  };
}
