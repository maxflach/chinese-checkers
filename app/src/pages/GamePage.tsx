import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGame, gameToBoardState } from '@/hooks/useGame';
import { useMakeMove, useResignGame } from '@/hooks/useGameMutation';
import { GameCanvas } from '@/components/GameCanvas';
import { GameHeader } from '@/components/GameHeader';
import { GameOverModal } from '@/components/GameOverModal';
import type { MoveEvent } from '@/lib/board/types';
import type { GameDoc } from '@/hooks/useGame';
import { usePresence } from '@/hooks/usePresence';
import { useFriends, getFriendUid } from '@/hooks/useFriends';
import { useUser } from '@/hooks/useUser';
import { inviteToGameFn } from '@/lib/api';
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const COLOR_CSS: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
  purple: '#8E24AA',
  orange: '#FB8C00',
};

function getColorCss(color: string): string {
  return COLOR_CSS[color] || '#999';
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: user } = useAuth();
  const { data: game, isLoading } = useGame(gameId!);
  const makeMove = useMakeMove(gameId!);
  const navigate = useNavigate();

  // Track presence for push notification suppression
  usePresence(user?.uid, gameId ?? null);

  const handleMove = useCallback(
    (move: MoveEvent) => {
      makeMove.mutate({ from: move.from, to: move.to });
    },
    [makeMove]
  );

  if (isLoading || !game || !user) {
    return (
      <div className="h-dvh flex items-center justify-center bg-amber-950">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-200 border-t-transparent" />
      </div>
    );
  }

  if (game.status === 'waiting') {
    return <WaitingRoom gameId={gameId!} game={game} currentUid={user.uid} />;
  }

  const boardState =
    game.status === 'active' || game.status === 'finished'
      ? gameToBoardState(game)
      : null;

  return (
    <div
      className="h-dvh flex flex-col bg-amber-950"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <GameHeader game={game} currentUid={user.uid} />

      <GameCanvas
        boardState={boardState}
        currentPlayerUid={user.uid}
        onMove={handleMove}
      />

      {game.status === 'active' && (
        <div className="px-4 py-2 flex justify-center">
          <ResignButton gameId={gameId!} />
        </div>
      )}

      {game.status === 'finished' && (
        <GameOverModal
          game={game}
          currentUid={user.uid}
          onClose={() => navigate('/lobby')}
        />
      )}
    </div>
  );
}

function WaitingRoom({
  gameId,
  game,
  currentUid,
}: {
  gameId: string;
  game: GameDoc;
  currentUid: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const isCreator = game.createdBy === currentUid;
  const spotsLeft = game.playerCount - game.playerUids.length;

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-amber-950 px-6">
      <h2 className="text-2xl font-bold text-amber-100 mb-4">
        Waiting for players...
      </h2>
      <p className="text-amber-300 mb-2">
        {game.playerUids.length} / {game.playerCount} players joined
      </p>
      <div className="space-y-2 mb-6">
        {Object.entries(game.players).map(([uid, player]) => (
          <div key={uid} className="flex items-center gap-2 text-amber-100">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColorCss(player.color) }}
            />
            <span>{player.displayName}</span>
            {uid === currentUid && (
              <span className="text-amber-400 text-sm">(you)</span>
            )}
          </div>
        ))}
      </div>
      {isCreator && spotsLeft > 0 && (
        <button
          onClick={() => setShowInvite(true)}
          className="bg-amber-700 text-amber-100 px-6 py-3 rounded-xl font-medium hover:bg-amber-600 active:scale-95 transition-all mb-4"
        >
          Invite Friends ({spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left)
        </button>
      )}
      <p className="text-amber-400 text-sm">
        Share the game link with friends to invite them
      </p>
      {showInvite && (
        <InviteFriendModal
          gameId={gameId}
          currentUid={currentUid}
          existingPlayerUids={game.playerUids}
          existingInvitedUids={game.invitedUids}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

function ResignButton({ gameId }: { gameId: string }) {
  const resign = useResignGame(gameId);
  return (
    <button
      onClick={() => {
        if (confirm('Are you sure you want to resign?')) {
          resign.mutate();
        }
      }}
      className="text-red-400 text-sm px-4 py-2 rounded-lg border border-red-400/30 hover:bg-red-400/10 active:scale-95 transition-all"
    >
      Resign
    </button>
  );
}

function InviteFriendModal({
  gameId,
  currentUid,
  existingPlayerUids,
  existingInvitedUids,
  onClose,
}: {
  gameId: string;
  currentUid: string;
  existingPlayerUids: string[];
  existingInvitedUids: string[];
  onClose: () => void;
}) {
  const { data: friends = [] } = useFriends(currentUid);
  const queryClient = useQueryClient();

  // Filter out friends who are already players or invited
  const excluded = new Set([...existingPlayerUids, ...existingInvitedUids]);
  const availableFriends = friends.filter(
    (f) => !excluded.has(getFriendUid(f, currentUid))
  );

  const invite = useMutation({
    mutationFn: (invitedUid: string) => inviteToGameFn({ gameId, invitedUid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-4">
      <div className="bg-amber-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold text-amber-100 mb-4">Invite a Friend</h2>

        {availableFriends.length === 0 ? (
          <p className="text-amber-400 text-sm text-center py-4">
            No available friends to invite. Add friends first!
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {availableFriends.map((f) => (
              <FriendInviteRow
                key={f.id}
                friendUid={getFriendUid(f, currentUid)}
                onInvite={(uid) => invite.mutate(uid)}
                isPending={invite.isPending}
              />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-amber-400 bg-amber-800 hover:bg-amber-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function FriendInviteRow({
  friendUid,
  onInvite,
  isPending,
}: {
  friendUid: string;
  onInvite: (uid: string) => void;
  isPending: boolean;
}) {
  const { data: friend } = useUser(friendUid);

  return (
    <div className="flex items-center justify-between bg-amber-800/60 rounded-xl p-3">
      <div className="flex items-center gap-3">
        {friend?.photoURL ? (
          <img src={friend.photoURL} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-100">
            {friend?.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <span className="text-amber-100 text-sm">{friend?.displayName || 'Loading...'}</span>
      </div>
      <button
        onClick={() => onInvite(friendUid)}
        disabled={isPending}
        className="text-sm bg-amber-600 text-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-500 active:scale-95 transition-all disabled:opacity-50"
      >
        Invite
      </button>
    </div>
  );
}
