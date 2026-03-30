import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  fcmTokens: string[];
  activeGameId: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function useUser(uid: string | undefined) {
  return useQuery<UserProfile | null>({
    queryKey: ['user', uid],
    queryFn: async () => {
      if (!uid) return null;
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      return { uid: snap.id, ...snap.data() } as UserProfile;
    },
    enabled: !!uid,
  });
}
