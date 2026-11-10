import { Show, Text, View } from '@piant/core';

export default function TodoTitle(props: { compact?: boolean }) {
  return (
    <View style={{ gap: 8, flexShrink: 0 }}>
      <Show when={!props.compact}>
        {(_visible) => (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#2563eb',
              letterSpacing: 2,
            }}
          >
            A LITTLE MORE FOCUS
          </Text>
        )}
      </Show>
      <Text
        style={{
          fontSize: props.compact ? 28 : 34,
          lineHeight: props.compact ? 36 : 42,
          fontWeight: '700',
          color: '#172033',
        }}
      >
        My tasks
      </Text>
      <Show when={!props.compact}>
        {(_visible) => (
          <Text style={{ fontSize: 14, lineHeight: 21, color: '#64748b' }}>
            One thing at a time. Make space for your next step.
          </Text>
        )}
      </Show>
    </View>
  );
}
