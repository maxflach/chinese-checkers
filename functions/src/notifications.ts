import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

// Send FCM to a user, suppressing visible notification if they're active in the game
async function sendGameNotification(
  targetUid: string,
  gameId: string,
  title: string,
  body: string
): Promise<void> {
  const userDoc = await db.doc(`users/${targetUid}`).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const tokens: string[] = userData.fcmTokens || [];
  if (tokens.length === 0) return;

  // Check if user is actively viewing this game
  const isActive =
    userData.activeGameId === gameId &&
    userData.lastActiveAt &&
    Date.now() - userData.lastActiveAt.toMillis() < 2 * 60 * 1000; // 2 minutes

  const staleTokens: string[] = [];

  for (const token of tokens) {
    try {
      if (isActive) {
        // Send data-only message (no visible notification)
        await messaging.send({
          token,
          data: { type: 'turn', gameId },
        });
      } else {
        // Send visible notification
        await messaging.send({
          token,
          notification: { title, body },
          data: { type: 'turn', gameId },
          webpush: {
            fcmOptions: { link: `/game/${gameId}` },
          },
        });
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        staleTokens.push(token);
      }
    }
  }

  // Clean up stale tokens
  if (staleTokens.length > 0) {
    await db.doc(`users/${targetUid}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
    });
  }
}

// Trigger: when a game's currentTurn changes, notify the next player
export const onTurnChange = onDocumentUpdated(
  { document: 'games/{gameId}', region: 'europe-west1' },
  async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const gameId = event.params.gameId;

    // Only fire if currentTurn actually changed and game is active
    if (before.currentTurn === after.currentTurn) return;
    if (after.status !== 'active') return;

    const nextPlayerUid = after.currentTurn;
    const prevPlayer = after.players[before.currentTurn];
    const prevPlayerName = prevPlayer?.displayName || 'Someone';

    await sendGameNotification(
      nextPlayerUid,
      gameId,
      'Your turn!',
      `${prevPlayerName} made a move. It's your turn now!`
    );
  }
);

// Trigger: when a game invite is created/updated (invitedUids changes)
export const onGameInvite = onDocumentUpdated(
  { document: 'games/{gameId}', region: 'europe-west1' },
  async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const gameId = event.params.gameId;

    if (after.status !== 'waiting') return;

    // Find newly added invited UIDs
    const newInvites = (after.invitedUids || []).filter(
      (uid: string) => !(before.invitedUids || []).includes(uid)
    );

    const creator = after.players[after.createdBy];
    const creatorName = creator?.displayName || 'Someone';

    for (const uid of newInvites) {
      await sendGameNotification(
        uid,
        gameId,
        'Game invitation!',
        `${creatorName} invited you to play Chinese Checkers!`
      );
    }
  }
);

// Trigger: when a friend request is created
export const onFriendRequest = onDocumentCreated(
  { document: 'friendships/{friendshipId}', region: 'europe-west1' },
  async (event) => {
    if (!event.data) return;
    const data = event.data.data();

    if (data.status !== 'pending') return;

    const targetUid = data.users.find((uid: string) => uid !== data.requestedBy);
    if (!targetUid) return;

    const senderDoc = await db.doc(`users/${data.requestedBy}`).get();
    const senderName = senderDoc.exists ? senderDoc.data()!.displayName : 'Someone';

    // Friend requests don't have a gameId — send a general notification
    const userDoc = await db.doc(`users/${targetUid}`).get();
    if (!userDoc.exists) return;

    const tokens: string[] = userDoc.data()!.fcmTokens || [];
    const staleTokens: string[] = [];

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title: 'Friend request',
            body: `${senderName} wants to be your friend!`,
          },
          data: { type: 'friend_request' },
          webpush: {
            fcmOptions: { link: '/friends' },
          },
        });
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (
          err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered'
        ) {
          staleTokens.push(token);
        }
      }
    }

    if (staleTokens.length > 0) {
      await db.doc(`users/${targetUid}`).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
      });
    }
  }
);
