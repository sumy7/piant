import { useKey } from '@piant/hooks';
import { GameView } from './GameView';
import { useGameState } from './gameState';

export function App() {
  const game = useGameState();

  // Jump on Space, ArrowUp, or W
  useKey(' ', () => game.jump());
  useKey('ArrowUp', () => game.jump());
  useKey('w', () => game.jump());

  return <GameView state={game.state()} onJump={() => game.jump()} />;
}
