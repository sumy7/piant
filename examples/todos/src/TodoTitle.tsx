import { StyleSheet, TextView, View } from '@piant/core';

const TodoTitle = () => {
  const styles = StyleSheet.create({
    title: {
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.title}>
      <TextView>My Todos</TextView>
    </View>
  );
};

export default TodoTitle;
