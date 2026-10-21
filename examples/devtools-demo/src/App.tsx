import { animate, type PNodeAnimation } from '@piant/animation';
import { createState, type PNode, Show, StyleSheet, Text, View } from '@piant/core';

const styles = StyleSheet.create({
  page: { width: '100%', height: '100%', padding: 24, gap: 18, backgroundColor: '#0f172a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  text: { fontSize: 16, color: '#cbd5e1' },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#334155', width: 240 },
  card: { width: 240, height: 72, padding: 12, backgroundColor: '#164e63', borderRadius: 8 },
  box: { width: 72, height: 72, backgroundColor: '#818cf8', borderRadius: 12 },
});

export function createDemo() {
  const [count, setCount] = createState(0);
  const [visible, setVisible] = createState(true);
  let box: PNode | undefined;
  let animation: PNodeAnimation | undefined;

  const startAnimation = () => {
    if (!box) return;
    animation?.cancel();
    animation = animate(box, [{ x: 0, rotation: 0 }, { x: 120, rotation: Math.PI }, { x: 0, rotation: Math.PI * 2 }], {
      duration: 2400,
      easing: 'ease-in-out',
    });
  };

  return {
    getState: () => ({ count: count(), cardVisible: visible() }),
    // Keep only the current handle; DevTools reads its existing playback state.
    animations: () => box && animation ? [{ id: 'demo-box', node: box, animation }] : [],
    dispose: () => {
      animation?.cancel();
      animation = undefined;
      box = undefined;
    },
    App: () => {
      const countLabel = () => `Count: ${count()}`;
      return (
        <View style={styles.page}>
          <Text style={styles.title}>Piant Devtools</Text>
          <Text style={styles.text}>Use the element picker or tree to inspect an element.</Text>
          <View style={styles.button} onClick={() => setCount(count() + 1)}>
            <Text style={styles.text}>{countLabel()}</Text>
          </View>
          <View style={styles.button} onClick={() => setVisible(!visible())}>
            <Text style={styles.text}>Toggle dynamic card</Text>
          </View>
          <Show when={visible()}>
            <View style={styles.card}>
              <Text style={styles.text}>Dynamic element</Text>
            </View>
          </Show>
          <View style={styles.button} onClick={startAnimation}>
            <Text style={styles.text}>Start animation</Text>
          </View>
          <View style={styles.box} ref={(node) => { box = node; }} />
        </View>
      );
    },
  };
}
