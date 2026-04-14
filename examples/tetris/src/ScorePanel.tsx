import { StyleSheet, Text, View } from '@piant/core';

interface ScorePanelProps {
  score: number;
  lines: number;
  level: number;
}

const styles = StyleSheet.create({
  panel: {
    gap: 16,
  },
  block: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
});

const ScorePanel = (props: ScorePanelProps) => {
  return (
    <View style={styles.panel}>
      <View style={styles.block}>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.value}>{String(props.score)}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>LINES</Text>
        <Text style={styles.value}>{String(props.lines)}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>LEVEL</Text>
        <Text style={styles.value}>{String(props.level)}</Text>
      </View>
    </View>
  );
};

export default ScorePanel;
