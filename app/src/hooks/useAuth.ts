import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      queryClient.setQueryData<User | null>(['auth', 'user'], user);
    });
    return unsubscribe;
  }, [queryClient]);

  return useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: () =>
      new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      }),
    staleTime: Infinity,
  });
}
