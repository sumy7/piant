import { createState, StyleSheet, TextView, View } from 'piant';

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
    justifyContent: 'center',
    padding: 16,
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
  const [inputValue, setInputValue] = createState('todo item');

  const onClick = () => {
    onAddTodo?.(inputValue());
  };

  return (
    <View style={styles.container}>
      <View style={styles.input}>
        <TextView>{inputValue()}</TextView>
      </View>
      <View style={styles.button} onClick={onClick}>
        <TextView style={styles.buttonText}>Add</TextView>
      </View>
    </View>
  );
};

export default TodoInput;
