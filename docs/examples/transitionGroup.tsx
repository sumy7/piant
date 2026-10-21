import { animate, type PNodeAnimation } from '@piant/animation';
import {
  createState,
  For,
  onCleanup,
  type PNode,
  StyleSheet,
  Text,
  TransitionGroup,
  View,
} from '@piant/core';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controls: { flexDirection: 'row', gap: 8 },
  button: {
    width: 100,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  buttonText: { color: '#ffffff', fontSize: 16 },
  list: { width: 220, height: 200, gap: 8 },
  card: {
    height: 40,
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#1e293b', fontSize: 16 },
});

export default function App() {
  const [items, setItems] = createState([1, 2]);
  const [busy, setBusy] = createState(false);
  let nextId = 3;
  let disposed = false;
  const animations = new Set<PNodeAnimation>();
  const hint = () => (busy() ? '等待过渡完成…' : '最多 4 项，可清空后重新添加');
  const run = (node: PNode, entering: boolean, done: () => void) => {
    if (disposed) return;
    const animation = animate(
      node,
      entering
        ? [
            { alpha: 0, x: -32 },
            { alpha: 1, x: 0 },
          ]
        : [
            { alpha: 1, x: 0 },
            { alpha: 0, x: 32 },
          ],
      { duration: 450, easing: 'ease-out', fill: 'forwards' },
    );
    animations.add(animation);
    void animation.finished.then(
      () => {
        animations.delete(animation);
        if (!disposed) {
          done();
          setBusy(false);
        }
      },
      () => {
        animations.delete(animation);
      },
    );
  };
  onCleanup(() => {
    disposed = true;
    for (const animation of animations) animation.cancel();
    animations.clear();
  });
  const content = TransitionGroup({
    onEnter: (node: PNode, done) => run(node, true, done),
    onExit: (node: PNode, done) => run(node, false, done),
    children: For({
      get each() {
        return items();
      },
      children: (id) => {
        const label = `卡片 ${id}`;
        return (
          <View style={styles.card}>
            <Text style={styles.text}>{label}</Text>
          </View>
        );
      },
    }),
  });
  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <View
          style={styles.button}
          onClick={() => {
            if (busy() || items().length >= 4) return;
            setBusy(true);
            setItems((value) => [...value, nextId++]);
          }}
        >
          <Text style={styles.buttonText}>添加</Text>
        </View>
        <View
          style={styles.button}
          onClick={() => {
            if (busy() || items().length === 0) return;
            setBusy(true);
            setItems((value) => value.slice(0, -1));
          }}
        >
          <Text style={styles.buttonText}>移除末项</Text>
        </View>
      </View>
      <Text style={styles.text}>{hint()}</Text>
      <View style={styles.list}>{content}</View>
    </View>
  );
}
