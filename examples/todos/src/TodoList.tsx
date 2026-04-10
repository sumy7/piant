import { For, Image, Show, StyleSheet, TextView, View } from '@piant/core';
import { CheckIcon, TrashIcon, UncheckIcon } from './icons';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoItemProps {
  item: Todo;
  onCompleteChange?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
}

const TodoItem = ({ item, onCompleteChange, onDelete }: TodoItemProps) => {
  const styles = StyleSheet.create({
    container: {
      display: 'flex',
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: '#f5f5f5',
      gap: 16,
      borderRadius: 6,
    },
    taskId: {
      width: 60,
      height: 20,
    },
    taskText: {
      flex: 1,
      height: 20,
    },
    checkBox: {
      width: 16,
      height: 16,
    },
    deleteIcon: {
      width: 16,
      height: 16,
    },
  });

  const onToggleComplete = () => {
    onCompleteChange?.(item.id, !item.completed);
  };

  const onDeleteItem = () => {
    onDelete?.(item.id);
  };

  return (
    <View style={styles.container} onClick={onToggleComplete}>
      <Show
        when={item.completed}
        fallback={<Image style={styles.checkBox} src={UncheckIcon()} />}
      >
        <Image style={styles.checkBox} src={CheckIcon()} />
      </Show>
      <View style={styles.taskId}>
        <TextView>TASK-{item.id}</TextView>
      </View>
      <View style={styles.taskText}>
        <TextView>{item.text}</TextView>
      </View>
      <Image
        style={styles.deleteIcon}
        src={TrashIcon('#0a0a0a')}
        onClick={onDeleteItem}
      />
    </View>
  );
};

export interface TodoListProps {
  items: Todo[];
  onToggleItem?: (id: string, complete: boolean) => void;
  onDeleteItem?: (id: string) => void;
}

const TodoList = (props: TodoListProps) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'column',
      gap: 16,
    },
  });

  return (
    <View style={styles.container}>
      <For each={props.items}>
        {(item) => (
          <TodoItem
            item={item}
            onDelete={props.onDeleteItem}
            onCompleteChange={props.onToggleItem}
          />
        )}
      </For>
    </View>
  );
};

export default TodoList;
