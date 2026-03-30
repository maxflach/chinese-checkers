import type { GameDoc } from '@/hooks/useGame';

interface GameOverModalProps {
  game: GameDoc;
  currentUid: string;
  onClose: () => void;
}

const COLOR_CSS: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
  purple: '#8E24AA',
  orange: '#FB8C00',
};

export function GameOverModal({ game, currentUid, onClose }: GameOverModalProps) {
  const isWinner = game.winner === currentUid;
  const winnerPlayer = game.winner ? game.players[game.winner] : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
      <div className="bg-amber-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="text-4xl mb-4">{isWinner ? '\u{1F3C6}' : '\u{1F614}'}</div>
        <h2 className="text-2xl font-bold text-amber-100 mb-2">
          {isWinner ? 'You won!' : 'Game Over'}
        </h2>
        {winnerPlayer && !isWinner && (
          <p className="text-amber-300 mb-4">
            <span
              className="font-semibold"
              style={{ color: COLOR_CSS[winnerPlayer.color] }}
            >
              {winnerPlayer.displayName}
            </span>{' '}
            wins!
          </p>
        )}
        <p className="text-amber-400 text-sm mb-6">
          Game finished in {game.turnNumber} turns
        </p>
        <button
          onClick={onClose}
          className="bg-amber-700 text-amber-100 px-6 py-3 rounded-xl font-medium hover:bg-amber-600 active:scale-95 transition-all w-full"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
