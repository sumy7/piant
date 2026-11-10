import {
  attachDOMElement,
  createEffect,
  createState,
  For,
  Input,
  onCleanup,
  onMount,
  type PInput,
  type PNode,
  ScrollView,
  Show,
  Text,
  useMountSurface,
  View,
} from '@piant/core';
import { TodoAction } from './TodoAction';
import { adoptTodoDOM, createTodoGroup, TodoSemantics } from './TodoSemantics';
import type { Todo, TodoFilter } from './todoStore';

interface TodoItemProps {
  item: Todo;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, text: string) => boolean;
  ref: (node: PNode) => void;
}

function Editor(props: {
  item: Todo;
  onSave: (text: string) => boolean;
  onCancel: () => void;
}) {
  const [draft, setDraft] = createState(props.item.text);
  const [invalid, setInvalid] = createState(false);
  const surface = useMountSurface();
  let input: PInput;
  onMount(() => {
    surface?.app.render();
    input.focus();
    input.element.select();
  });
  function save() {
    if (!props.onSave(draft())) {
      setInvalid(true);
      input.focus();
    }
  }
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
      <Input
        ref={(node) => {
          input = node;
          adoptTodoDOM(node.domElement.hostElement);
        }}
        aria-label="Edit task"
        aria-invalid={invalid()}
        value={draft()}
        onInput={(value) => {
          setDraft(value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            props.onCancel();
          }
        }}
        style={{
          height: 42,
          padding: 9,
          fontSize: 16,
          borderWidth: 1,
          borderColor: invalid() ? '#b42335' : '#2563eb',
          borderRadius: 7,
          backgroundColor: '#ffffff',
        }}
      />
      <Show when={invalid()}>
        {(_visible) => (
          <Text style={{ fontSize: 12, color: '#b42335' }}>
            Give your task a name.
          </Text>
        )}
      </Show>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TodoAction
          label="Save task"
          text="Save"
          variant="primary"
          onPress={save}
        />
        <TodoAction
          label="Cancel editing"
          text="Cancel"
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}

function TodoItem(props: TodoItemProps) {
  const [editing, setEditing] = createState(false);
  const mounted = useMountSurface();
  function cancel() {
    setEditing(false);
    queueMicrotask(() => {
      if (mounted?.app.stage.destroyed) return;
      mounted?.app.render();
      const surface = document.getElementById(`todo-edit-${props.item.id}`);
      surface?.focus();
    });
  }
  function display() {
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TodoAction
            id={`todo-toggle-${props.item.id}`}
            label={props.item.text}
            text={props.item.completed ? '✓' : ''}
            checked={props.item.completed}
            selected={props.item.completed}
            onPress={() => props.onToggle(props.item.id, !props.item.completed)}
            style={{
              width: 32,
              minHeight: 32,
              paddingLeft: 0,
              paddingRight: 0,
            }}
          />
          <Text
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              lineHeight: 24,
              color: props.item.completed ? '#7c899b' : '#172033',
              textDecoration: props.item.completed ? 'line-through' : 'none',
            }}
          >
            {props.item.text}
          </Text>
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}
        >
          <TodoAction
            id={`todo-edit-${props.item.id}`}
            label={`Edit ${props.item.text}`}
            text="Edit"
            onPress={() => setEditing(true)}
            style={{ minHeight: 32 }}
          />
          <TodoAction
            label={`Delete ${props.item.text}`}
            text="Delete"
            variant="danger"
            onPress={() => props.onDelete(props.item.id)}
            style={{ minHeight: 32 }}
          />
        </View>
      </View>
    );
  }
  return (
    <View
      ref={props.ref}
      style={{
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: '#e7ecf2',
        borderRadius: 10,
        backgroundColor: props.item.completed ? '#f8fafc' : '#ffffff',
        flexShrink: 0,
      }}
    >
      <Show when={!editing()}>{(_visible) => display()}</Show>
      <Show when={editing()}>
        {(_visible) =>
          Editor({
            item: props.item,
            onSave: (text) => props.onRename(props.item.id, text),
            onCancel: cancel,
          })
        }
      </Show>
    </View>
  );
}

interface TodoListProps {
  items: Todo[];
  filter: TodoFilter;
  onToggleItem: (id: string, completed: boolean) => void;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, text: string) => boolean;
}

