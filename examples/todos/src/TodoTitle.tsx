import { StyleSheet, Text, View } from '@piant/core';

const TodoTitle = () => {
  const styles = StyleSheet.create({
    title: {
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.title}>
      <Text>My Todos</Text>
    </View>
  );
};

export default TodoTitle;
