export type Fn<T = void> = () => T;
export type RootFn<T> = (dispose: () => void) => T;
export type EffectFn<Prev, Next extends Prev = Prev> = (v: Prev) => Next;
export type UpdateFn<T> = (value: T) => T;
export type Getter<T> = {
  (): T;
};

export type Setter<T> = {
  (update: UpdateFn<T>): T;
  (value: T): T;
};

export interface EffectOptions {
  name?: string;
}

export interface MemoOptions<Prev, Next extends Prev = Prev>
  extends EffectOptions {
  equals?: false | ((prev: Prev, next: Next) => boolean);
}
