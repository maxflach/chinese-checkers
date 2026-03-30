import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useMyGames } from '@/hooks/useMyGames';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { usePresence } from '@/hooks/usePresence';
import { createGameFn, joinGameFn } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { GameDoc } from '@/hooks/useGame';

export function LobbyPage() {
  const { data: user } = useAuth();
  const { data: myGames = [] } = useMyGames(user?.uid);
  const { data: invitations = [] } = useGameInvitations(user?.uid);
  const [showCreate, setShowCreate] = useState(false);

  // Clear active game presence when on lobby
  usePresence(user?.uid, null);

  return (
    <Layout>
      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Invitations */}
        {invitations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-amber-200 mb-3">Game Invitations</h2>
            <div className="space-y-2">
              {invitations.map((game) => (
                <InvitationCard key={game.id} game={game} />
              ))}
            </div>
          </section>
        )}

        {/* Active Games */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-amber-200">My Games</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-amber-700 text-amber-100 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 active:scale-95 transition-all"
            >
              + New Game
            </button>
          </div>

          {myGames.length === 0 ? (
            <p className="text-amber-400 text-sm text-center py-8">No active games. Create one!</p>
          ) : (
            <div className="space-y-2">
              {myGames.map((game) => (
                <GameCard key={game.id} game={game} currentUid={user!.uid} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showCreate && <CreateGameModal onClose={() => setShowCreate(false)} />}
    </Layout>
  );
}

function GameCard({ game, currentUid }: { game: GameDoc; currentUid: string }) {
  const navigate = useNavigate();
  const isMyTurn = game.currentTurn === currentUid;

  return (
    <button
      onClick={() => navigate(`/game/${game.id}`)}
      className="w-full bg-amber-900/60 rounded-xl p-4 text-left hover:bg-amber-900/80 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Object.values(game.players).map((p, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: COLOR_CSS[p.color] || '#999' }}
            >
              {p.displayName.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <StatusBadge status={game.status} isMyTurn={isMyTurn} />
      </div>
      <p className="text-amber-400 text-xs mt-2">
        {game.playerUids.length}/{game.playerCount} players
        {game.status === 'active' && ` \u00b7 Turn ${game.turnNumber}`}
      </p>
    </button>
  );
}

function StatusBadge({ status, isMyTurn }: { status: string; isMyTurn: boolean }) {
  if (status === 'waiting') {
    return <span className="text-xs px-2 py-1 rounded-full bg-amber-800 text-amber-300">Waiting</span>;
  }
  if (status === 'active' && isMyTurn) {
    return <span className="text-xs px-2 py-1 rounded-full bg-green-800 text-green-300 animate-pulse">Your turn</span>;
  }
  if (status === 'active') {
    return <span className="text-xs px-2 py-1 rounded-full bg-amber-800 text-amber-400">In progress</span>;
  }
  return null;
}

function InvitationCard({ game }: { game: GameDoc }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const join = useMutation({
    mutationFn: () => joinGameFn({ gameId: game.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      navigate(`/game/${game.id}`);
    },
  });

  const creator = game.players[game.createdBy];

  return (
    <div className="bg-amber-900/60 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-amber-100 font-medium">{creator?.displayName || 'Someone'} invited you</p>
        <p className="text-amber-400 text-xs">{game.playerCount}-player game</p>
      </div>
      <button
        onClick={() => join.mutate()}
        disabled={join.isPending}
        className="bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50"
      >
        {join.isPending ? 'Joining...' : 'Join'}
      </button>
    </div>
  );
}

function CreateGameModal({ onClose }: { onClose: () => void }) {
  const [playerCount, setPlayerCount] = useState(2);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => createGameFn({ playerCount }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['myGames'] });
      navigate(`/game/${result.data.gameId}`);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-4">
      <div className="bg-amber-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold text-amber-100 mb-4">New Game</h2>

        <label className="text-amber-300 text-sm mb-2 block">Number of players</label>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[2, 3, 4, 6].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              className={`py-3 rounded-xl text-lg font-bold transition-all ${
                playerCount === n
                  ? 'bg-amber-600 text-amber-100'
                  : 'bg-amber-800 text-amber-400 hover:bg-amber-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-amber-400 bg-amber-800 hover:bg-amber-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="flex-1 py-3 rounded-xl bg-amber-600 text-amber-100 font-medium hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

const COLOR_CSS: Record<string, string> = {
  red: '#E53935', blue: '#1E88E5', green: '#43A047',
  yellow: '#FDD835', purple: '#8E24AA', orange: '#FB8C00',
};
