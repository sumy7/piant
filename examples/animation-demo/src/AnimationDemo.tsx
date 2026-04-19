import '@piant/animation';
import { StyleSheet, Text, View, createState } from '@piant/core';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  desc: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  stage: {
    width: 320,
    height: 160,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 320,
    justifyContent: 'center',
  },
  btn: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  btnActive: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  btnTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  sequenceArea: {
    width: 320,
    gap: 10,
    alignItems: 'center',
  },
  seqLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});

type Demo =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'rotate'
  | 'color'
  | 'bounce'
  | 'sequence';

const DEMOS: { key: Demo; label: string }[] = [
  { key: 'fade', label: '淡入淡出' },
  { key: 'slide', label: '位移' },
  { key: 'scale', label: '缩放' },
  { key: 'rotate', label: '旋转' },
  { key: 'color', label: '颜色' },
  { key: 'bounce', label: '弹跳' },
  { key: 'sequence', label: '串联' },
];

export function AnimationDemo() {
  const [activeDemo, setActiveDemo] = createState<Demo>('fade');
  const [seqStep, setSeqStep] = createState('');

  let boxRef: any = null;

  const getBox = () => boxRef;

  const runDemo = (key: Demo) => {
    setActiveDemo(key);
    const el = getBox();
    if (!el) return;

    // Reset transform before each demo
    el._animTranslate.x = 0;
    el._animTranslate.y = 0;
    el.alpha = 1;
    el._view.scale.x = 1;
    el._view.scale.y = 1;
    el._view.rotation = 0;
    el.markDirty();

    switch (key) {
      case 'fade':
        el.animate(
          [{ alpha: 1 }, { alpha: 0 }, { alpha: 1 }],
          { duration: 900, easing: 'ease-in-out' },
        );
        break;

      case 'slide':
        el.animate(
          [{ x: 0 }, { x: 80 }, { x: 0 }],
          { duration: 900, easing: 'ease-in-out' },
        );
        break;

      case 'scale':
        el.animate(
          [{ scale: 1 }, { scale: 1.5 }, { scale: 1 }],
          { duration: 800, easing: 'ease-in-out' },
        );
        break;

      case 'rotate':
        el.animate(
          [{ rotation: 0 }, { rotation: Math.PI * 2 }],
          { duration: 900, easing: 'linear' },
        );
        break;

      case 'color':
        el.animate(
          [
            { backgroundColor: '#6366f1' },
            { backgroundColor: '#f59e0b' },
            { backgroundColor: '#10b981' },
            { backgroundColor: '#ef4444' },
            { backgroundColor: '#6366f1' },
          ],
          { duration: 1600, easing: 'ease-in-out', fill: 'forwards' },
        );
        break;

      case 'bounce':
        el.animate(
          [
            { y: 0 },
            { y: -50 },
            { y: 0 },
            { y: -25 },
            { y: 0 },
            { y: -10 },
            { y: 0 },
          ],
          { duration: 1000, easing: 'ease-in-out' },
        );
        break;

      case 'sequence': {
        setSeqStep('Step 1: 淡出');
        el.animate(
          [{ alpha: 1 }, { alpha: 0 }],
          { duration: 350, fill: 'forwards' },
        ).finished.then(() => {
          el._animTranslate.x = -60;
          el.markDirty();
          setSeqStep('Step 2: 位移 + 淡入');
          return el.animate(
            [{ alpha: 0, x: -60 }, { alpha: 1, x: 0 }],
            { duration: 400, easing: 'ease-out', fill: 'forwards' },
          ).finished;
        }).then(() => {
          setSeqStep('Step 3: 缩放弹出');
          return el.animate(
            [{ scale: 1 }, { scale: 1.4 }, { scale: 1 }],
            { duration: 400, easing: 'ease-in-out' },
          ).finished;
        }).then(() => {
          setSeqStep('完成 ✓');
        });
        break;
      }
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>@piant/animation 动画演示</Text>
      <Text style={styles.desc}>点击按钮触发对应动画效果</Text>

      <View style={styles.stage}>
        <View
          style={styles.box}
          ref={(el: any) => {
            boxRef = el;
          }}
        >
          <Text style={styles.boxLabel}>BOX</Text>
        </View>
      </View>

      <View style={styles.btnGrid}>
        {DEMOS.map(({ key, label }) => (
          <View
            style={activeDemo() === key ? styles.btnActive : styles.btn}
            onClick={() => runDemo(key)}
          >
            <Text
              style={
                activeDemo() === key ? styles.btnTextActive : styles.btnText
              }
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {activeDemo() === 'sequence' && seqStep() !== '' && (
        <View style={styles.sequenceArea}>
          <Text style={styles.seqLabel}>{seqStep()}</Text>
        </View>
      )}
    </View>
  );
}
