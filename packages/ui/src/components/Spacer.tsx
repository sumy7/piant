import { View } from '@piant/core';

export interface SpacerProps {
  /** Fixed space on the parent's flex axis, in logical pixels. Omit to fill free space. */
  size?: number;
}

/** A non-interactive gap that follows the parent's row or column direction. */
export function Spacer(props: SpacerProps): ReturnType<typeof View> {
  return (
    <View
      style={{
        flexBasis: props.size ?? 0,
        flexGrow: props.size === undefined ? 1 : 0,
        flexShrink: 0,
      }}
    />
  );
}
