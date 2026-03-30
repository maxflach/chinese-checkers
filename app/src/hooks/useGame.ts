import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BoardState, PlayerColor } from '@/lib/board/types';

export interface GamePlayer {
  displayName: string;
  photoURL: string | null;
  color: PlayerColor;
  triangle: number;
  joinedAt: unknown;
}

export interface GameDoc {
  id: string;
  status: 'waiting' | 'active' | 'finished' | 'abandoned';
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  players: Record<string, GamePlayer>;
  playerOrder: string[];
  playerUids: string[];
  playerCount: number;
  currentTurn: string;
  turnNumber: number;
  board: Record<string, string>;
  invitedUids: string[];
  winner: string | null;
  finishedAt: unknown | null;
}

export function useGame(gameId: string) {
  const queryClient = useQueryClient();

  // Set up real-time listener
  useEffect(() => {
    const docRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        queryClient.setQueryData<GameDoc>(['game', gameId], {
          id: snap.id,
          ...snap.data(),
        } as GameDoc);
      }
    });
    return unsubscribe;
  }, [gameId, queryClient]);

  return useQuery<GameDoc | null>({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'games', gameId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as GameDoc;
    },
  });
}

// Convert GameDoc to BoardState for the renderer
export function gameToBoardState(game: GameDoc): BoardState {
  return {
    positions: game.board,
    currentTurn: game.currentTurn,
    players: Object.fromEntries(
      Object.entries(game.players).map(([uid, p]) => [
        uid,
        { color: p.color, triangle: p.triangle },
      ])
    ),
  };
}
