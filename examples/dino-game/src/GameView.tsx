import { For, Show, StyleSheet, Text, View } from '@piant/core';
import type { Cloud, Dino, GameState, Obstacle } from './gameLogic';
import {
  DINO_H,
  DINO_W,
  DINO_X,
  GROUND_Y,
} from './gameLogic';

// ── Colours ───────────────────────────────────────────────────────────────────
const BG = '#f7f7f7';
const DINO_COLOR = '#535353';
const CACTUS_COLOR = '#2d6b2d';
const CLOUD_COLOR = '#e8e8e8';
const GROUND_COLOR = '#535353';
const SCORE_COLOR = '#535353';

// ── DinoView ──────────────────────────────────────────────────────────────────

interface DinoProps {
  dino: Dino;
}

// Do NOT destructure props — preserves SolidJS-style reactive getters.
function DinoView(props: DinoProps) {
  const c = DINO_COLOR;
  const f = () => props.dino.frame;

  return (
    <View
      style={{
        position: 'absolute',
        left: DINO_X,
        top: props.dino.y,
        width: DINO_W,
        height: DINO_H,
      }}
    >
      {/* Head */}
      <View
        style={{ position: 'absolute', left: 20, top: 0, width: 22, height: 18, backgroundColor: c }}
      />
      {/* Eye (cutout via bg color) */}
      <View
        style={{ position: 'absolute', left: 32, top: 4, width: 5, height: 5, backgroundColor: BG }}
      />
      {/* Body */}
      <View
        style={{ position: 'absolute', left: 6, top: 12, width: 32, height: 22, backgroundColor: c }}
      />
      {/* Tail */}
      <View
        style={{ position: 'absolute', left: 0, top: 16, width: 10, height: 10, backgroundColor: c }}
      />
      {/* Arm */}
      <View
        style={{ position: 'absolute', left: 30, top: 22, width: 8, height: 4, backgroundColor: c }}
      />
      {/* Legs - frame 0 */}
      <Show when={f() === 0}>
        {/* front leg down */}
        <View
          style={{ position: 'absolute', left: 26, top: 34, width: 8, height: 14, backgroundColor: c }}
        />
        {/* back leg up */}
        <View
          style={{ position: 'absolute', left: 12, top: 37, width: 8, height: 11, backgroundColor: c }}
        />
      </Show>
      {/* Legs - frame 1 */}
      <Show when={f() === 1}>
        {/* front leg up */}
        <View
          style={{ position: 'absolute', left: 26, top: 37, width: 8, height: 11, backgroundColor: c }}
        />
        {/* back leg down */}
        <View
          style={{ position: 'absolute', left: 12, top: 34, width: 8, height: 14, backgroundColor: c }}
        />
      </Show>
    </View>
  );
}

// ── CactusView ────────────────────────────────────────────────────────────────

interface CactusProps {
  obs: Obstacle;
}

function CactusView(props: CactusProps) {
  const { kind, x, w, h } = props.obs;
  const top = GROUND_Y - h;

  if (kind === 'cactus-s') {
    // stem (w=7, centered) + left arm + right arm
    return (
      <View
        style={{ position: 'absolute', left: x, top, width: w, height: h }}
      >
        {/* stem */}
        <View style={{ position: 'absolute', left: 5, top: 0, width: 7, height: h, backgroundColor: CACTUS_COLOR }} />
        {/* left arm */}
        <View style={{ position: 'absolute', left: 0, top: 10, width: 5, height: 14, backgroundColor: CACTUS_COLOR }} />
        {/* left arm top */}
        <View style={{ position: 'absolute', left: 0, top: 10, width: 8, height: 5, backgroundColor: CACTUS_COLOR }} />
        {/* right arm */}
        <View style={{ position: 'absolute', left: 12, top: 8, width: 5, height: 16, backgroundColor: CACTUS_COLOR }} />
        {/* right arm top */}
        <View style={{ position: 'absolute', left: 9, top: 8, width: 8, height: 5, backgroundColor: CACTUS_COLOR }} />
      </View>
    );
  }

  if (kind === 'cactus-l') {
    return (
      <View
        style={{ position: 'absolute', left: x, top, width: w, height: h }}
      >
        {/* stem */}
        <View style={{ position: 'absolute', left: 8, top: 0, width: 9, height: h, backgroundColor: CACTUS_COLOR }} />
        {/* left arm */}
        <View style={{ position: 'absolute', left: 0, top: 14, width: 8, height: 20, backgroundColor: CACTUS_COLOR }} />
        <View style={{ position: 'absolute', left: 0, top: 14, width: 12, height: 7, backgroundColor: CACTUS_COLOR }} />
        {/* right arm */}
        <View style={{ position: 'absolute', left: 17, top: 10, width: 8, height: 24, backgroundColor: CACTUS_COLOR }} />
        <View style={{ position: 'absolute', left: 13, top: 10, width: 12, height: 7, backgroundColor: CACTUS_COLOR }} />
      </View>
    );
  }

  // cactus-group: two side-by-side small cacti
  const sw = 20;
  return (
    <View
      style={{ position: 'absolute', left: x, top, width: w, height: h }}
    >
      {/* left cactus stem */}
      <View style={{ position: 'absolute', left: 3, top: 8, width: 7, height: h - 8, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: 0, top: 18, width: 3, height: 12, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: 0, top: 18, width: 8, height: 5, backgroundColor: CACTUS_COLOR }} />
      {/* right cactus stem */}
      <View style={{ position: 'absolute', left: sw + 3, top: 0, width: 7, height: h, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: sw, top: 12, width: 3, height: 16, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: sw, top: 12, width: 9, height: 5, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: sw + 10, top: 8, width: 4, height: 20, backgroundColor: CACTUS_COLOR }} />
      <View style={{ position: 'absolute', left: sw + 7, top: 8, width: 7, height: 5, backgroundColor: CACTUS_COLOR }} />
    </View>
  );
}

