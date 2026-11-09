// R8d (plan room-and-instruments.md §7): the ventilator's own page signs in over the relay as the `ventilator` role
// (R8a), granted by the host's PIN check (R8c) and carried by the relay to the host only (R8b). As the instructor's
// phone does (controller-session.ts): every open socket says its own hello, from a fresh peer id, with the PIN the page
// holds in memory (typed into P7's form; never in an address); a grant never passes from one socket to another. Its
// link messages go out as `vent` only while it is granted, and only a `vent` for it is heard. A refusal ends the link
// with the reason (the page shows the form again). When the browser says the network is gone (`offline`) it drops its
// socket at once, so nothing it computes reaches the patient late: the host hears the silence and hands the patient to
// the engine's own ventilator within 1 s (views/vent.ts COCKPIT_SILENCE_MS); back `online`, it signs in again. A
// host that handed it over for its silence revokes that socket id (VENTILATOR_REASONS.silent): it signs in again at once
// on a new socket (closing the browser's socket does not stop Chromium sending frames it held on it once the network is
// back; the host refuses those, by the revoked id).
import { createStamper, createWebSocketTransport, newPeerId, VENTILATOR_REASONS, type InstructorAccess, type ManagedTransport, type WireMessage } from '@pme/controller';
import type { VentWire, VentWireBody } from '@pme/ventilator';

/** Plan §5 (instructor-peer-role.md): a socket that heard nothing this long is dropped and opened again, as the
 *  instructor's phone does (views/remote.ts INSTRUCTOR_LIVENESS_MS) [ENG: ui]. */
export const VENT_LIVENESS_MS = 12_000;

export type VentDeviceState = 'pending' | 'granted' | 'revoked' | 'denied' | 'offline' | 'closed';

export interface VentDevice {
  readonly state: VentDeviceState;
  /** The host's or the relay's words for a refusal. */
  readonly access: Pick<InstructorAccess, 'reason' | 'code'>;
  /** This socket's peer id (null before the first). */
  readonly sender: string | null;
  /** The cockpit's link over the relay (createRelayPort's wire). */
  readonly wire: VentWire;
  onChange(fn: () => void): () => void;
  close(): void;
}

export interface VentDeviceOptions {
  code: string;
  relay: string;
  pin: string;
  /** For tests: the link to the relay (default a WebSocket with VENT_LIVENESS_MS). */
  connect?: (relay: string) => ManagedTransport;
}

export function signInVentilator(o: VentDeviceOptions): VentDevice {
  const connect = o.connect ?? ((url: string) => createWebSocketTransport({ url, livenessMs: VENT_LIVENESS_MS }));
  const peer = newPeerId('vent');
  const fns = new Set<() => void>();
  const bodies = new Set<(b: VentWireBody) => void>();
  let n = 0;
  let state: VentDeviceState = 'pending';
  let access: Pick<InstructorAccess, 'reason' | 'code'> = {};
  let sender: string | null = null;
  let stamp: ReturnType<typeof createStamper> | null = null;
  let link: { t: ManagedTransport; offs: Array<() => void> } | null = null;
  const set = (s: VentDeviceState, a: Pick<InstructorAccess, 'reason' | 'code'> = {}) => {
    state = s;
    access = a;
    for (const fn of [...fns]) fn();
  };
  const drop = () => {
    if (!link) return;
    for (const off of link.offs.splice(0)) off();
    link.t.close();
    link = null;
  };
  const open = () => {
    drop();
    const t = connect(o.relay);
    const cur = { t, offs: [] as Array<() => void> };
    link = cur;
    cur.offs.push(
      t.onStatus((s) => {
        if (s !== 'open' || link !== cur) return;
        // a fresh sender per socket: a reconnect never claims its dead socket's id, nor its grant
        sender = `${peer}.${++n}`;
        stamp = createStamper(o.code, sender);
        set('pending');
        t.send(stamp({ kind: 'hello', role: 'ventilator', pin: o.pin }));
      }),
      t.onMessage((m: WireMessage) => {
        if (link !== cur) return;
        if (m.kind === 'grant') {
          if (m.to !== sender) return;
          if (m.granted) return set('granted');
          // handed over for its silence (the hand-over contract): this socket id is done; sign in again at once on a
          // new socket with the PIN held, and take over from the engine's settings then
          if (m.reason === VENTILATOR_REASONS.silent) {
            set('pending');
            return open();
          }
          drop();
          return set(state === 'granted' ? 'revoked' : 'denied', m.reason !== undefined ? { reason: m.reason } : {});
        }
        if (m.kind === 'vent' && state === 'granted' && (m.to === undefined || m.to === sender)) for (const fn of [...bodies]) fn(m.body as VentWireBody);
      }),
      t.onRelayFrame?.((f) => {
        if (link !== cur || f.relay !== 'error' || (f.code !== 'denied' && f.code !== 'too-many-tries')) return;
        if (f.code === 'denied' && (state === 'denied' || state === 'revoked')) return; // the host's own words came first
        drop();
        set('denied', { reason: f.message, code: f.code });
      }) ?? (() => undefined),
    );
  };
  const offline = () => {
    if (state === 'closed' || state === 'denied' || state === 'revoked') return;
    drop();
    set('offline');
  };
  const online = () => {
    if (state !== 'offline') return;
    set('pending');
    open();
  };
  addEventListener('offline', offline);
  addEventListener('online', online);
  open();
  return {
    get state() {
      return state;
    },
    get access() {
      return access;
    },
    get sender() {
      return sender;
    },
    wire: {
      send: (body) => {
        if (state !== 'granted' || !link || !stamp) return; // nothing goes before the grant, or while it is offline
        link.t.send(stamp({ kind: 'vent', body } as never));
      },
      onBody: (fn) => (bodies.add(fn), () => void bodies.delete(fn)),
    },
    onChange: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    close() {
      removeEventListener('offline', offline);
      removeEventListener('online', online);
      drop();
      set('closed');
    },
  };
}
