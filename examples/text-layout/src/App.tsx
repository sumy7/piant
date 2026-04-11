import { Span, StyleSheet, Text, View } from '@piant/core';
import TextList from './TextList';

export function App() {
  const styles = StyleSheet.create({
    pageContainer: {
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      backgroundColor: '#0e1726',
    },
    panel: {
      width: 720,
      maxWidth: '100%',
      height: '100%',
      gap: 16,
      padding: 24,
      backgroundColor: '#f6f2ea',
      borderRadius: 20,
    },
    titleBlock: {},
    title: {
      fontSize: 28,
      color: '#0f172a',
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 15,
      color: '#475569',
      lineHeight: '1.4x',
    },
    textListBlock: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
  });

  return (
    <View style={styles.pageContainer}>
      <View style={styles.panel}>
        <View>
          <Text style={styles.title}>
            <Span>Text Layout Playground</Span>
          </Text>
          <Text style={styles.subtitle}>
            <Span>
              This example isolates text layout scenarios including inline
              images, line wrapping, alignment, line height, letter spacing,
              text transforms, and overflow.
            </Span>
          </Text>
        </View>
        <View style={styles.textListBlock}>
          <TextList />
        </View>
      </View>
    </View>
  );
}
