import { ScrollView, StyleSheet, Text, View, createState } from '@piant/core';
import { AnimationDemo } from './AnimationDemo';
import { TransitionDemo } from './TransitionDemo';
import { TransitionGroupDemo } from './TransitionGroupDemo';

type Tab = 'transition' | 'transition-group' | 'animation';

const TABS: { key: Tab; label: string }[] = [
  { key: 'transition', label: 'Transition' },
  { key: 'transition-group', label: 'TransitionGroup' },
  { key: 'animation', label: '@piant/animation' },
];

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    backgroundColor: '#0f172a',
  },
  header: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 20,
    paddingBottom: 0,
    gap: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  headerSub: {
    fontSize: 14,
    color: '#64748b',
  },
  tabBar: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    gap: 4,
  },
  tab: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  tabActive: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  divider: {
    height: 1,
    marginLeft: 16,
    marginRight: 16,
    backgroundColor: '#1e293b',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  contentInner: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 32,
  },
  demoPanel: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
});

export function App() {
  const [activeTab, setActiveTab] = createState<Tab>('transition');

  const transitionContent = TransitionDemo({});
  const transitionGroupContent = TransitionGroupDemo({});
  const animationContent = AnimationDemo({});

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Animation Demo</Text>
        <Text style={styles.headerSub}>
          Transition · TransitionGroup · @piant/animation
        </Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(({ key, label }) => (
          <View
            style={activeTab() === key ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(key)}
          >
            <Text
              style={
                activeTab() === key ? styles.tabTextActive : styles.tabText
              }
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <ScrollView style={styles.content}>
        <View style={styles.contentInner}>
          <View style={styles.demoPanel}>
            {activeTab() === 'transition' && transitionContent}
            {activeTab() === 'transition-group' && transitionGroupContent}
            {activeTab() === 'animation' && animationContent}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
