import { createStore, persist, type StorageAdapter } from '@piant/store';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export type TodoFilter = 'all' | 'active' | 'completed';

export interface TodoState {
  todos: Todo[];
  _nextId: number;
  addTodo: (text: string) => string | undefined;
  renameTodo: (id: string, text: string) => boolean;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string, completed: boolean) => void;
  toggleAll: (completed: boolean) => void;
  clearCompleted: () => void;
}

function restoreTodos(raw: string): Pick<TodoState, 'todos' | '_nextId'> {
  const restored: unknown = JSON.parse(raw);
  const todos: Todo[] = [];
  const ids = new Set<string>();
  if (!restored || typeof restored !== 'object') return { todos, _nextId: 1 };
  const data = restored as Record<string, unknown>;
  if (Array.isArray(data.todos)) {
    for (const item of data.todos) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        !item.id ||
        ids.has(item.id) ||
        typeof item.text !== 'string' ||
        !item.text.trim() ||
        typeof item.completed !== 'boolean'
      )
        continue;
      ids.add(item.id);
      todos.push({
        id: item.id,
        text: item.text.trim(),
        completed: item.completed,
      });
    }
  }
  const _nextId =
    typeof data._nextId === 'number' &&
    Number.isSafeInteger(data._nextId) &&
    data._nextId > 0
      ? data._nextId
      : 1;
  return { todos, _nextId };
}

export function createTodoStore(storage?: StorageAdapter) {
  return createStore<TodoState>(
    persist<TodoState>(
      (set, get) => ({
        todos: [],
        _nextId: 1,
        addTodo(text) {
          const title = text.trim();
          if (!title) return undefined;
          const current = get();
          const ids = new Set(current.todos.map((todo) => todo.id));
          let nextId = current._nextId;
          while (ids.has(String(nextId)))
            nextId = nextId < Number.MAX_SAFE_INTEGER ? nextId + 1 : 1;
          const id = String(nextId);
          set({
            todos: [...current.todos, { id, text: title, completed: false }],
            _nextId: nextId < Number.MAX_SAFE_INTEGER ? nextId + 1 : 1,
          });
          return id;
        },
        renameTodo(id, text) {
          const title = text.trim();
          const current = get();
          if (!title || !current.todos.some((todo) => todo.id === id))
            return false;
          set({
            todos: current.todos.map((todo) =>
              todo.id === id ? { ...todo, text: title } : todo,
            ),
          });
          return true;
        },
        deleteTodo: (id) =>
          set((state) => ({
            todos: state.todos.filter((todo) => todo.id !== id),
          })),
        toggleTodo: (id, completed) =>
          set((state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id && todo.completed !== completed
                ? { ...todo, completed }
                : todo,
            ),
          })),
        toggleAll: (completed) =>
          set((state) => ({
            todos: state.todos.map((todo) =>
              todo.completed === completed ? todo : { ...todo, completed },
            ),
          })),
        clearCompleted: () =>
          set((state) => ({
            todos: state.todos.filter((todo) => !todo.completed),
          })),
      }),
      {
        name: 'piant-todos',
        ...(storage ? { storage } : {}),
        partialize: (state) => ({ todos: state.todos, _nextId: state._nextId }),
        deserialize: restoreTodos,
      },
    ),
  );
}

export const useTodoStore = createTodoStore();
