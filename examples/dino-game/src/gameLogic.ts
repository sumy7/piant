// Dino game constants and pure game-logic helpers

export let GAME_WIDTH = 800;
export let GAME_HEIGHT = 300;

export let GROUND_Y = 240; // y position of the ground line

/** Call once (before render) with the actual screen size. */
export function setGameDimensions(width: number, height: number): void {
  GAME_WIDTH = width;
  GAME_HEIGHT = height;
  GROUND_Y = Math.round(height * 0.78); // ground sits at ~78% of screen height
}
export const DINO_X = 80; // fixed horizontal position of dino
export const DINO_W = 44;
export const DINO_H = 48;

export const GRAVITY = 2000; // px/s²
export const JUMP_VELOCITY = -700; // px/s (upward)

export const INITIAL_SPEED = 400; // px/s
export const SPEED_INCREMENT = 20; // px/s per second of play
export const MAX_SPEED = 1200;

export const OBSTACLE_MIN_GAP = 300; // min horizontal gap between obstacles
export const OBSTACLE_MAX_GAP = 600;

export const CLOUD_SPEED_FACTOR = 0.3; // clouds move slower than ground

// Score: 1 point per ~100ms
export const SCORE_INTERVAL_MS = 100;

// ── Types ────────────────────────────────────────────────────────────────────

export type GameStatus = 'idle' | 'playing' | 'over';

export interface Dino {
  y: number; // top y (ground when not jumping)
  vy: number; // vertical velocity px/s
  onGround: boolean;
  frame: number; // animation frame index (0 | 1)
  frameTimer: number; // ms since last frame toggle
}

export type ObstacleKind = 'cactus-s' | 'cactus-l' | 'cactus-group';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  w: number;
  h: number;
}

export interface Cloud {
  id: number;
  x: number;
  y: number;
}

export interface GameState {
  status: GameStatus;
  dino: Dino;
  obstacles: Obstacle[];
  clouds: Cloud[];
  speed: number; // current horizontal scroll speed (px/s)
  score: number;
  highScore: number;
  scoreTimer: number; // ms accumulator for score ticks
  obstacleTimer: number; // ms until next obstacle spawns
  nextObstacleGap: number;
}

// ── Obstacle sizes ────────────────────────────────────────────────────────────

const OBSTACLE_SIZES: Record<ObstacleKind, { w: number; h: number }> = {
  'cactus-s': { w: 17, h: 35 },
  'cactus-l': { w: 25, h: 50 },
  'cactus-group': { w: 50, h: 50 },
};

let _idSeq = 0;
function nextId() {
  return ++_idSeq;
}

// ── Factory helpers ───────────────────────────────────────────────────────────

export function createDino(): Dino {
  return {
    y: GROUND_Y - DINO_H,
    vy: 0,
    onGround: true,
    frame: 0,
    frameTimer: 0,
  };
}

