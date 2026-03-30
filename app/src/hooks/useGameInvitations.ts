import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GameDoc } from './useGame';

export function useGameInvitations(uid: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'games'),
      where('invitedUids', 'array-contains', uid),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const games = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameDoc));
      queryClient.setQueryData(['gameInvitations', uid], games);
    });
    return unsubscribe;
  }, [uid, queryClient]);

  return useQuery<GameDoc[]>({
    queryKey: ['gameInvitations', uid],
    queryFn: async () => {
      if (!uid) return [];
      const q = query(
        collection(db, 'games'),
        where('invitedUids', 'array-contains', uid),
        where('status', '==', 'waiting'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GameDoc));
    },
    enabled: !!uid,
  });
}
