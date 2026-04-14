import { createState, Input, StyleSheet, Text, View } from '@piant/core';

interface TodoInputProps {
  onAddTodo?: (text: string) => void;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgb(245, 245, 245)',
    padding: 8,
  },
  button: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
  },
});

const TodoInput = ({ onAddTodo }: TodoInputProps) => {
  const [inputValue, setInputValue] = createState('');

  const onClick = () => {
    if (inputValue()) {
      onAddTodo?.(inputValue());
      setInputValue('');
    }
  };

  return (
    <View style={styles.container}>
      <Input
        style={styles.input}
        value={inputValue()}
        placeholder="Enter todo item..."
        onInput={(value: string) => setInputValue(value)}
      />
      <View style={styles.button} onClick={onClick}>
        <Text style={styles.buttonText}>Add</Text>
      </View>
    </View>
  );
};

export default TodoInput;
