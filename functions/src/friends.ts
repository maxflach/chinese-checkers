import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { SendFriendRequestSchema, RespondToFriendRequestSchema, RemoveFriendSchema, SearchUsersSchema } from './lib/schema';

const db = admin.firestore();

// Helper: generate friendship doc ID (sorted UIDs)
function friendshipId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export const sendFriendRequest = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { targetUid } = SendFriendRequestSchema.parse(request.data);
    const callerUid = request.auth.uid;

    if (callerUid === targetUid) throw new HttpsError('invalid-argument', 'Cannot friend yourself');

    // Check target user exists
    const targetDoc = await db.doc(`users/${targetUid}`).get();
    if (!targetDoc.exists) throw new HttpsError('not-found', 'User not found');

    const fId = friendshipId(callerUid, targetUid);
    const existingDoc = await db.doc(`friendships/${fId}`).get();

    if (existingDoc.exists) {
      const data = existingDoc.data()!;
      if (data.status === 'accepted') throw new HttpsError('already-exists', 'Already friends');
      if (data.status === 'pending') throw new HttpsError('already-exists', 'Request already pending');
    }

    await db.doc(`friendships/${fId}`).set({
      users: [callerUid, targetUid],
      status: 'pending',
      requestedBy: callerUid,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      respondedAt: null,
    });

    return { friendshipId: fId };
  }
);

export const respondToFriendRequest = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { friendshipId: fId, accept } = RespondToFriendRequestSchema.parse(request.data);
    const callerUid = request.auth.uid;

    const friendDoc = await db.doc(`friendships/${fId}`).get();
    if (!friendDoc.exists) throw new HttpsError('not-found', 'Request not found');

    const data = friendDoc.data()!;
    if (!data.users.includes(callerUid)) throw new HttpsError('permission-denied', 'Not your request');
    if (data.requestedBy === callerUid) throw new HttpsError('invalid-argument', 'Cannot respond to your own request');
    if (data.status !== 'pending') throw new HttpsError('failed-precondition', 'Request is not pending');

    await db.doc(`friendships/${fId}`).update({
      status: accept ? 'accepted' : 'declined',
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

export const removeFriend = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { friendshipId: fId } = RemoveFriendSchema.parse(request.data);
    const callerUid = request.auth.uid;

    const friendDoc = await db.doc(`friendships/${fId}`).get();
    if (!friendDoc.exists) throw new HttpsError('not-found', 'Friendship not found');

    const data = friendDoc.data()!;
    if (!data.users.includes(callerUid)) throw new HttpsError('permission-denied', 'Not your friendship');

    await db.doc(`friendships/${fId}`).delete();
    return { success: true };
  }
);

export const searchUsers = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be signed in');
    const { query: searchQuery } = SearchUsersSchema.parse(request.data);
    const callerUid = request.auth.uid;

    // Search by email (exact match) or display name (prefix match)
    const results: Array<{ uid: string; displayName: string; email: string; photoURL: string | null }> = [];

    // Try exact email match first
    const emailSnap = await db.collection('users').where('email', '==', searchQuery.toLowerCase()).limit(5).get();
    emailSnap.docs.forEach((d) => {
      if (d.id !== callerUid) {
        const data = d.data();
        results.push({ uid: d.id, displayName: data.displayName, email: data.email, photoURL: data.photoURL });
      }
    });

    // If no email match, search by displayName prefix
    if (results.length === 0) {
      const nameSnap = await db.collection('users')
        .where('displayName', '>=', searchQuery)
        .where('displayName', '<=', searchQuery + '\uf8ff')
        .limit(10)
        .get();
      nameSnap.docs.forEach((d) => {
        if (d.id !== callerUid && !results.some((r) => r.uid === d.id)) {
          const data = d.data();
          results.push({ uid: d.id, displayName: data.displayName, email: data.email, photoURL: data.photoURL });
        }
      });
    }

    return { users: results };
  }
);
