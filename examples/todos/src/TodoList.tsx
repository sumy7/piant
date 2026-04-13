import {
  For,
  Image,
  ScrollView,
  Show,
  StyleSheet,
  Text,
  View,
} from '@piant/core';
import { CheckIcon, TrashIcon, UncheckIcon } from './icons';
import type { Todo } from './todoStore';

export type { Todo };

export interface TodoItemProps {
  item: Todo;
  onCompleteChange?: (id: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
}

const TodoItem = (props: TodoItemProps) => {
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
    checkBoxButton: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      backgroundColor: '#f5f5f5',
    },
    deleteIcon: {
      width: 16,
      height: 16,
    },
    deleteButton: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
      backgroundColor: '#f5f5f5',
    },
  });

  const onToggleComplete = () => {
    props.onCompleteChange?.(props.item.id, !props.item.completed);
  };

  const onDeleteItem = () => {
    props.onDelete?.(props.item.id);
  };

  return (
    <View style={styles.container} onClick={onToggleComplete}>
      <View style={styles.checkBoxButton}>
        <Show
          when={props.item.completed}
          fallback={<Image style={styles.checkBox} src={UncheckIcon()} />}
        >
          <Image style={styles.checkBox} src={CheckIcon()} />
        </Show>
      </View>
      <View style={styles.taskId}>
        <Text>TASK-{props.item.id}</Text>
      </View>
      <View style={styles.taskText}>
        <Text>{props.item.text}</Text>
      </View>
      <View style={styles.deleteButton} onClick={onDeleteItem}>
        <Image style={styles.deleteIcon} src={TrashIcon('#0a0a0a')} />
      </View>
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
      flex: 1,
      minHeight: 0,
    },
    scrollView: {
      width: '100%',
      height: '100%',
    },
    content: {
      flexDirection: 'column',
      gap: 16,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
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
      </ScrollView>
    </View>
  );
};

export default TodoList;
