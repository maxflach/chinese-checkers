import { useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/messaging';

export function useFcmToken(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;

    // Request permission and register token
    requestNotificationPermission();

    return () => {
      // Don't unregister on unmount — only on explicit logout
    };
  }, [uid]);
}
