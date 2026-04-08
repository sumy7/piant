import { describe, expect, it } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { root } from '../src/reactivity/effects';
import { handleError } from '../src/reactivity/errors';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    root(() => {
      const result = ErrorBoundary({
        fallback: 'error-ui' as any,
        children: 'happy-path' as any,
      });
      expect((result as any)()).toBe('happy-path');
    });
  });

  it('renders static fallback when error is triggered', () => {
    root(() => {
      const result = ErrorBoundary({
        fallback: 'error occurred' as any,
        children: 'ok' as any,
      });

      // Initially renders children
      expect((result as any)()).toBe('ok');

      // onError registered setErrored on the root owner; trigger it
      handleError(new Error('test'));

      // After error, should synchronously show fallback
      expect((result as any)()).toBe('error occurred');
    });
  });

  it('renders fallback function with error and reset', () => {
    root(() => {
      const capturedErrors: Error[] = [];
      const capturedResets: Array<() => void> = [];

      const result = ErrorBoundary({
        fallback: ((err: Error, reset: () => void) => {
          capturedErrors.push(err);
          capturedResets.push(reset);
          return `error: ${err.message}` as any;
        }) as any,
        children: 'content' as any,
      });

      // Initially renders children
      expect((result as any)()).toBe('content');

      // Trigger an error
      const testError = new Error('test-error');
      handleError(testError);

      // The function fallback should be called with error and reset callback
      const rendered = (result as any)();
      expect(rendered).toBe('error: test-error');
      expect(capturedErrors[0]).toBe(testError);
      expect(typeof capturedResets[0]).toBe('function');
    });
  });

  it('renders children after reset', () => {
    root(() => {
      let capturedReset: (() => void) | null = null;

      const result = ErrorBoundary({
        fallback: ((_err: Error, reset: () => void) => {
          capturedReset = reset;
          return 'in-error' as any;
        }) as any,
        children: 'children' as any,
      });

      // Initially renders children
      expect((result as any)()).toBe('children');

      // Trigger error
      handleError(new Error('reset-test'));
      expect((result as any)()).toBe('in-error');
      expect(capturedReset).not.toBeNull();

      // Reset — should go back to rendering children
      capturedReset!();
      expect((result as any)()).toBe('children');
    });
  });

  it('does not throw when error occurs without handlers in context', () => {
    expect(() => {
      root(() => {
        ErrorBoundary({
          fallback: 'err' as any,
          children: 'ok' as any,
        });
      });
    }).not.toThrow();
  });
});
