import { For, StyleSheet, View } from '@piant/core';
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE } from './gameLogic';
import type { Board, Piece } from './gameLogic';

interface BoardProps {
  board: Board;
  current: Piece | null;
  ghost: Piece | null;
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'column',
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filledCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
});

// Merge board + current piece + ghost into a display grid
function buildDisplayGrid(
  board: Board,
  current: Piece | null,
  ghost: Piece | null,
): { color: string | null; isGhost: boolean }[][] {
  const grid: { color: string | null; isGhost: boolean }[][] = board.map((row) =>
    row.map((color) => ({ color, isGhost: false })),
  );

  // Draw ghost
  if (ghost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const ny = ghost.y + r;
        const nx = ghost.x + c;
        if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
          if (!grid[ny][nx].color) {
            grid[ny][nx] = { color: ghost.color, isGhost: true };
          }
        }
      }
    }
  }

  // Draw current piece
  if (current) {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        const ny = current.y + r;
        const nx = current.x + c;
        if (ny >= 0 && ny < BOARD_ROWS && nx >= 0 && nx < BOARD_COLS) {
          grid[ny][nx] = { color: current.color, isGhost: false };
        }
      }
    }
  }

  return grid;
}

const BoardView = (props: BoardProps) => {
  const grid = () => buildDisplayGrid(props.board, props.current, props.ghost);

  return (
    <View style={styles.board}>
      <For each={grid()}>
        {(row) => (
          <View style={styles.row}>
            <For each={row}>
              {(cell) => {
                if (cell.color) {
                  return (
                    <View
                      style={{
                        ...styles.filledCell,
                        backgroundColor: cell.isGhost
                          ? cell.color + '55'
                          : cell.color,
                      }}
                    />
                  );
                }
                return <View style={styles.cell} />;
              }}
            </For>
          </View>
        )}
      </For>
    </View>
  );
};

export default BoardView;
