// Tetris game constants and types

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const CELL_SIZE = 30;
export const LOCK_DELAY_MS = 500;

export type CellColor = string | null;
export type Board = CellColor[][];

export interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

// Tetromino shapes
export const TETROMINOES: { shape: number[][]; color: string }[] = [
  // I
  { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  // O
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#f0f000',
  },
  // T
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: '#a000f0',
  },
  // S
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: '#00f000',
  },
  // Z
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: '#f00000',
  },
  // J
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: '#0000f0',
  },
  // L
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: '#f0a000',
  },
];

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

export function randomTetromino(): Piece {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return {
    shape: t.shape,
    color: t.color,
    x: Math.floor(BOARD_COLS / 2) - Math.floor(t.shape[0].length / 2),
    y: 0,
  };
}

export function rotatePiece(piece: Piece): Piece {
  const rows = piece.shape.length;
  const cols = piece.shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = piece.shape[r][c];
    }
  }
  return { ...piece, shape: rotated };
}

export function isValidPosition(board: Board, piece: Piece, dx = 0, dy = 0): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= BOARD_COLS || ny >= BOARD_ROWS) return false;
      if (ny < 0) continue;
      if (board[ny][nx] !== null) return false;
    }
  }
  return true;
}

export function lockPiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.y + r;
      const nx = piece.x + c;
      if (ny >= 0) next[ny][nx] = piece.color;
    }
  }
  return next;
}

export function clearLines(board: Board): { board: Board; linesCleared: number } {
  const next = board.filter((row) => row.some((cell) => cell === null));
  const linesCleared = BOARD_ROWS - next.length;
  const empty = Array.from({ length: linesCleared }, () => Array(BOARD_COLS).fill(null));
  return { board: [...empty, ...next], linesCleared };
}

export function calcScore(linesCleared: number, level: number): number {
  const base = [0, 100, 300, 500, 800];
  return (base[linesCleared] ?? 0) * (level + 1);
}

export function calcLevel(totalLines: number): number {
  return Math.floor(totalLines / 10);
}

export function calcDropInterval(level: number): number {
  return Math.max(100, 1000 - level * 90);
}

export function getGhostPiece(board: Board, piece: Piece): Piece {
  let ghost = { ...piece };
  while (isValidPosition(board, ghost, 0, 1)) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }
  return ghost;
}
