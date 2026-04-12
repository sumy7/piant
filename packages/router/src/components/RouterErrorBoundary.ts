import { ErrorBoundary } from '@piant/core';
import { useRouter } from '../context';

export interface RouterErrorBoundaryProps {
  children: any;
  fallback: ((error: Error, reset: () => void) => any) | any;
  redirectTo?: string;
  replace?: boolean;
  onError?: (error: Error) => void;
}

export function RouterErrorBoundary(props: RouterErrorBoundaryProps) {
  const router = useRouter();

  return ErrorBoundary({
    fallback: (error: Error, reset: () => void) => {
      props.onError?.(error);
      if (props.redirectTo) {
        if (props.replace ?? true) {
          router.replace(props.redirectTo);
        } else {
          router.push(props.redirectTo);
        }
      }

      const fallback = props.fallback;
      if (typeof fallback === 'function') {
        return fallback(error, reset);
      }

      return fallback;
    },
    children: props.children,
  });
}
