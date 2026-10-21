import type { PNode, PRoot } from '@piant/core';
import type { Application } from 'pixi.js';
import type { SnapshotValue } from './snapshot';

export type AnimationInspection = {
  readonly id: string;
  readonly node: PNode;
  readonly animation: {
    readonly playState: string;
    readonly currentTime: number | null;
  };
};

export type StoreHistoryEntry = {
  readonly id: number;
  readonly timestamp: number;
  readonly state: SnapshotValue;
  readonly restorable: boolean;
  readonly reason?: string;
};

export type StoreHistorySnapshot = {
  readonly entries: readonly StoreHistoryEntry[];
  readonly currentId: number | null;
  readonly disposed: boolean;
};

/** Explicit history source; the application owns and disposes its recorder. */
export type StoreHistorySource = {
  readonly name: string;
  snapshot(): StoreHistorySnapshot;
  subscribe(listener: () => void): () => void;
  restore(id: number): boolean;
  clear(): void;
};

export type StoreInspection = StoreHistorySnapshot & {
  readonly id: number;
  readonly name: string;
  readonly error?: string;
};

export type DevtoolsOptions = {
  /** Opt in explicitly; false/omitted creates no panel or subscriptions. */
  enabled?: boolean;
  /** Initial Piant panel visibility, true by default; applies on each attachment. */
  defaultOpen?: boolean;
  root: PRoot;
  app: Application;
  mount?: HTMLElement;
  getState?: () => unknown;
  animations?: () => readonly AnimationInspection[];
  /** Explicitly registered store histories. Never discovers or records stores automatically. */
  stores?: readonly StoreHistorySource[];
  sampleInterval?: number;
  maxEntries?: number;
  maxNodes?: number;
};

export type ElementInspection = {
  readonly id: number;
  readonly parentId: number | null;
  readonly depth: number;
  readonly name: string;
};

export type DevtoolsSnapshot = {
  readonly elements: readonly ElementInspection[];
  readonly truncated: boolean;
  readonly selectedId: number | null;
  readonly selection: SnapshotValue;
  readonly state: SnapshotValue;
  readonly animations: SnapshotValue;
  readonly stores?: readonly StoreInspection[];
  readonly stats: {
    readonly frames: number;
    readonly frameInterval: number;
    readonly maxFrameInterval: number;
    readonly layoutUpdates: number;
    readonly layoutDuration: number;
  };
  readonly timeline: readonly {
    readonly time: number;
    readonly duration: number;
  }[];
};

export type DevtoolsSession = {
  select(id: number | null): void;
  refresh(): void;
  snapshot(): DevtoolsSnapshot;
  detach(): void;
};
