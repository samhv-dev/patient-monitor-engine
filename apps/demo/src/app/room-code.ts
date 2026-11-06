// Room plan R1 (docs/plans/room-and-instruments.md §7; Q3 ruled 5 November = A): the room code lives until the
// instructor asks for a new one, through reloads, restarts and the next day. Before this every fresh tab drew a new code
// (session.ts), so the phones and screens that scanned yesterday's QR found nothing today.
// The start order of an instructor's page: its own `?session=` (a reload keeps its code, main.ts writes it there), else
// the room code this browser stored, else the relay's `lastRoom` (R1b: the kit moved to the next port, a new origin whose
// store is empty; the relay keeps the last room's code in the computer's application-data folder), else none (the
// session draws a new one, and this page stores it). The live-host
// question stays host-guard.ts's: main.ts hands it the start code as its `param`, so a second tab of the same browser
// while the first runs the room is asked as a duplicated tab is.
// §4 D3: the stored code is the ROOM's. Only a page started without `?session=` stores the code it runs, and never
// after "Start a new session" (a code for that tab alone). Per-viewer storage (store.ts): a private window that refuses
// it gets a new code each time, as before, and no error.
import { normalizeSessionCode } from '@pme/controller';
import { store } from './store.ts';

/** store.ts key: `pme.roomCode`. */
export const ROOM_CODE_KEY = 'roomCode';

/** The code a starting instructor's page runs under, or null when it has none and draws a new one. Invalid values are ignored. */
export function startCode(o: { param: string | null; stored: string | null; lastRoom?: string | null | undefined }): string | null {
  return normalizeSessionCode(o.param ?? '') ?? normalizeSessionCode(o.stored ?? '') ?? normalizeSessionCode(o.lastRoom ?? '');
}

/** Whether the code this page runs becomes the room's, which it does when started without `?session=` and not after "Start a new session". */
export function keepsRoomCode(o: { param: string | null; answer: 'join' | 'new' | null }): boolean {
  return o.param === null && o.answer !== 'new';
}

/** The room code this browser stored, or null (none, an invalid value, or a store that refuses). */
export const storedRoomCode = (): string | null => normalizeSessionCode(store.get(ROOM_CODE_KEY) ?? '');

export const keepRoomCode = (code: string): void => store.set(ROOM_CODE_KEY, code);
