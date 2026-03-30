import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SetActiveGameSchema } from './lib/schema';

const db = admin.firestore();

export const setActiveGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { gameId } = SetActiveGameSchema.parse(request.data);
    const uid = request.auth.uid;

    await db.doc(`users/${uid}`).update({
      activeGameId: gameId,
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);
