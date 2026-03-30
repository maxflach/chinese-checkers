import { useMutation, useQueryClient } from '@tanstack/react-query';
import { makeMoveFn, resignGameFn } from '@/lib/api';

export function useMakeMove(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (move: { from: { q: number; r: number }; to: { q: number; r: number } }) =>
      makeMoveFn({ gameId, from: move.from, to: move.to }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}

export function useResignGame(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resignGameFn({ gameId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}
