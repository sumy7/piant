import { For, StyleSheet, View } from '@piant/core';
import Cell, { type CellValue } from './Cell';

interface BoardProps {
  cells: CellValue[];
  onCellClick: (index: number) => void;
}

const styles = StyleSheet.create({
  board: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});

const rows = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];

const Board = (props: BoardProps) => {
  return (
    <View style={styles.board}>
      <For each={rows}>
        {(row) => (
          <View style={styles.row}>
            <For each={row}>
              {(index) => (
                <Cell
                  value={props.cells[index]}
                  index={index}
                  onClick={props.onCellClick}
                />
              )}
            </For>
          </View>
        )}
      </For>
    </View>
  );
};

export default Board;
