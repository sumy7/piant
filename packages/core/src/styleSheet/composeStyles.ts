export default function composeStyles<T extends object = object>(
  style1?: Partial<T> | null,
  style2?: Partial<T> | null,
): Partial<T> | [Partial<T>, Partial<T>] | undefined {
  if (!style1) {
    return style2 ?? undefined;
  }
  if (!style2) {
    return style1;
  }
  return [style1, style2];
}
