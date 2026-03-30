import { atom } from 'jotai';

// Currently selected position on the board (null if nothing selected)
export const selectedPositionAtom = atom<string | null>(null);

// Set of valid move destination keys for the selected piece
export const validMovesAtom = atom<Set<string>>(new Set<string>());

// Whether a move animation is playing
export const animatingAtom = atom(false);
