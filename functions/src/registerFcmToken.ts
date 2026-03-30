import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { RegisterFcmTokenSchema } from './lib/schema';

const db = admin.firestore();

export const registerFcmToken = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { token } = RegisterFcmTokenSchema.parse(request.data);
    const uid = request.auth.uid;

    await db.doc(`users/${uid}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);
