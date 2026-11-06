// Control frames the relay sends besides WireMessages (they carry a `relay` key and never a `v` key).
export type RelayFrame =
  | { relay: 'hb'; t: number } // app-level heartbeat so browser clients can detect a dead relay
  // `instructors`: granted instructor phones, in the frame to the HOST only (plan instructor-peer-role.md §1)
  | { relay: 'peers'; hostOnline: boolean; peers: number; instructors?: number }
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
