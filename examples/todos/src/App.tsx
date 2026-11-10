import {
  createEffect,
  createState,
  onCleanup,
  type PInput,
  Text,
  useMountSurface,
  View,
} from '@piant/core';
import { TodoAction } from './TodoAction';
import TodoInput from './TodoInput';
import TodoList from './TodoList';
import { createTodoGroup, TodoSemantics } from './TodoSemantics';
import TodoTitle from './TodoTitle';
import { type TodoFilter, useTodoStore } from './todoStore';

export function App() {
  const surface = useMountSurface();
  if (!surface) throw new Error('The Todo app must be rendered with mount().');
  const app = surface.app;
  const semantics = createTodoGroup(app.domContainerRoot);
  // Slots exist before any deferred JSX factories attach their native controls.
  const composer = createTodoGroup(semantics);
  const filters = createTodoGroup(semantics);
  const bulk = createTodoGroup(semantics);
  const list = createTodoGroup(semantics);
  const footer = createTodoGroup(semantics);
  const compactSize = () => app.screen.width < 440 || app.screen.height < 700;
  const [compact, setCompact] = createState(compactSize());
  const resize = () => setCompact(compactSize());
  app.renderer.on('resize', resize);
  onCleanup(() => app.renderer.off('resize', resize));
  const store = useTodoStore();
  const [filter, setFilter] = createState<TodoFilter>('all');
  let input: PInput;
  const completed = () => store.todos.filter((todo) => todo.completed).length;
  const remaining = () => store.todos.length - completed();
  const visible = () =>
    store.todos.filter(
      (todo) =>
        filter() === 'all' ||
        (filter() === 'completed' ? todo.completed : !todo.completed),
    );
  const summary = () =>
    `${remaining()} ${remaining() === 1 ? 'task' : 'tasks'} left · ${completed()} completed`;
  const allCompleted = () => store.todos.length > 0 && remaining() === 0;
  const completionState = (): boolean | 'mixed' =>
    allCompleted() ? true : completed() > 0 ? 'mixed' : false;
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.append(status);
  createEffect(() => {
    status.textContent = summary();
  });
  onCleanup(() => status.remove());
  function restoreFocus(id?: string) {
    queueMicrotask(() => {
      if (app.stage.destroyed) return;
      app.render();
      const control = id && document.getElementById(`todo-toggle-${id}`);
      if (control) {
        control.focus();
        if (document.activeElement === control) return;
      }
      input.focus();
    });
  }
  function remove(id: string) {
    const items = visible();
    const index = items.findIndex((todo) => todo.id === id);
    const next = items[index + 1] ?? items[index - 1];
    store.deleteTodo(id);
    restoreFocus(next?.id);
  }
  return TodoSemantics({
    group: semantics,
    children: () => (
      <View
        style={{
          width: '100%',
          height: '100%',
          padding: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#edf2f7',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 700,
            height: '100%',
            maxHeight: 840,
            padding: compact() ? 16 : 22,
            gap: compact() ? 12 : 18,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: '#dce3ec',
            backgroundColor: '#ffffff',
          }}
        >
          <TodoTitle compact={compact()} />
          {TodoSemantics({
            group: composer,
            children: () =>
              TodoInput({
                onAddTodo(text) {
                  const id = store.addTodo(text);
                  if (id && filter() === 'completed') setFilter('all');
                  return id;
                },
                ref(node) {
                  input = node;
                },
              }),
          })}
          {TodoSemantics({
            group: filters,
            children: () => (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                <TodoAction
                  label="All tasks"
                  text={`All (${store.todos.length})`}
                  selected={filter() === 'all'}
                  onPress={() => setFilter('all')}
                />
                <TodoAction
                  label="Active tasks"
                  text={`Active (${remaining()})`}
                  selected={filter() === 'active'}
                  onPress={() => setFilter('active')}
                />
                <TodoAction
                  label="Completed tasks"
                  text={`Done (${completed()})`}
                  selected={filter() === 'completed'}
                  onPress={() => setFilter('completed')}
                />
              </View>
            ),
          })}
          {TodoSemantics({
            group: bulk,
            children: () => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <TodoAction
                  label={
                    allCompleted()
                      ? 'Mark all tasks active'
                      : 'Mark all tasks complete'
                  }
                  text={allCompleted() ? '✓' : '—'}
                  checked={completionState()}
                  disabled={store.todos.length === 0}
                  onPress={() => store.toggleAll(!allCompleted())}
                  style={{
                    width: 32,
                    minHeight: 32,
                    paddingLeft: 0,
                    paddingRight: 0,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    lineHeight: 20,
                    color: '#64748b',
                    flex: 1,
                  }}
                >
                  {summary}
                </Text>
              </View>
            ),
          })}
          {TodoSemantics({
            group: list,
            children: () =>
              TodoList({
                get items() {
                  return visible();
                },
                get filter() {
                  return filter();
                },
                onDeleteItem: remove,
                onToggleItem(id, checked) {
                  store.toggleTodo(id, checked);
                  restoreFocus(id);
                },
                onRenameItem(id, text) {
                  const saved = store.renameTodo(id, text);
                  if (saved) restoreFocus(id);
                  return saved;
                },
              }),
          })}
          {TodoSemantics({
            group: footer,
            children: () => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{ fontSize: 12, lineHeight: 18, color: '#64748b' }}
                >
                  Stored locally when available
                </Text>
                <TodoAction
                  label="Clear completed tasks"
                  text="Clear completed"
                  disabled={completed() === 0}
                  onPress={() => {
                    store.clearCompleted();
                    input.focus();
                  }}
                />
              </View>
            ),
          })}
        </View>
      </View>
    ),
  });
}