// ── CloudView ─────────────────────────────────────────────────────────────────

interface CloudProps {
  cloud: Cloud;
}

function CloudView(props: CloudProps) {
  return (
    <View
      style={{
        position: 'absolute',
        left: props.cloud.x,
        top: props.cloud.y,
        width: 72,
        height: 22,
        backgroundColor: CLOUD_COLOR,
        borderRadius: 11,
      }}
    />
  );
}

// ── GameView ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    backgroundColor: BG,
  },
  // canvas fills the root (full screen)
  canvas: {
    width: '100%',
    height: '100%',
    backgroundColor: BG,
  },
  scoreLabel: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: SCORE_COLOR,
  },
  hiLabel: {
    position: 'absolute',
    top: 16,
    right: 120,
    fontSize: 18,
    color: '#9e9e9e',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: SCORE_COLOR,
    marginBottom: 12,
  },
  overlayHint: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  gameOverLine: {
    width: 200,
    height: 2,
    backgroundColor: '#9e9e9e',
    marginBottom: 16,
    marginTop: 16,
  },
});

interface GameViewProps {
  state: GameState;
  onJump: () => void;
}

// Do NOT destructure props — preserves SolidJS-style reactive getters.
export function GameView(props: GameViewProps) {
  const s = () => props.state;

  const scoreStr = () => String(s().score).padStart(5, '0');
  const hiStr = () => `HI ${String(s().highScore).padStart(5, '0')}`;

  // Ground style must be computed at render time so it picks up the live GROUND_Y
  // value that was set via setGameDimensions() before render.
  const groundStyle = () => ({
    position: 'absolute' as const,
    left: 0,
    top: GROUND_Y,
    width: '100%' as const,
    height: 2,
    backgroundColor: GROUND_COLOR,
  });

  return (
    <View style={styles.root} onClick={() => props.onJump()}>
      <View style={styles.canvas}>
        {/* Ground */}
        <View style={groundStyle()} />

        {/* Clouds */}
        <For each={s().clouds}>
          {(cloud) => <CloudView cloud={cloud} />}
        </For>

        {/* Obstacles */}
        <For each={s().obstacles}>
          {(obs) => <CactusView obs={obs} />}
        </For>

        {/* Dino */}
        <DinoView dino={s().dino} />

        {/* Score */}
        <Text style={styles.hiLabel}>{hiStr()}</Text>
        <Text style={styles.scoreLabel}>{scoreStr()}</Text>

        {/* Idle overlay */}
        <Show when={s().status === 'idle'}>
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>DINO GAME</Text>
            <View style={styles.gameOverLine} />
            <Text style={styles.overlayHint}>Press Space / ↑ / W or tap to start</Text>
          </View>
        </Show>

        {/* Game over overlay */}
        <Show when={s().status === 'over'}>
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>GAME OVER</Text>
            <View style={styles.gameOverLine} />
            <Text style={styles.overlayHint}>Press Space / ↑ / W or tap to restart</Text>
          </View>
        </Show>
      </View>
    </View>
  );
}
