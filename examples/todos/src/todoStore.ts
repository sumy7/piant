import { createStore } from '@piant/store';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  _nextId: number;
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string, completed: boolean) => void;
}

export const useTodoStore = createStore<TodoState>((set) => ({
  todos: [
    { id: '1', text: 'Learn Piant', completed: true },
    { id: '2', text: 'Build a Todo App', completed: false },
    { id: '3', text: 'Review Piant Code', completed: false },
  ],
  _nextId: 4,
  addTodo: (text) =>
    set((s) => ({
      _nextId: s._nextId + 1,
      todos: [
        ...s.todos,
        { id: String(s._nextId), text, completed: false },
      ],
    })),
  deleteTodo: (id) =>
    set((s) => ({ todos: s.todos.filter((todo) => todo.id !== id) })),
  toggleTodo: (id, completed) =>
    set((s) => ({
      todos: s.todos.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo,
      ),
    })),
}));
