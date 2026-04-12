export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type ComponentValue = Primitive | object;

export type ComponentChild =
  | ComponentValue
  | ComponentValue[]
  | (() => ComponentValue | ComponentValue[]);

export type RefCallback<T> = (instance: T) => void;
