import '@piant/animation';
import { Show, StyleSheet, Text, Transition, View, createState } from '@piant/core';

const MODES = ['out-in', 'in-out', 'parallel'] as const;
type Mode = (typeof MODES)[number];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 24,
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
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 999,
    backgroundColor: '#1e293b',
  },
  modeBtnActive: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 999,
    backgroundColor: '#6366f1',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modeBtnTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleBtn: {
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardA: {
    width: 280,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardB: {
    width: 280,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardSub: {
    fontSize: 13,
    color: '#e0e7ff',
  },
  stage: {
    width: 320,
    height: 160,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function CardA() {
  return (
    <View style={styles.cardA}>
      <Text style={styles.cardTitle}>Card A</Text>
      <Text style={styles.cardSub}>Purple · Enter from left</Text>
    </View>
  );
}

function CardB() {
  return (
    <View style={styles.cardB}>
      <Text style={styles.cardTitle}>Card B</Text>
      <Text style={styles.cardSub}>Green · Enter from right</Text>
    </View>
  );
}

export function TransitionDemo() {
  const [showA, setShowA] = createState(true);
  const [mode, setMode] = createState<Mode>('out-in');

  const cardA = CardA({});
  const cardB = CardB({});

  const handleToggle = () => setShowA(!showA());

  const SLIDE = 60;
  const DURATION = 380;

  // Pre-create Show with a reactive `when` getter so that the Show memo
  // re-evaluates when `showA` changes instead of holding a stale value.
  const showContent = Show({
    get when() {
      return showA();
    },
    children: cardA,
    fallback: cardB,
  });

  // Pre-create Transition outside JSX so it is instantiated once and holds
  // its own state (mainEl, token, etc.) across re-renders.
  // Pass `mode` as a getter so Transition tracks the reactive dependency and
  // uses the current mode for each new transition.
  const transitionContent = Transition({
    get mode() {
      return mode();
    },
    appear: true,
    onBeforeEnter: (el) => {
      el._animAlpha = 0;
      el._animTranslate.x = showA() ? -SLIDE : SLIDE;
      el.markDirty();
    },
    onEnter: (el, done) => {
      el.animate(
        [
          { alpha: 0, x: showA() ? -SLIDE : SLIDE },
          { alpha: 1, x: 0 },
        ],
        { duration: DURATION, easing: 'ease-out', fill: 'forwards' },
      ).finished.then(done);
    },
    onAfterEnter: (el) => {
      el._animAlpha = null;
      el._animTranslate.x = 0;
      el.markDirty();
    },
    onExit: (el, done) => {
      el.animate(
        [
          { alpha: 1, x: 0 },
          { alpha: 0, x: showA() ? SLIDE : -SLIDE },
        ],
        { duration: DURATION, easing: 'ease-in', fill: 'forwards' },
      ).finished.then(done);
    },
    children: showContent,
  });

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Transition 组件</Text>
      <Text style={styles.desc}>
        切换卡片，体验三种过渡模式的进入 / 离开动画
      </Text>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <View
            style={mode() === m ? styles.modeBtnActive : styles.modeBtn}
            onClick={() => setMode(m)}
          >
            <Text
              style={
                mode() === m ? styles.modeBtnTextActive : styles.modeBtnText
              }
            >
              {m}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.stage}>
        {transitionContent}
      </View>

      <View style={styles.toggleBtn} onClick={handleToggle}>
        <Text style={styles.toggleBtnText}>切换卡片</Text>
      </View>
    </View>
  );
}
