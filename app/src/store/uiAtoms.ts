import { atom } from 'jotai';

// UI state atoms — for local/client state only
// Server state belongs in React Query, not here
export const sidebarOpenAtom = atom(false);
