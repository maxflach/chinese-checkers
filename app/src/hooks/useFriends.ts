import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Friendship {
  id: string;
  users: string[];
  status: 'pending' | 'accepted' | 'declined';
  requestedBy: string;
  requestedAt: unknown;
  respondedAt: unknown | null;
}

export function useFriends(uid: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', uid),
      where('status', '==', 'accepted')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const friends = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
      queryClient.setQueryData(['friends', uid], friends);
    });
    return unsubscribe;
  }, [uid, queryClient]);

  return useQuery<Friendship[]>({
    queryKey: ['friends', uid],
    queryFn: async () => {
      if (!uid) return [];
      const q = query(
        collection(db, 'friendships'),
        where('users', 'array-contains', uid),
        where('status', '==', 'accepted')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
    },
    enabled: !!uid,
  });
}

// Helper to get the other user's UID from a friendship
export function getFriendUid(friendship: Friendship, myUid: string): string {
  return friendship.users.find((u) => u !== myUid) || '';
}
