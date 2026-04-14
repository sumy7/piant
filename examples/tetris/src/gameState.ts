import { createState, onTick } from '@piant/core';
import {
  BOARD_COLS,
  BOARD_ROWS,
  calcDropInterval,
  calcLevel,
  calcScore,
  clearLines,
  createEmptyBoard,
  getGhostPiece,
  isValidPosition,
  lockPiece,
  randomTetromino,
  rotatePiece,
  type Board,
  type CellColor,
  type Piece,
} from './gameLogic';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'over';

export interface GameState {
  board: Board;
  current: Piece | null;
  next: Piece | null;
  ghost: Piece | null;
  score: number;
  lines: number;
  level: number;
  status: GameStatus;
}

function createInitialState(): GameState {
  return {
    board: createEmptyBoard(),
    current: null,
    next: null,
    ghost: null,
    score: 0,
    lines: 0,
    level: 0,
    status: 'idle',
  };
}

export function useGameState() {
  const [state, setState] = createState<GameState>(createInitialState());

  // Drop timer
  let dropAccum = 0;

  function startGame() {
    const current = randomTetromino();
    const next = randomTetromino();
    const board = createEmptyBoard();
    setState({
      board,
      current,
      next,
      ghost: getGhostPiece(board, current),
      score: 0,
      lines: 0,
      level: 0,
      status: 'playing',
    });
    dropAccum = 0;
  }

  function togglePause() {
    const s = state();
    if (s.status === 'playing') setState({ ...s, status: 'paused' });
    else if (s.status === 'paused') setState({ ...s, status: 'playing' });
  }

  function spawnNext(): GameState | null {
    const s = state();
    if (!s.next) return null;
    const next = randomTetromino();
    if (!isValidPosition(s.board, s.next)) {
      return { ...s, status: 'over' };
    }
    return {
      ...s,
      current: s.next,
      next,
      ghost: getGhostPiece(s.board, s.next),
    };
  }

  function lockAndClear(s: GameState): GameState {
    if (!s.current) return s;
    const locked = lockPiece(s.board, s.current);
    const { board, linesCleared } = clearLines(locked);
    const lines = s.lines + linesCleared;
    const level = calcLevel(lines);
    const score = s.score + calcScore(linesCleared, level);
    const next = s.next ?? randomTetromino();
    const newCurrent = next;
    if (!isValidPosition(board, newCurrent)) {
      return { ...s, board: locked, current: null, status: 'over', score, lines, level };
    }
    const nextPiece = randomTetromino();
    return {
      ...s,
      board,
      current: newCurrent,
      next: nextPiece,
      ghost: getGhostPiece(board, newCurrent),
      score,
      lines,
      level,
    };
  }

  function moveLeft() {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    if (isValidPosition(s.board, s.current, -1, 0)) {
      const current = { ...s.current, x: s.current.x - 1 };
      setState({ ...s, current, ghost: getGhostPiece(s.board, current) });
    }
  }

  function moveRight() {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    if (isValidPosition(s.board, s.current, 1, 0)) {
      const current = { ...s.current, x: s.current.x + 1 };
      setState({ ...s, current, ghost: getGhostPiece(s.board, current) });
    }
  }

  function moveDown() {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    if (isValidPosition(s.board, s.current, 0, 1)) {
      const current = { ...s.current, y: s.current.y + 1 };
      setState({ ...s, current, ghost: getGhostPiece(s.board, current) });
    } else {
      setState(lockAndClear(s));
    }
  }

  function hardDrop() {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    const ghost = getGhostPiece(s.board, s.current);
    const dropped = { ...s, current: ghost };
    setState(lockAndClear(dropped));
    dropAccum = 0;
  }

  function rotate() {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    const rotated = rotatePiece(s.current);
    // Wall kick: try offset 0, -1, +1, -2, +2
    for (const dx of [0, -1, 1, -2, 2]) {
      if (isValidPosition(s.board, rotated, dx, 0)) {
        const current = { ...rotated, x: rotated.x + dx };
        setState({ ...s, current, ghost: getGhostPiece(s.board, current) });
        return;
      }
    }
  }

  // Game loop via onTick
  onTick((ticker) => {
    const s = state();
    if (s.status !== 'playing' || !s.current) return;
    dropAccum += ticker.deltaMS;
    const interval = calcDropInterval(s.level);
    if (dropAccum >= interval) {
      dropAccum -= interval;
      moveDown();
    }
  });

  return {
    state,
    startGame,
    togglePause,
    moveLeft,
    moveRight,
    moveDown,
    hardDrop,
    rotate,
  };
}

// Helpers for rendering
export { BOARD_COLS, BOARD_ROWS, CELL_SIZE } from './gameLogic';
export type { Board, CellColor, Piece };
