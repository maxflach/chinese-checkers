import type { GameDoc } from '@/hooks/useGame';

interface GameHeaderProps {
  game: GameDoc;
  currentUid: string;
}

const COLOR_CSS: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
  purple: '#8E24AA',
  orange: '#FB8C00',
};

export function GameHeader({ game, currentUid }: GameHeaderProps) {
  const isMyTurn = game.currentTurn === currentUid;
  const currentPlayer = game.players[game.currentTurn];

  return (
    <div className="px-4 py-3 flex items-center justify-between bg-amber-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {game.playerOrder.map((uid) => {
          const player = game.players[uid];
          if (!player) return null;
          const isActive = uid === game.currentTurn;
          return (
            <div
              key={uid}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${
                isActive ? 'ring-2 ring-amber-300 scale-110' : 'opacity-60'
              }`}
              style={{ backgroundColor: COLOR_CSS[player.color] || '#999' }}
              title={player.displayName}
            >
              {player.displayName.charAt(0).toUpperCase()}
            </div>
          );
        })}
      </div>

      <div className="text-right">
        {game.status === 'active' && (
          <p
            className={`text-sm font-medium ${isMyTurn ? 'text-amber-200' : 'text-amber-400'}`}
          >
            {isMyTurn ? 'Your turn!' : `${currentPlayer?.displayName}'s turn`}
          </p>
        )}
        {game.status === 'finished' && (
          <p className="text-sm font-medium text-amber-200">Game over</p>
        )}
        <p className="text-xs text-amber-500">Turn {game.turnNumber}</p>
      </div>
    </div>
  );
}
