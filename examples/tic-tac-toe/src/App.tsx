import { createState, Show, StyleSheet, TextView, View } from 'piant';
import Board from './Board';
import type { CellValue } from './Cell';

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function calculateWinner(cells: CellValue[]): CellValue {
  for (const [a, b, c] of WINNING_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  panel: {
    gap: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
  },
  statusText: {
    fontSize: 20,
    color: '#a8b2d8',
  },
  winnerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  drawText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#facc15',
  },
  resetButton: {
    marginTop: 8,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#e94560',
    borderRadius: 8,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export function App() {
  const [cells, setCells] = createState<CellValue[]>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = createState(true);

  const winner = () => calculateWinner(cells());
  const isDraw = () => !winner() && cells().every((c) => c !== null);
  const isGameOver = () => !!winner() || isDraw();

  const handleCellClick = (index: number) => {
    if (isGameOver() || cells()[index]) return;
    const next = cells().slice();
    next[index] = isXTurn() ? 'X' : 'O';
    setCells(next);
    setIsXTurn(!isXTurn());
  };

  const handleReset = () => {
    setCells(Array(9).fill(null));
    setIsXTurn(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <TextView style={styles.title}>Tic Tac Toe</TextView>

        <Show
          when={winner()}
          fallback={
            <Show
              when={isDraw()}
              fallback={
                <TextView style={styles.statusText}>
                  Player {isXTurn() ? 'X' : 'O'}'s turn
                </TextView>
              }
            >
              <TextView style={styles.drawText}>It's a draw!</TextView>
            </Show>
          }
        >
          <TextView style={styles.winnerText}>Player {winner()} wins!</TextView>
        </Show>

        <Board cells={cells()} onCellClick={handleCellClick} />

        <View style={styles.resetButton} onClick={handleReset}>
          <TextView style={styles.resetText}>Restart</TextView>
        </View>
      </View>
    </View>
  );
}
