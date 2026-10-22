import { createState, Input, StyleSheet, Text, View } from '@piant/core';
import { useKey } from '@piant/hooks';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    padding: 20,
    gap: 16,
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  track: {
    width: '100%',
    height: 44,
    position: 'relative',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
  },
  square: {
    width: '20%',
    height: 44,
    position: 'absolute',
    backgroundColor: '#4f46e5',
    borderRadius: 6,
  },
  text: { color: '#0f172a', fontSize: 16 },
});

export default function App() {
  const [position, setPosition] = createState(0);
  const [count, setCount] = createState(0);
  const [focused, setFocused] = createState(false);
  const positionLabel = () => `位置：${position()} / 按键次数：${count()}`;
  const focusLabel = () =>
    focused() ? '已聚焦：← → 移动，Enter 归位' : '请先点击上方输入框';

  return (
    <View style={styles.container}>
      <Input
        style={styles.input}
        placeholder="点击这里，按 ← / →"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        ref={(node) => {
          const target = node._inputElement;
          target.readOnly = true;
          target.setAttribute('aria-label', '键盘示例操作区');
          target.style.color = '#0f172a';
          target.style.fontSize = '16px';

          // Input 同步调用 ref，此时仍在组件的响应式 Owner 内。
          // 指定输入框为目标，Owner 销毁时 useKey 自动移除监听器。
          useKey(
            (event) => ['ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key),
            (event) => {
              event.preventDefault();
              setCount((value) => value + 1);
              if (event.key === 'Enter') {
                setPosition(0);
              } else {
                const step = event.key === 'ArrowLeft' ? -1 : 1;
                setPosition((value) => Math.max(-2, Math.min(2, value + step)));
              }
            },
            { target },
          );
        }}
      />
      <Text style={styles.text}>{focusLabel()}</Text>
      <View style={styles.track}>
        <View style={[styles.square, { left: `${(position() + 2) * 20}%` }]} />
      </View>
      <Text style={styles.text}>{positionLabel()}</Text>
    </View>
  );
}
