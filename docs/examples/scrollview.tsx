import { ScrollView, Text, View } from '@piant/core';

export default function App() {
  let resetScroll: (() => void) | undefined;
  const rows = Array.from({ length: 12 }, (_, index) => ({
    label: `第 ${index + 1} 项${index === 11 ? ' · 已到底部' : ''}`,
    color: index % 2 === 0 ? '#e0e7ff' : '#f1f5f9',
  }));

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        padding: 16,
        gap: 12,
        alignItems: 'center',
      }}
    >
      <ScrollView
        style={{
          width: '100%',
          maxWidth: 320,
          height: 200,
          flexShrink: 0,
          backgroundColor: '#e2e8f0',
        }}
        ref={(node) => {
          resetScroll = () => node.scrollTop();
        }}
      >
        <View style={{ width: '100%', gap: 4, padding: 4 }}>
          {rows.map((row) => (
            <View
              style={{
                width: '100%',
                height: 48,
                flexShrink: 0,
                padding: 12,
                backgroundColor: row.color,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 16 }}>
                {row.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={{
          width: 144,
          height: 40,
          flexShrink: 0,
          borderRadius: 8,
          backgroundColor: '#4f46e5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => resetScroll?.()}
      >
        <Text style={{ color: '#ffffff', fontSize: 16 }}>回到顶部</Text>
      </View>
    </View>
  );
}