function randomObstacleKind(): ObstacleKind {
  const kinds: ObstacleKind[] = ['cactus-s', 'cactus-l', 'cactus-group'];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

function randomGap(): number {
  return OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
}

export function spawnObstacle(): Obstacle {
  const kind = randomObstacleKind();
  const { w, h } = OBSTACLE_SIZES[kind];
  return { id: nextId(), kind, x: GAME_WIDTH + 10, w, h };
}

export function spawnCloud(): Cloud {
  return {
    id: nextId(),
    x: GAME_WIDTH + 10,
    y: 30 + Math.random() * 80,
  };
}

export function createInitialState(): GameState {
  return {
    status: 'idle',
    dino: createDino(),
    obstacles: [],
    clouds: [
      { id: nextId(), x: 200, y: 50 },
      { id: nextId(), x: 500, y: 80 },
    ],
    speed: INITIAL_SPEED,
    score: 0,
    highScore: 0,
    scoreTimer: 0,
    obstacleTimer: 1500,
    nextObstacleGap: randomGap(),
  };
}

// ── AABB collision ────────────────────────────────────────────────────────────

export function checkCollision(dino: Dino, obs: Obstacle): boolean {
  const margin = 6; // small inset for forgiving hit-box
  const dx = DINO_X + margin;
  const dw = DINO_W - margin * 2;
  const dy = dino.y + margin;
  const dh = DINO_H - margin;

  const ox = obs.x;
  const oy = GROUND_Y - obs.h;
  const ow = obs.w;
  const oh = obs.h;

  return dx < ox + ow && dx + dw > ox && dy < oy + oh && dy + dh > oy;
}

// ── Step function (pure) ──────────────────────────────────────────────────────

export function stepGame(state: GameState, deltaMS: number): GameState {
  if (state.status !== 'playing') return state;

  const dt = deltaMS / 1000; // convert to seconds

  // ── Speed ramp ────────────────────────────────────────────────────────────
  const speed = Math.min(state.speed + SPEED_INCREMENT * dt, MAX_SPEED);

  // ── Dino physics ──────────────────────────────────────────────────────────
  let { y, vy, onGround, frame, frameTimer } = state.dino;

  vy += GRAVITY * dt;
  y += vy * dt;

  const groundY = GROUND_Y - DINO_H;
  if (y >= groundY) {
    y = groundY;
    vy = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  // Leg animation (only on ground)
  const FRAME_INTERVAL = 120; // ms
  frameTimer += deltaMS;
  if (onGround && frameTimer >= FRAME_INTERVAL) {
    frame = frame === 0 ? 1 : 0;
    frameTimer -= FRAME_INTERVAL;
  }
  if (!onGround) {
    frame = 0;
    frameTimer = 0;
  }

  const dino: Dino = { y, vy, onGround, frame, frameTimer };

  // ── Obstacles ─────────────────────────────────────────────────────────────
  let { obstacleTimer } = state;
  obstacleTimer -= deltaMS;

  let obstacles = state.obstacles
    .map((o) => ({ ...o, x: o.x - speed * dt }))
    .filter((o) => o.x + o.w > -20);

  let nextObstacleGap = state.nextObstacleGap;
  if (obstacleTimer <= 0) {
    obstacles = [...obstacles, spawnObstacle()];
    obstacleTimer = (nextObstacleGap / speed) * 1000;
    nextObstacleGap = randomGap();
  }

  // ── Clouds ────────────────────────────────────────────────────────────────
  const cloudSpeed = speed * CLOUD_SPEED_FACTOR;
  let clouds = state.clouds
    .map((c) => ({ ...c, x: c.x - cloudSpeed * dt }))
    .filter((c) => c.x + 80 > 0);

  if (clouds.length < 3 && Math.random() < 0.01) {
    clouds = [...clouds, spawnCloud()];
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  let { score, scoreTimer } = state;
  scoreTimer += deltaMS;
  if (scoreTimer >= SCORE_INTERVAL_MS) {
    score += 1;
    scoreTimer -= SCORE_INTERVAL_MS;
  }

  // ── Collision ─────────────────────────────────────────────────────────────
  const hit = obstacles.some((o) => checkCollision(dino, o));
  if (hit) {
    return {
      ...state,
      dino,
      obstacles,
      clouds,
      speed,
      score,
      highScore: Math.max(state.highScore, score),
      scoreTimer,
      obstacleTimer,
      nextObstacleGap,
      status: 'over',
    };
  }

  return {
    ...state,
    dino,
    obstacles,
    clouds,
    speed,
    score,
    highScore: Math.max(state.highScore, score),
    scoreTimer,
    obstacleTimer,
    nextObstacleGap,
  };
}

export function jumpDino(state: GameState): GameState {
  if (!state.dino.onGround) return state;
  return {
    ...state,
    dino: { ...state.dino, vy: JUMP_VELOCITY, onGround: false },
  };
}
