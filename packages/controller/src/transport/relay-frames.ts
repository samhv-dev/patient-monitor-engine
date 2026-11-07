// Control frames the relay sends besides WireMessages (they carry a `relay` key and never a `v` key).
import type { Instrument, Role } from '../protocol.ts';

/**
 * One non-host socket of a room as the relay sees it, in the HOST's `peers` frame only (plan room-and-instruments.md R2,
 * §4 D2). `show` and `device` are its last hello's (null when that hello had none: an older build, a controller);
 * `rttMs` is the round trip of its answer to the relay's last heartbeat ping, null while that ping is unanswered (or
 * none was sent to it yet); `sinceMs` is the time since its last pong (since it joined, before its first).
 */
export interface RelayDevice {
  id: string;
  role: Role;
  show: Instrument | null;
  device: string | null;
  granted: boolean;
  rttMs: number | null;
  sinceMs: number;
}

export type RelayFrame =
  | { relay: 'hb'; t: number } // app-level heartbeat so browser clients can detect a dead relay
  // `instructors`: granted instructor phones, in the frame to the HOST only (plan instructor-peer-role.md §1)
  // `devices`: every non-host socket with its measured ping, in the frame to the HOST only (R2)
  | { relay: 'peers'; hostOnline: boolean; peers: number; instructors?: number; devices?: RelayDevice[] }
  // R29: to the HOST only, when a non-host socket leaves the room: the host forgets that relay peer's sequence and role,
  // so a hello forged under the id while its owner reconnects does not outlive the forger's socket (the gap of #183)
  | { relay: 'peer-left'; id: string }
  | { relay: 'error'; code: 'bad-hello' | 'host-exists' | 'forbidden' | 'full' | 'bad-session' | 'denied' | 'too-many-tries'; message: string };

/**
 * WebSocket close codes the relay uses for fatal refusals (no reconnect) [ENG]. `denied`: the host refused the
 * instructor's PIN (the page asks again rather than reconnect with it); `tooManyTries`: too many wrong PINs from one
 * address (plan instructor-peer-role.md §1).
 */
export const RELAY_CLOSE = {
  badHello: 4001, badSession: 4002, forbiddenRole: 4003, hostExists: 4009, denied: 4013, tooManyTries: 4028, full: 4029,
} as const;
export const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set(Object.values(RELAY_CLOSE));
/**
 * Close codes for refusals the client retries with its backoff (not in FATAL_CLOSE_CODES): `idTaken`, the peer id is
 * held by another socket that answered the relay's ping. A half-open one does not answer and is closed, so a phone
 * whose network dropped, or a reloaded laptop, gets in on its next try [ENG].
 */
export const RELAY_RETRY_CLOSE = { idTaken: 4010 } as const;

export function isRelayFrame(o: unknown): o is RelayFrame {
  return o !== null && typeof o === 'object' && typeof (o as { relay?: unknown }).relay === 'string';
}
