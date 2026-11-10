import type { StorageAdapter } from '@piant/store';
import { describe, expect, it } from 'vitest';
import { createTodoStore } from '../src/todoStore';

function storage(initial?: unknown): StorageAdapter {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('piant-todos', JSON.stringify(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe('Todo application state', () => {
  it('starts empty, rejects blank submissions and trims new titles', () => {
    const state = createTodoStore(storage())();
    expect(state.todos).toEqual([]);
    expect(state.addTodo(' \n\t ')).toBeUndefined();
    expect(state._nextId).toBe(1);
    const id = state.addTodo('  Buy groceries  ');
    expect(state.todos).toEqual([
      { id, text: 'Buy groceries', completed: false },
    ]);
  });

  it('renames existing tasks without deleting them on an empty edit', () => {
    const state = createTodoStore(storage())();
    const id = state.addTodo('Draft')!;
    expect(state.renameTodo(id, '   ')).toBe(false);
    expect(state.renameTodo('missing', 'Other')).toBe(false);
    expect(state.todos[0].text).toBe('Draft');
    expect(state.renameTodo(id, '  Final draft  ')).toBe(true);
    expect(state.todos[0]).toEqual({
      id,
      text: 'Final draft',
      completed: false,
    });
  });

  it('toggles one task independently and removes only the selected task', () => {
    const state = createTodoStore(storage())();
    const first = state.addTodo('First')!;
    const second = state.addTodo('Second')!;
    state.toggleTodo(first, true);
    expect(state.todos.map((todo) => todo.completed)).toEqual([true, false]);
    state.toggleTodo(first, false);
    state.deleteTodo(second);
    expect(state.todos).toEqual([
      { id: first, text: 'First', completed: false },
    ]);
  });

  it('completes all tasks, restores all to active, and clears only completed tasks', () => {
    const state = createTodoStore(storage())();
    const first = state.addTodo('First')!;
    const second = state.addTodo('Second')!;
    state.toggleAll(true);
    expect(state.todos.every((todo) => todo.completed)).toBe(true);
    state.toggleAll(false);
    expect(state.todos.every((todo) => !todo.completed)).toBe(true);
    state.toggleTodo(first, true);
    state.clearCompleted();
    expect(state.todos).toEqual([
      { id: second, text: 'Second', completed: false },
    ]);
  });

  it('restores saved edits and completion after creating another store', () => {
    const saved = storage();
    const state = createTodoStore(saved)();
    const id = state.addTodo('Original')!;
    state.renameTodo(id, 'Saved title');
    state.toggleTodo(id, true);
    const restored = createTodoStore(saved)();
    expect(restored.todos).toEqual([
      { id, text: 'Saved title', completed: true },
    ]);
    expect(typeof restored.addTodo).toBe('function');
    const next = restored.addTodo('Next');
    expect(next).not.toBe(id);
    expect(Object.keys(JSON.parse(saved.getItem('piant-todos')!))).toEqual([
      'todos',
      '_nextId',
    ]);
  });

  it('preserves valid previous data while rejecting malformed entries and stale IDs', () => {
    const saved = storage({
      todos: [
        { id: '1', text: '  Existing  ', completed: true },
        { id: '2', text: 'Second', completed: false },
        { id: '1', text: 'Duplicate', completed: false },
        { id: '3', text: ' ', completed: false },
        { id: '4', text: 'Invalid state', completed: 'false' },
        null,
      ],
      _nextId: 1,
      addTodo: 'invalid persisted action',
    });
    const state = createTodoStore(saved)();
    expect(state.todos).toEqual([
      { id: '1', text: 'Existing', completed: true },
      { id: '2', text: 'Second', completed: false },
    ]);
    expect(state.addTodo('New')).toBe('3');
    expect(new Set(state.todos.map((todo) => todo.id)).size).toBe(3);
  });

  it('recovers from malformed JSON and unavailable persistence without blocking edits', () => {
    const corrupt = storage();
    corrupt.setItem('piant-todos', '{');
    expect(createTodoStore(corrupt)().todos).toEqual([]);
    const unavailable: StorageAdapter = {
      getItem() {
        throw new Error('storage unavailable');
      },
      setItem() {
        throw new Error('storage full');
      },
      removeItem() {},
    };
    const state = createTodoStore(unavailable)();
    expect(() => state.addTodo('Keep editing')).not.toThrow();
    expect(state.todos[0].text).toBe('Keep editing');
  });
});
