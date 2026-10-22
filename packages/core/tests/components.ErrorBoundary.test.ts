import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { root } from '../src/reactivity/effects';
import { handleError } from '../src/reactivity/errors';
import {
  type ContextOwner,
  getOwner,
  runWithOwner,
} from '../src/reactivity/owner';

function read(value: unknown): unknown {
  while (typeof value === 'function') value = value();
  return value;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    root(() => {
      const result = ErrorBoundary({
        fallback: 'error-ui' as any,
        get children() {
          return 'happy-path' as any;
        },
      });
      expect(read(result)).toBe('happy-path');
    });
  });

  it('renders static fallback when error is triggered', () => {
    root(() => {
      let childOwner: ContextOwner | null = null;
      const result = ErrorBoundary({
        fallback: 'error occurred' as any,
        get children() {
          childOwner = getOwner();
          return 'ok' as any;
        },
      });

      // Initially renders children
      expect(read(result)).toBe('ok');

      // Trigger the error from a descendant's owner, inside the boundary.
      runWithOwner(childOwner, () => handleError(new Error('test')));

      // After error, should synchronously show fallback
      expect(read(result)).toBe('error occurred');
    });
  });

  it('renders fallback function with error and reset', () => {
    root(() => {
      const capturedErrors: Error[] = [];
      const capturedResets: Array<() => void> = [];

      let childOwner: ContextOwner | null = null;
      const result = ErrorBoundary({
        fallback: ((err: Error, reset: () => void) => {
          capturedErrors.push(err);
          capturedResets.push(reset);
          return `error: ${err.message}` as any;
        }) as any,
        get children() {
          childOwner = getOwner();
          return 'content' as any;
        },
      });

      // Initially renders children
      expect(read(result)).toBe('content');

      // Trigger an error
      const testError = new Error('test-error');
      runWithOwner(childOwner, () => handleError(testError));

      // The function fallback should be called with error and reset callback
      const rendered = read(result);
      expect(rendered).toBe('error: test-error');
      expect(capturedErrors[0]).toBe(testError);
      expect(typeof capturedResets[0]).toBe('function');
    });
  });

  it('renders children after reset', () => {
    root(() => {
      let capturedReset: (() => void) | null = null;

      let childOwner: ContextOwner | null = null;
      const result = ErrorBoundary({
        fallback: ((_err: Error, reset: () => void) => {
          capturedReset = reset;
          return 'in-error' as any;
        }) as any,
        get children() {
          childOwner = getOwner();
          return 'children' as any;
        },
      });

      // Initially renders children
      expect(read(result)).toBe('children');

      // Trigger error
      runWithOwner(childOwner, () => handleError(new Error('reset-test')));
      expect(read(result)).toBe('in-error');
      expect(capturedReset).not.toBeNull();

      // Reset — should go back to rendering children
      capturedReset!();
      expect(read(result)).toBe('children');
    });
  });

  it('handles error when no outer error handlers exist in context', () => {
    root(() => {
      let childOwner: ContextOwner | null = null;
      const result = ErrorBoundary({
        fallback: 'err' as any,
        get children() {
          childOwner = getOwner();
          return 'ok' as any;
        },
      });

      expect(read(result)).toBe('ok');

      runWithOwner(childOwner, () =>
        handleError(new Error('no-handler-context')),
      );

      expect(read(result)).toBe('err');
    });
  });
});
