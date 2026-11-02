import { createState, type Getter } from '@piant/core';
import type { ButtonPressEvent } from '../Button';

export type ToastDismissReason =
  'timeout' | 'close' | 'action' | 'programmatic';
export interface ToastAction {
  label: string;
  onAction: (event: ButtonPressEvent) => void;
}
export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  duration?: number;
  priority?: 'polite' | 'assertive' | 'off';
  action?: ToastAction;
  onDismiss?: (reason: ToastDismissReason) => void;
}
export type ToastUpdate = Partial<Omit<ToastInput, 'id' | 'action'>> & {
  action?: ToastAction | null;
};
export interface ToastRecord {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly duration: number;
  readonly priority: 'polite' | 'assertive' | 'off';
  readonly action?: Readonly<ToastAction>;
}
export interface ToastController {
  readonly items: Getter<readonly ToastRecord[]>;
  readonly visible: Getter<readonly ToastRecord[]>;
  readonly queuedCount: Getter<number>;
  show(input: ToastInput): string | undefined;
  update(id: string, patch: ToastUpdate): boolean;
  dismiss(id: string): boolean;
  dismissAll(): void;
}
export interface ToastStoreOptions {
  maxVisible?: number;
  maxToasts?: number;
  duration?: number;
}
export interface ToastStore extends ToastController {
  readonly isDisposed: Getter<boolean>;
  setMounted(mounted: boolean): void;
  setPaused(id: string, reason: string, paused: boolean): void;
  setGlobalPaused(reason: string, paused: boolean): void;
  close(id: string, reason: ToastDismissReason): boolean;
  activate(id: string, event: ButtonPressEvent): boolean;
  dispose(): void;
}
interface Entry {
  version: number;
  record: ToastRecord;
  onDismiss?: ToastInput['onDismiss'];
  paused: Set<string>;
  remaining: number;
  started?: number;
  timer?: ReturnType<typeof setTimeout>;
}
function duration(value: number) {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError('Toast duration must be finite and nonnegative.');
  return value;
}
function text(value: string, name: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Toast ${name} must be a non-empty string.`);
  return value.trim();
}
function normalize(input: ToastInput, id: string, fallback: number) {
  const title = text(input.title, 'title');
  const description = input.description;
  if (description !== undefined && typeof description !== 'string')
    throw new Error('Toast description must be a string.');
  const priority = input.priority === undefined ? 'polite' : input.priority;
  if (!['polite', 'assertive', 'off'].includes(priority))
    throw new Error('Toast priority must be polite, assertive or off.');
  const action = input.action;
  if (action !== undefined && (!action || typeof action !== 'object'))
    throw new Error('Toast action must include a label and onAction callback.');
  const label = action && text(action.label, 'action label');
  if (action && typeof action.onAction !== 'function')
    throw new Error('Toast action requires an onAction callback.');
  if (input.onDismiss !== undefined && typeof input.onDismiss !== 'function')
    throw new Error('Toast onDismiss must be a function.');
  const record: ToastRecord = Object.freeze({
    id,
    title,
    description: description?.trim() || undefined,
    duration: duration(
      input.duration === undefined ? fallback : input.duration,
    ),
    priority,
    action: action
      ? Object.freeze({ label: label!, onAction: action.onAction })
      : undefined,
  });
  return { record, onDismiss: input.onDismiss };
}

/** One provider's bounded FIFO queue. No DOM, global listeners or shared timers. */
export function createToastStore(options: ToastStoreOptions = {}): ToastStore {
  const maxVisible = options.maxVisible === undefined ? 3 : options.maxVisible;
  const maxToasts = options.maxToasts === undefined ? 20 : options.maxToasts;
  if (
    !Number.isInteger(maxVisible) ||
    !Number.isInteger(maxToasts) ||
    maxVisible < 1 ||
    maxToasts < 1 ||
    maxVisible > maxToasts
  )
    throw new RangeError(
      'Toast capacities must be positive integers with maxVisible <= maxToasts.',
    );
  const fallback = duration(
    options.duration === undefined ? 0 : options.duration,
  );
  const [revision, setRevision] = createState(0);
  const entries: Entry[] = [];
  const byId = new Map<string, Entry>();
  const globalPaused = new Set<string>();
  let snapshot: readonly ToastRecord[] = Object.freeze([]);
  let visible: readonly ToastRecord[] = snapshot;
  let sequence = 0;
  let mounted = false;
  let disposed = false;
  function stop(entry: Entry) {
    if (entry.timer === undefined) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.remaining = Math.max(
      0,
      entry.remaining - Math.max(0, Date.now() - entry.started!),
    );
    entry.started = undefined;
  }
  function timers() {
    for (const [index, entry] of entries.entries()) {
      const runnable =
        mounted &&
        index < maxVisible &&
        !globalPaused.size &&
        !entry.paused.size &&
        entry.record.duration > 0;
      if (!runnable) {
        stop(entry);
        continue;
      }
      if (entry.timer !== undefined) continue;
      const currentVersion = entry.version;
      entry.started = Date.now();
      const timer = setTimeout(
        () => {
          if (
            disposed ||
            byId.get(entry.record.id) !== entry ||
            entry.version !== currentVersion ||
            entry.timer !== timer
          )
            return;
          entry.timer = undefined;
          entry.remaining = Math.max(
            0,
            entry.remaining - Math.max(0, Date.now() - entry.started!),
          );
          entry.started = undefined;
          if (entry.remaining > 0) timers();
          else store.close(entry.record.id, 'timeout');
        },
        Math.min(entry.remaining, 2_147_483_647),
      );
      entry.timer = timer;
    }
  }
  function publish() {
    snapshot = Object.freeze(entries.map((entry) => entry.record));
    visible = Object.freeze(snapshot.slice(0, maxVisible));
    setRevision((value) => value + 1);
    if (!disposed) timers();
  }
  function replace(entry: Entry, next: ReturnType<typeof normalize>) {
    stop(entry);
    entry.version++;
    entry.record = next.record;
    entry.onDismiss = next.onDismiss;
    entry.remaining = next.record.duration;
    publish();
  }
  const store: ToastStore = {
    items() {
      revision();
      return snapshot;
    },
    visible() {
      revision();
      return visible;
    },
    queuedCount() {
      revision();
      return Math.max(0, snapshot.length - maxVisible);
    },
    isDisposed: () => {
      revision();
      return disposed;
    },
    show(input) {
      if (disposed) return;
      let id = input.id === undefined ? undefined : text(input.id, 'id');
      let nextSequence = sequence;
      if (id === undefined) {
        do {
          id = `toast-${++nextSequence}`;
        } while (byId.has(id));
      }
      const next = normalize(input, id, fallback);
      const entry = byId.get(id);
      if (entry) {
        replace(entry, next);
        return id;
      }
      if (entries.length >= maxToasts) return;
      sequence = nextSequence;
      const created: Entry = {
        version: 0,
        ...next,
        paused: new Set(),
        remaining: next.record.duration,
      };
      entries.push(created);
      byId.set(id, created);
      publish();
      return id;
    },
    update(id, patch) {
      if (disposed) return false;
      const entry = byId.get(id);
      if (!entry) return false;
      const next = normalize(
        {
          title: patch.title === undefined ? entry.record.title : patch.title,
          description:
            'description' in patch
              ? patch.description
              : entry.record.description,
          duration:
            patch.duration === undefined
              ? entry.record.duration
              : patch.duration,
          priority:
            patch.priority === undefined
              ? entry.record.priority
              : patch.priority,
          action:
            patch.action === null
              ? undefined
              : (patch.action ?? entry.record.action),
          onDismiss: 'onDismiss' in patch ? patch.onDismiss : entry.onDismiss,
        },
        id,
        fallback,
      );
      replace(entry, next);
      return true;
    },
    dismiss: (id) => store.close(id, 'programmatic'),
    close(id, reason) {
      if (disposed) return false;
      const entry = byId.get(id);
      if (!entry) return false;
      stop(entry);
      byId.delete(id);
      entries.splice(entries.indexOf(entry), 1);
      publish();
      entry.onDismiss?.(reason);
      return true;
    },
    dismissAll() {
      if (disposed || !entries.length) return;
      const removed = entries.splice(0);
      for (const entry of removed) stop(entry);
      byId.clear();
      publish();
      let failure: unknown;
      let failed = false;
      for (const entry of removed) {
        if (disposed) break;
        try {
          entry.onDismiss?.('programmatic');
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
      if (failed) throw failure;
    },
    setMounted(value) {
      if (!disposed && mounted !== value) {
        mounted = value;
        timers();
      }
    },
    setPaused(id, reason, paused) {
      if (disposed) return;
      const entry = byId.get(id);
      if (!entry || entry.paused.has(reason) === paused) return;
      if (paused) entry.paused.add(reason);
      else entry.paused.delete(reason);
      timers();
    },
    setGlobalPaused(reason, paused) {
      if (disposed || globalPaused.has(reason) === paused) return;
      if (paused) globalPaused.add(reason);
      else globalPaused.delete(reason);
      timers();
    },
    activate(id, event) {
      if (disposed) return false;
      const entry = byId.get(id);
      const action = entry?.record.action;
      if (!entry || !action) return false;
      const currentVersion = entry.version;
      action.onAction(event);
      if (
        disposed ||
        event.defaultPrevented ||
        byId.get(id) !== entry ||
        entry.version !== currentVersion
      )
        return false;
      return store.close(id, 'action');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const entry of entries) stop(entry);
      entries.length = 0;
      byId.clear();
      globalPaused.clear();
      publish();
    },
  };
  return store;
}
