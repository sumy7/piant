import { createState, StyleSheet, View } from '@piant/core';
import TodoInput from './TodoInput';
import TodoList, { type Todo } from './TodoList';
import TodoTitle from './TodoTitle';

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

  let id = 4;

  const [todos, setTodos] = createState<Todo[]>([
    {
      id: '1',
      text: 'Learn Piant',
      completed: true,
    },
    {
      id: '2',
      text: 'Build a Todo App',
      completed: false,
    },
    {
      id: '3',
      text: 'Review Piant Code',
      completed: false,
    },
  ]);

  const handleAddTodo = (text: string) => {
    console.log('add todo:', text);
    const newTodo: Todo = {
      id: (++id).toString(),
      text,
      completed: false,
    };
    setTodos([...todos(), newTodo]);
  };

  const handleDeleteTodo = (id: string) => {
    console.log('delete todo:', id);
    setTodos(todos().filter((todo) => todo.id !== id));
  };

  const handleToggleTodo = (id: string, completed: boolean) => {
    console.log('toggle todo:', id, completed);
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed,
            }
          : todo,
      ),
    );
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.todoContainer}>
        <TodoTitle />
        <TodoInput onAddTodo={handleAddTodo} />
        <TodoList
          items={todos()}
          onDeleteItem={handleDeleteTodo}
          onToggleItem={handleToggleTodo}
        />
      </View>
    </View>
  );
}
