import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePresence(uid: string | undefined, gameId: string | null) {
  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);

    // Set active game
    updateDoc(userRef, {
      activeGameId: gameId,
      lastActiveAt: serverTimestamp(),
    }).catch(() => {});

    // Heartbeat every 60 seconds
    const interval = setInterval(() => {
      updateDoc(userRef, {
        lastActiveAt: serverTimestamp(),
      }).catch(() => {});
    }, 60_000);

    // Handle visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        updateDoc(userRef, {
          activeGameId: null,
          lastActiveAt: serverTimestamp(),
        }).catch(() => {});
      } else {
        updateDoc(userRef, {
          activeGameId: gameId,
          lastActiveAt: serverTimestamp(),
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Clear active game on unmount
      updateDoc(userRef, {
        activeGameId: null,
        lastActiveAt: serverTimestamp(),
      }).catch(() => {});
    };
  }, [uid, gameId]);
}
