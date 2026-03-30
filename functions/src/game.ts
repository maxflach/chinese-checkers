import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  CreateGameSchema,
  InviteToGameSchema,
  JoinGameSchema,
  MakeMoveSchema,
  ResignGameSchema,
  AbandonGameSchema,
} from './lib/schema';
import {
  generateInitialBoard,
  isValidMove,
  checkWin,
  posKey,
  TRIANGLE_COLORS,
  PLAYER_TRIANGLES,
  OPPOSITE_TRIANGLE,
} from './lib/boardLogic';

const db = admin.firestore();

// ── createGame ──────────────────────────────────────────────────────

export const createGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = CreateGameSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { playerCount } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.collection('games').doc();

    await gameRef.set({
      status: 'waiting',
      createdBy: callerUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      players: {
        [callerUid]: {
          displayName: request.auth.token.name || '',
          photoURL: request.auth.token.picture || null,
          color: TRIANGLE_COLORS[0], // 'red'
          triangle: PLAYER_TRIANGLES[playerCount][0], // triangle 0
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      playerOrder: [callerUid],
      playerUids: [callerUid],
      playerCount,
      currentTurn: '',
      turnNumber: 0,
      board: {},
      invitedUids: [],
      winner: null,
      finishedAt: null,
    });

    return { gameId: gameRef.id };
  },
);

// ── inviteToGame ────────────────────────────────────────────────────

export const inviteToGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = InviteToGameSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { gameId, invitedUid } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);
    const snap = await gameRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Game not found.');
    }

    const game = snap.data()!;

    if (game.createdBy !== callerUid) {
      throw new HttpsError(
        'permission-denied',
        'Only the game creator can invite players.',
      );
    }

    if (game.status !== 'waiting') {
      throw new HttpsError(
        'failed-precondition',
        'Game is not in waiting status.',
      );
    }

    if (invitedUid === callerUid) {
      throw new HttpsError('invalid-argument', 'Cannot invite yourself.');
    }

    if (
      (game.invitedUids as string[]).includes(invitedUid) ||
      (game.playerUids as string[]).includes(invitedUid)
    ) {
      throw new HttpsError(
        'already-exists',
        'User is already invited or has joined.',
      );
    }

    await gameRef.update({
      invitedUids: admin.firestore.FieldValue.arrayUnion(invitedUid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
);

// ── joinGame ────────────────────────────────────────────────────────

export const joinGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = JoinGameSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { gameId } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);
    const snap = await gameRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Game not found.');
    }

    const game = snap.data()!;

    if (game.status !== 'waiting') {
      throw new HttpsError(
        'failed-precondition',
        'Game is not in waiting status.',
      );
    }

    if (!(game.invitedUids as string[]).includes(callerUid)) {
      throw new HttpsError(
        'permission-denied',
        'You have not been invited to this game.',
      );
    }

    // Determine next triangle and color for this player
    const playerCount = game.playerCount as number;
    const assignedTriangles = PLAYER_TRIANGLES[playerCount];
    const currentPlayerCount = (game.playerUids as string[]).length;
    const nextTriangleIndex = currentPlayerCount; // 0-based; creator is index 0
    const triangle = assignedTriangles[nextTriangleIndex];
    const color = TRIANGLE_COLORS[triangle];

    const updateData: Record<string, unknown> = {
      [`players.${callerUid}`]: {
        displayName: request.auth.token.name || '',
        photoURL: request.auth.token.picture || null,
        color,
        triangle,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      playerUids: admin.firestore.FieldValue.arrayUnion(callerUid),
      playerOrder: admin.firestore.FieldValue.arrayUnion(callerUid),
      invitedUids: admin.firestore.FieldValue.arrayRemove(callerUid),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const newPlayerCount = currentPlayerCount + 1;

    if (newPlayerCount === playerCount) {
      // All players joined — start the game
      // Build players list for initial board generation
      const players: { uid: string; triangle: number }[] = [];

      // Existing players from game doc
      const existingPlayers = game.players as Record<
        string,
        { triangle: number }
      >;
      for (const uid of game.playerUids as string[]) {
        players.push({ uid, triangle: existingPlayers[uid].triangle });
      }
      // Add joining player
      players.push({ uid: callerUid, triangle });

      const board = generateInitialBoard(players);

      updateData.board = board;
      updateData.status = 'active';
      updateData.currentTurn = (game.playerOrder as string[])[0];
      updateData.turnNumber = 1;
    }

    await gameRef.update(updateData);

    return { started: newPlayerCount === playerCount };
  },
);

// ── makeMove ────────────────────────────────────────────────────────

