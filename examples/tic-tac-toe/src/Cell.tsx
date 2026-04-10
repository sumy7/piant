import { StyleSheet, TextView, View } from '@piant/core';

export type CellValue = 'X' | 'O' | null;

interface CellProps {
  value: CellValue;
  index: number;
  onClick: (index: number) => void;
}

const CELL_SIZE = 100;

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  textX: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e94560',
  },
  textO: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0f3460',
  },
  empty: {
    fontSize: 48,
    color: 'transparent',
  },
});

const Cell = (props: CellProps) => {
  const handleClick = () => {
    props.onClick(props.index);
  };

  const textViewStyles = () =>
    props.value === 'X'
      ? styles.textX
      : props.value === 'O'
        ? styles.textO
        : styles.empty;

  return (
    <View style={styles.cell} onClick={handleClick}>
      <TextView style={textViewStyles()}>{props.value ?? ' '}</TextView>
    </View>
  );
};

export default Cell;
