import { describe, expect, it, vi } from 'vitest';
import { handleError, runErrors, SYMBOL_ERRORS } from '../src/reactivity/errors';
import { createOwner, runWithOwner } from '../src/reactivity/owner';

describe('handleError', () => {
  it('throws when no error handlers are registered', () => {
    expect(() => handleError(new Error('boom'))).toThrow('boom');
  });

  it('calls registered error handler with the same error instance', () => {
    const handler = vi.fn();
    const owner = createOwner();
    owner.context[SYMBOL_ERRORS] = [handler];
    const testError = new Error('test-error');
    runWithOwner(owner, () => {
      handleError(testError);
    });
    expect(handler).toHaveBeenCalledWith(testError);
  });

  it('passes string errors to handlers as-is', () => {
    const captured: unknown[] = [];
    const owner = createOwner();
    owner.context[SYMBOL_ERRORS] = [(e: unknown) => captured.push(e)];
    runWithOwner(owner, () => {
      handleError('string error');
    });
    // runErrors passes the original value to handlers, not the cast Error
    expect(captured[0]).toBe('string error');
  });

  it('passes non-Error values to handlers as-is', () => {
    const obj = { some: 'object' };
    const captured: unknown[] = [];
    const owner = createOwner();
    owner.context[SYMBOL_ERRORS] = [(e: unknown) => captured.push(e)];
    runWithOwner(owner, () => {
      handleError(obj);
    });
    expect(captured[0]).toBe(obj);
  });

  it('uses provided owner instead of global', () => {
    const handler = vi.fn();
    const owner = createOwner();
    owner.context[SYMBOL_ERRORS] = [handler];
    handleError(new Error('direct'), owner);
    expect(handler).toHaveBeenCalled();
  });
});

describe('runErrors', () => {
  it('calls all registered error functions', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    runErrors('test', [fn1, fn2], null);
    expect(fn1).toHaveBeenCalledWith('test');
    expect(fn2).toHaveBeenCalledWith('test');
  });

  it('propagates error thrown inside handler up the owner chain', () => {
    const parent = createOwner();
    const parentHandler = vi.fn();
    parent.context[SYMBOL_ERRORS] = [parentHandler];

    const child = createOwner();
    child.owner = parent;

    const handlerError = new Error('handler-error');
    const badHandler = () => {
      throw handlerError;
    };
    runErrors('original', [badHandler], child);
    expect(parentHandler).toHaveBeenCalledWith(handlerError);
  });

  it('throws when handler errors and no parent owner', () => {
    const badHandler = () => {
      throw new Error('unhandled');
    };
    expect(() => runErrors('original', [badHandler], null)).toThrow('unhandled');
  });
});
