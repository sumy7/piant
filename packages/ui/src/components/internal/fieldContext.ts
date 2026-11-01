import { createContext, type Getter, type PInput } from '@piant/core';

export interface FieldControl {
  node: PInput;
  id: Getter<string>;
  required: Getter<boolean>;
}

export interface FieldScope {
  label: Getter<string>;
  description: Getter<string | undefined>;
  error: Getter<string | undefined>;
  required: Getter<boolean>;
  controlId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  register(control: FieldControl): () => void;
}

export const FieldContext = createContext<FieldScope>();
