import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Friendship } from './useFriends';

export function useFriendRequests(uid: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', uid),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const requests = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
      queryClient.setQueryData(['friendRequests', uid], requests);
    });
    return unsubscribe;
  }, [uid, queryClient]);

  return useQuery<Friendship[]>({
    queryKey: ['friendRequests', uid],
    queryFn: async () => {
      if (!uid) return [];
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', uid),
        where('status', '==', 'pending'),
        orderBy('requestedAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
    },
    enabled: !!uid,
  });
}