export default function TodoList(props: TodoListProps) {
  const rows = new Map<string, PNode>();
  const semantics = createTodoGroup();
  const groups = new Map<string, HTMLElement>();
  let regionHost: HTMLElement | undefined;
  let ordering = false;
  let disposed = false;
  function orderGroups() {
    if (ordering || disposed) return;
    ordering = true;
    queueMicrotask(() => {
      ordering = false;
      if (disposed) return;
      const active = document.activeElement;
      const ordered = [
        ...(regionHost ? [regionHost] : []),
        ...props.items.flatMap((item) => {
          const group = groups.get(item.id);
          return group ? [group] : [];
        }),
      ];
      for (let index = 0; index < ordered.length; index++) {
        if (semantics.children[index] !== ordered[index])
          semantics.insertBefore(
            ordered[index],
            semantics.children[index] ?? null,
          );
      }
      if (
        active instanceof HTMLElement &&
        active.isConnected &&
        document.activeElement !== active
      )
        active.focus({ preventScroll: true });
    });
  }
  createEffect(() => {
    props.items.map((item) => item.id);
    orderGroups();
  });
  onCleanup(() => {
    disposed = true;
    groups.clear();
  });
  const emptyTitle = () =>
    props.filter === 'completed'
      ? 'No completed tasks yet'
      : props.filter === 'active'
        ? 'You’re all caught up'
        : 'A fresh start';
  const emptyHint = () =>
    props.filter === 'completed'
      ? 'Completed tasks will appear here.'
      : props.filter === 'active'
        ? 'Take a breath, or add your next task above.'
        : 'Add your first task above to get going.';
  return TodoSemantics({
    group: semantics,
    children: () => (
      <View style={{ flex: 1, minHeight: 100 }}>
        <Show when={props.items.length === 0}>
          {(_visible) => (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                padding: 16,
              }}
            >
              <Text style={{ color: '#2563eb', fontSize: 32, lineHeight: 42 }}>
                ✓
              </Text>
              <Text
                style={{
                  color: '#172033',
                  fontSize: 21,
                  lineHeight: 28,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {emptyTitle}
              </Text>
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 14,
                  lineHeight: 21,
                  textAlign: 'center',
                }}
              >
                {emptyHint}
              </Text>
            </View>
          )}
        </Show>
        <Show when={props.items.length > 0}>
          {(_visible) => (
            <ScrollView
              ref={(scroll) => {
                const region = document.createElement('div');
                region.setAttribute('role', 'region');
                region.setAttribute(
                  'aria-label',
                  'Task list. Use arrow keys or Home and End to scroll.',
                );
                region.tabIndex = 0;
                region.style.cssText = 'opacity:0;pointer-events:none';
                const host = attachDOMElement(scroll, region).hostElement;
                regionHost = host;
                semantics.prepend(host);
                orderGroups();
                region.onkeydown = (event) => {
                  const items = props.items;
                  const id =
                    event.key === 'Home'
                      ? items[0]?.id
                      : items[items.length - 1]?.id;
                  if (event.key === 'Home' || event.key === 'End') {
                    const node = rows.get(id);
                    if (node)
                      scroll.scrollIntoView(node, {
                        block: event.key === 'Home' ? 'start' : 'end',
                      });
                  } else if (
                    event.key === 'ArrowDown' ||
                    event.key === 'PageDown'
                  )
                    scroll.scrollY -= event.key === 'ArrowDown' ? 60 : 240;
                  else if (event.key === 'ArrowUp' || event.key === 'PageUp')
                    scroll.scrollY += event.key === 'ArrowUp' ? 60 : 240;
                  else return;
                  event.preventDefault();
                };
                onCleanup(() => {
                  region.onkeydown = null;
                  if (regionHost === host) regionHost = undefined;
                });
              }}
              style={{ width: '100%', height: '100%' }}
            >
              <View style={{ gap: 10, paddingRight: 4 }}>
                <For each={props.items}>
                  {(item) => {
                    const group = createTodoGroup(semantics);
                    groups.set(item.id, group);
                    orderGroups();
                    onCleanup(() => {
                      if (groups.get(item.id) === group) groups.delete(item.id);
                      orderGroups();
                    });
                    return TodoSemantics({
                      group,
                      children: () => (
                        <TodoItem
                          item={item}
                          ref={(node) => {
                            rows.set(item.id, node);
                            node.onDestroy(() => {
                              if (rows.get(item.id) === node)
                                rows.delete(item.id);
                            });
                          }}
                          onToggle={props.onToggleItem}
                          onDelete={props.onDeleteItem}
                          onRename={props.onRenameItem}
                        />
                      ),
                    });
                  }}
                </For>
              </View>
            </ScrollView>
          )}
        </Show>
      </View>
    ),
  });
}
