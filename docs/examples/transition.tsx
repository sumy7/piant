import { animate, type PNodeAnimation } from '@piant/animation';
import {
  createState,
  onCleanup,
  type PNode,
  Show,
  StyleSheet,
  Text,
  Transition,
  View,
} from '@piant/core';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#4f46e5' },
  buttonText: { color: '#ffffff', fontSize: 16 },
  stage: {
    width: 240,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  card: {
    width: 200,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 10,
  },
  text: { color: '#1e293b', fontSize: 18 },
});

export default function App() {
  const [visible, setVisible] = createState(true);
  const [busy, setBusy] = createState(false);
  const animations = new Set<PNodeAnimation>();
  let disposed = false;
  const buttonLabel = () =>
    busy() ? '过渡中…' : visible() ? '隐藏卡片' : '显示卡片';
  const run = (node: PNode, entering: boolean, done: () => void) => {
    if (disposed) return;
    const animation = animate(
      node,
      entering
        ? [
            { alpha: 0, x: -28 },
            { alpha: 1, x: 0 },
          ]
        : [
            { alpha: 1, x: 0 },
            { alpha: 0, x: 28 },
          ],
      { duration: 450, easing: 'ease-out', fill: 'forwards' },
    );
    animations.add(animation);
    // cancel() rejects finished; cleanup must not complete a disposed transition.
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
  const content = Transition({
    onEnter: (node: PNode, done) => run(node, true, done),
    onExit: (node: PNode, done) => run(node, false, done),
    children: Show({
      get when() {
        return visible();
      },
      // Each new appearance creates a fresh node after the old one was removed.
      children: (_value) => (
        <View style={styles.card}>
          <Text style={styles.text}>进入 / 离开动画</Text>
        </View>
      ),
    }),
  });
  return (
    <View style={styles.root}>
      <View
        style={styles.button}
        onClick={() => {
          if (busy()) return;
          setBusy(true);
          setVisible((value) => !value);
        }}
      >
        <Text style={styles.buttonText}>{buttonLabel()}</Text>
      </View>
      <View style={styles.stage}>{content}</View>
    </View>
  );
}
