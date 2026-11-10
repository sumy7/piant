import { createState, Input, type PInput, View } from '@piant/core';
import { TodoAction } from './TodoAction';
import { adoptTodoDOM } from './TodoSemantics';

interface TodoInputProps {
  onAddTodo: (text: string) => string | undefined;
  ref?: (node: PInput) => void;
}

export default function TodoInput(props: TodoInputProps) {
  const [value, setValue] = createState('');
  let input: PInput;
  function add() {
    if (!props.onAddTodo(value())) return;
    setValue('');
    input.focus();
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10, flexShrink: 0 }}>
      <Input
        ref={(node) => {
          input = node;
          adoptTodoDOM(node.domElement.hostElement);
          props.ref?.(node);
        }}
        value={value()}
        onInput={setValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
        aria-label="New task"
        placeholder="What needs to get done?"
        autoComplete="off"
        enterKeyHint="done"
        style={{
          flex: 1,
          minWidth: 0,
          height: 46,
          fontSize: 16,
          color: '#172033',
          backgroundColor: '#f6f8fb',
          borderWidth: 1,
          borderColor: '#dce3ec',
          borderRadius: 9,
          padding: 12,
        }}
      />
      <TodoAction
        label="Add task"
        variant="primary"
        disabled={!value().trim()}
        onPress={add}
        style={{ minHeight: 46 }}
      />
    </View>
  );
}
