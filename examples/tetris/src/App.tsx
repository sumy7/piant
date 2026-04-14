import { Show, StyleSheet, Text, View } from '@piant/core';
import { useKey, useKeyPress, useKeystroke } from '@piant/hooks';
import BoardView from './BoardView';
import NextPieceView from './NextPieceView';
import ScorePanel from './ScorePanel';
import { useGameState } from './gameState';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 16,
  },
  gameArea: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  sidebar: {
    gap: 24,
    width: 120,
  },
  sideLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000099',
  },
  overlayTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  overlayHint: {
    fontSize: 16,
    color: '#94a3b8',
  },
  pausedTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 16,
  },
  controlsHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
  },
  startButton: {
    marginTop: 20,
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export function App() {
  const game = useGameState();

  // ── useKey: ArrowLeft / ArrowRight / ArrowDown ───────────────────────────
  useKey('ArrowLeft', () => game.moveLeft());
  useKey('ArrowRight', () => game.moveRight());
  useKey('ArrowDown', () => game.moveDown());

  // ── useKey: Hard drop (Space) and rotate (ArrowUp / z / x) ──────────────
  useKey('ArrowUp', () => game.rotate());
  useKey('z', () => game.rotate());
  useKey(' ', () => game.hardDrop());

  // ── useKeyPress: track whether Shift is held (used for faster drop) ──────
  const [shiftHeld] = useKeyPress('Shift');

  // ── useKeystroke: pause/unpause with "p" key ─────────────────────────────
  useKeystroke('p', {
    onPressed: () => game.togglePause(),
  });

  // ── useKeystroke: restart shortcut Ctrl+r ────────────────────────────────
  useKeystroke('control + r', {
    onPressed: () => {
      const s = game.state();
      if (s.status === 'over' || s.status === 'idle') game.startGame();
    },
  });

  // When Shift is held, extra key presses trigger faster drops
  useKey('ArrowDown', () => {
    if (shiftHeld()) game.moveDown();
  });

  const s = () => game.state();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>TETRIS</Text>

      <View style={styles.gameArea}>
        {/* ── Board ── */}
        <View>
          <BoardView
            board={s().board}
            current={s().current}
            ghost={s().ghost}
          />
        </View>

        {/* ── Sidebar ── */}
        <View style={styles.sidebar}>
          <ScorePanel
            score={s().score}
            lines={s().lines}
            level={s().level}
          />

          <View>
            <Text style={styles.sideLabel}>NEXT</Text>
            <NextPieceView piece={s().next} />
          </View>

          <View style={styles.controlsHint}>
            <Text style={styles.controlsHint}>← → Move</Text>
            <Text style={styles.controlsHint}>↑ / Z  Rotate</Text>
            <Text style={styles.controlsHint}>↓  Soft drop</Text>
            <Text style={styles.controlsHint}>Space  Hard drop</Text>
            <Text style={styles.controlsHint}>P  Pause</Text>
            <Text style={styles.controlsHint}>Ctrl+R  Restart</Text>
          </View>
        </View>
      </View>

      {/* ── Overlays ── */}
      <Show when={s().status === 'idle'}>
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>TETRIS</Text>
          <Text style={styles.overlayHint}>Press Space or click to start</Text>
          <View style={styles.startButton} onClick={() => game.startGame()}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </View>
        </View>
      </Show>

      <Show when={s().status === 'paused'}>
        <View style={styles.overlay}>
          <Text style={styles.pausedTitle}>PAUSED</Text>
          <Text style={styles.overlayHint}>Press P to resume</Text>
        </View>
      </Show>

      <Show when={s().status === 'over'}>
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>GAME OVER</Text>
          <Text style={styles.overlayHint}>Score: {String(s().score)}</Text>
          <View style={styles.startButton} onClick={() => game.startGame()}>
            <Text style={styles.startButtonText}>Play Again</Text>
          </View>
        </View>
      </Show>
    </View>
  );
}
