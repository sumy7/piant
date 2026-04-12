import { StyleSheet, View } from '@piant/core';
import TodoInput from './TodoInput';
import TodoList from './TodoList';
import TodoTitle from './TodoTitle';
import { useTodoStore } from './todoStore';

export function App() {
  const styles = StyleSheet.create({
    pageContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    todoContainer: {
      width: 500,
      height: '100%',
      maxHeight: '100%',
      gap: 16,
    },
  });

  const store = useTodoStore();

  return (
    <View style={styles.pageContainer}>
      <View style={styles.todoContainer}>
        <TodoTitle />
        <TodoInput onAddTodo={store.addTodo} />
        <TodoList
          items={store.todos}
          onDeleteItem={store.deleteTodo}
          onToggleItem={store.toggleTodo}
        />
      </View>
    </View>
  );
}
