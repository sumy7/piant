import { lookup } from './context';
import { type ContextOwner, getOwner } from './owner';

export const SYMBOL_ERRORS = Symbol();

function castError(err: unknown): Error {
  if (err instanceof Error) {
    return err;
  }

  // @ts-ignore
  return new Error(typeof err === 'string' ? err : 'Unknown error', {
    cause: err,
  });
}

export function handleError(err: unknown, owner?: ContextOwner | null) {
  const currentOwner = owner || getOwner();
  const error = castError(err);
  const fns = lookup(currentOwner, SYMBOL_ERRORS, null);
  if (!fns) throw error;
  runErrors(err, fns, currentOwner);
}

export function runErrors(
  err: unknown,
  fns: ((err: any) => void)[],
  owner: ContextOwner | null,
) {
  try {
    for (const f of fns) f(err);
  } catch (e) {
    handleError(e, (owner && owner.owner) || null);
  }
}
