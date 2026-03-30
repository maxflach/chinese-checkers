import { auth } from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const onUserCreated = auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  await db.doc(`users/${uid}`).set({
    uid,
    displayName: displayName || email?.split('@')[0] || 'Player',
    email: email || '',
    photoURL: photoURL || null,
    fcmTokens: [],
    activeGameId: null,
    lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
