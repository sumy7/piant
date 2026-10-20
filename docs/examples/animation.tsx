import type { PNodeAnimation } from '@piant/animation';
import '@piant/animation';
import { onCleanup, type PNode, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  square: {
    width: 96,
    height: 96,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
  },
  text: { color: '#171717', fontSize: 16 },
  button: {
    width: 144,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
});

export default function App() {
  let square: PNode | undefined;
  let animation: PNodeAnimation | undefined;
  const replay = () => {
    animation?.cancel();
    animation = square?.animate([{ alpha: 0 }, { alpha: 1 }], {
      duration: 1000,
      easing: 'ease-in-out',
    });
    // 重播或卸载时取消动画，会拒绝 finished Promise。
    animation?.finished.catch(() => {});
  };
  onCleanup(() => animation?.cancel());

  return (
    <View style={styles.container}>
      <View
        style={styles.square}
        ref={(node) => {
          square = node;
        }}
        onClick={replay}
      />
      <Text style={styles.text}>点击方块或按钮播放淡入动画</Text>
      <View style={styles.button} onClick={replay}>
        <Text style={styles.buttonText}>重播动画</Text>
      </View>
    </View>
  );
}
