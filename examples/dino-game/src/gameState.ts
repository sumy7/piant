import { createState, onTick } from '@piant/core';
import {
  createInitialState,
  type GameState,
  jumpDino,
  stepGame,
} from './gameLogic';

export function useGameState() {
  const [state, setState] = createState<GameState>(createInitialState());

  function startGame() {
    const s = createInitialState();
    // preserve high score
    setState({ ...s, highScore: state().highScore, status: 'playing' });
  }

  function jump() {
    const s = state();
    if (s.status === 'idle' || s.status === 'over') {
      startGame();
      return;
    }
    setState(jumpDino(s));
  }

  onTick((ticker) => {
    const s = state();
    if (s.status !== 'playing') return;
    setState(stepGame(s, ticker.deltaMS));
  });

  return { state, startGame, jump };
}

export type { GameState };