export const makeMove = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = MakeMoveSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { gameId, from, to } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(gameRef);

      if (!snap.exists) {
        throw new HttpsError('not-found', 'Game not found.');
      }

      const game = snap.data()!;

      if (game.status !== 'active') {
        throw new HttpsError(
          'failed-precondition',
          'Game is not active.',
        );
      }

      if (game.currentTurn !== callerUid) {
        throw new HttpsError(
          'failed-precondition',
          'It is not your turn.',
        );
      }

      const board = game.board as Record<string, string>;
      const fromKey = posKey(from);
      const toKey = posKey(to);

      if (board[fromKey] !== callerUid) {
        throw new HttpsError(
          'invalid-argument',
          'The selected position does not contain your marble.',
        );
      }

      if (!isValidMove(board, fromKey, toKey, callerUid)) {
        throw new HttpsError('invalid-argument', 'Invalid move.');
      }

      // Apply the move
      const newBoard = { ...board };
      delete newBoard[fromKey];
      newBoard[toKey] = callerUid;

      // Check win condition
      const players = game.players as Record<
        string,
        { triangle: number }
      >;
      const playerTriangle = players[callerUid].triangle;
      const targetTriangle = OPPOSITE_TRIANGLE[playerTriangle];
      const won = checkWin(newBoard, callerUid, targetTriangle);

      const playerOrder = game.playerOrder as string[];
      const turnNumber = (game.turnNumber as number) + 1;

      const updateData: Record<string, unknown> = {
        board: newBoard,
        turnNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      let winner: string | null = null;

      if (won) {
        updateData.status = 'finished';
        updateData.winner = callerUid;
        updateData.finishedAt =
          admin.firestore.FieldValue.serverTimestamp();
        winner = callerUid;
      } else {
        // Advance to next player
        const currentIndex = playerOrder.indexOf(callerUid);
        const nextIndex = (currentIndex + 1) % playerOrder.length;
        updateData.currentTurn = playerOrder[nextIndex];
      }

      tx.update(gameRef, updateData);

      // Write move document
      const moveRef = gameRef.collection('moves').doc();
      tx.set(moveRef, {
        playerUid: callerUid,
        from,
        to,
        turnNumber: game.turnNumber as number, // the turn this move was made on
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, winner };
    });

    return result;
  },
);

// ── resignGame ──────────────────────────────────────────────────────

export const resignGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = ResignGameSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { gameId } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);
    const snap = await gameRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Game not found.');
    }

    const game = snap.data()!;

    if (game.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        'Game is not active.',
      );
    }

    const playerUids = game.playerUids as string[];

    if (!playerUids.includes(callerUid)) {
      throw new HttpsError(
        'permission-denied',
        'You are not a player in this game.',
      );
    }

    const playerOrder = game.playerOrder as string[];
    const board = game.board as Record<string, string>;

    if (playerUids.length === 2) {
      // 2-player: the other player wins immediately
      const otherUid = playerUids.find((uid) => uid !== callerUid)!;

      await gameRef.update({
        status: 'finished',
        winner: otherUid,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // 3+ players: remove resigning player's marbles, remove from turn order
      const newBoard: Record<string, string> = {};
      for (const [key, uid] of Object.entries(board)) {
        if (uid !== callerUid) {
          newBoard[key] = uid;
        }
      }

      const newPlayerOrder = playerOrder.filter(
        (uid) => uid !== callerUid,
      );
      const newPlayerUids = playerUids.filter(
        (uid) => uid !== callerUid,
      );

      // If it was the resigning player's turn, advance to next
      let currentTurn = game.currentTurn as string;
      if (currentTurn === callerUid) {
        const oldIndex = playerOrder.indexOf(callerUid);
        const nextIndex = oldIndex % newPlayerOrder.length;
        currentTurn = newPlayerOrder[nextIndex];
      }

      const updateData: Record<string, unknown> = {
        board: newBoard,
        playerOrder: newPlayerOrder,
        playerUids: newPlayerUids,
        currentTurn,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If only 1 player remains, they win
      if (newPlayerUids.length === 1) {
        updateData.status = 'finished';
        updateData.winner = newPlayerUids[0];
        updateData.finishedAt =
          admin.firestore.FieldValue.serverTimestamp();
      }

      await gameRef.update(updateData);
    }

    return { success: true };
  },
);

// ── abandonGame ─────────────────────────────────────────────────────

export const abandonGame = onCall(
  { region: 'europe-west1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const parsed = AbandonGameSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const { gameId } = parsed.data;
    const callerUid = request.auth.uid;

    const gameRef = db.doc(`games/${gameId}`);
    const snap = await gameRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Game not found.');
    }

    const game = snap.data()!;

    if (game.status !== 'waiting') {
      throw new HttpsError(
        'failed-precondition',
        'Game is not in waiting status.',
      );
    }

    const playerUids = game.playerUids as string[];

    if (game.createdBy !== callerUid && !playerUids.includes(callerUid)) {
      throw new HttpsError(
        'permission-denied',
        'You are not the creator or a player in this game.',
      );
    }

    if (callerUid === game.createdBy) {
      // Creator abandons: mark entire game as abandoned
      await gameRef.update({
        status: 'abandoned',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Non-creator player leaves: remove from playerUids, put back in invitedUids
      await gameRef.update({
        playerUids: admin.firestore.FieldValue.arrayRemove(callerUid),
        playerOrder: admin.firestore.FieldValue.arrayRemove(callerUid),
        invitedUids: admin.firestore.FieldValue.arrayUnion(callerUid),
        [`players.${callerUid}`]: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  },
);
