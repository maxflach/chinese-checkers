import * as admin from 'firebase-admin';

admin.initializeApp();

export { onUserCreated } from './onUserCreated';
export { createGame, inviteToGame, joinGame, makeMove, resignGame, abandonGame } from './game';
export { sendFriendRequest, respondToFriendRequest, removeFriend, searchUsers } from './friends';
export { registerFcmToken } from './registerFcmToken';
export { unregisterFcmToken } from './unregisterFcmToken';
export { setActiveGame } from './setActiveGame';
export { onTurnChange, onGameInvite, onFriendRequest } from './notifications';
