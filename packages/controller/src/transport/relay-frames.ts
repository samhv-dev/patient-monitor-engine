// Control frames the relay sends besides WireMessages (they carry a `relay` key and never a `v` key).
export type RelayFrame =
  | { relay: 'hb'; t: number } // app-level heartbeat so browser clients can detect a dead relay
  | { relay: 'peers'; hostOnline: boolean; peers: number }
  | { relay: 'error'; code: 'bad-hello' | 'host-exists' | 'forbidden' | 'full' | 'bad-session'; message: string };

/** WebSocket close codes the relay uses for fatal refusals (no reconnect) [ENG]. */
export const RELAY_CLOSE = { badHello: 4001, badSession: 4002, hostExists: 4009, full: 4029 } as const;
export const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set(Object.values(RELAY_CLOSE));

export function isRelayFrame(o: unknown): o is RelayFrame {
  return o !== null && typeof o === 'object' && typeof (o as { relay?: unknown }).relay === 'string';
}
