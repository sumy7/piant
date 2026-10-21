import { animate, type PNodeAnimation } from '@piant/animation';
import { type PNode, Show, StyleSheet, Text, View } from '@piant/core';
import { combine, createStore, persist } from '@piant/store';

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    padding: 24,
    gap: 18,
    backgroundColor: '#0f172a',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  text: { fontSize: 16, color: '#cbd5e1' },
  button: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    width: 240,
  },
  card: {
    width: 240,
    height: 72,
    padding: 12,
    backgroundColor: '#164e63',
    borderRadius: 8,
  },
  box: { width: 72, height: 72, backgroundColor: '#818cf8', borderRadius: 12 },
});

export function createDemo() {
  const store = createStore(
    persist(
      combine({ count: 0, cardVisible: true }, (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
        toggleCard: () => set((state) => ({ cardVisible: !state.cardVisible })),
      })),
      {
        name: 'piant-devtools-demo',
        partialize: (state) => ({
          count: state.count,
          cardVisible: state.cardVisible,
        }),
      },
    ),
  );
  const state = store();
  let box: PNode | undefined;
  let animation: PNodeAnimation | undefined;

  const startAnimation = () => {
    if (!box) return;
    animation?.cancel();
    animation = animate(
      box,
      [
        { x: 0, rotation: 0 },
        { x: 120, rotation: Math.PI },
        { x: 0, rotation: Math.PI * 2 },
      ],
      {
        duration: 2400,
        easing: 'ease-in-out',
      },
    );
  };

  return {
    store,
    getState: () => ({ count: state.count, cardVisible: state.cardVisible }),
    // Keep only the current handle; DevTools reads its existing playback state.
    animations: () =>
      box && animation ? [{ id: 'demo-box', node: box, animation }] : [],
    dispose: () => {
      animation?.cancel();
      animation = undefined;
      box = undefined;
    },
    App: () => {
      const countLabel = () => `Count: ${state.count}`;
      return (
        <View style={styles.page}>
          <Text style={styles.title}>Piant Devtools</Text>
          <Text style={styles.text}>
            Use the element picker or tree to inspect an element.
          </Text>
          <View style={styles.button} onClick={state.increment}>
            <Text style={styles.text}>{countLabel()}</Text>
          </View>
          <View style={styles.button} onClick={state.toggleCard}>
            <Text style={styles.text}>Toggle dynamic card</Text>
          </View>
          <Show when={() => state.cardVisible}>
            <View style={styles.card}>
              <Text style={styles.text}>Dynamic element</Text>
            </View>
          </Show>
          <View style={styles.button} onClick={startAnimation}>
            <Text style={styles.text}>Start animation</Text>
          </View>
          <View
            style={styles.box}
            ref={(node) => {
              box = node;
            }}
          />
        </View>
      );
    },
  };
}
