// The window link over the relay (plan room-and-instruments.md R8c): a cockpit on another device and the host's monitor
// exchange the link's messages inside the controller's `vent` message (R8a), which the relay carries between the host and
// ONE granted ventilator (R8b). The cockpit sends one `cmds` per ventilator tick — 50 a second at ×1, 400 at ×8 — and the
// relay closes a socket past 120 `vent` a second, so this port packs the `cmds` of each 20 ms of WALL time into one
// `batch` (50 a second at most, at any speed); the far port hands them on one by one, in order, as they were posted.
// Everything else goes at once (after the cmds posted before it). On the cockpit side it also sends the cockpit's
// settings, on every change and once a second (the host's hand-over takes them; the message is also its heartbeat), and
// says when its page is hidden. Typed structurally: this package does not depend on @pme/controller.
import type { VentConfig } from '../types.ts';
import type { LinkMsg, LinkPort } from './port.ts';

/** One `batch` per this much wall time at most, ms (plan R8c: 50 a second at any speed). */
export const RELAY_BATCH_MS = 20;
/** The most `cmds` one batch packs (@pme/controller guard.ts VENT_LIMITS.batch). */
export const RELAY_BATCH_MAX = 16;
/** A `vent` body's largest JSON (guard.ts VENT_LIMITS.bytes): a burst over it goes in several batches. */
export const RELAY_BODY_BYTES = 4 * 1024;
/** The cockpit's settings go at least this often, ms (plan R8c: "once a second"). */
export const SETTINGS_MS = 1000;

type Cmds = Extract<LinkMsg, { kind: 'cmds' }>;
/** What the host hands over with: the cockpit's settings and what it last measured (a PSV/PAV rate and volume). */
export interface CockpitSettings {
  cfg: VentConfig;
  measured?: { RR: number; VTE: number };
}
/** A link message as it rides a `vent` (@pme/controller protocol.ts VentLinkBody; test/types.test-d.ts holds them together). */
export type VentWireBody =
  | Exclude<LinkMsg, { kind: 'settings' }>
  | ({ v: 1; kind: 'settings'; hidden?: boolean } & CockpitSettings)
  | { v: 1; kind: 'batch'; msgs: Cmds[] };

/** Where the port's bodies go and come from: a `vent` each way (`ventWireOver`, or the HostSession on the host). */
export interface VentWire {
  send(b: VentWireBody): void;
  onBody(fn: (b: VentWireBody) => void): () => void;
}

export interface RelayPort extends LinkPort {
  /** Send the `cmds` held for the batch now. */
  flush(): void;
  /** The cockpit's page was hidden (true) or shown: its settings say so at once (the host hands over while it is hidden). */
  setHidden(hidden: boolean): void;
}

/** `settings`: the cockpit side's settings (absent on the host). */
export function createRelayPort(wire: VentWire, o: { settings?: () => CockpitSettings | null } = {}): RelayPort {
  const fns = new Set<(m: LinkMsg) => void>();
  let held: Cmds[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hidden = false;
  let closed = false;
  let sentSettings = '';
  const sendSettings = (always: boolean) => {
    const s = o.settings?.();
    if (!s) return;
    const json = JSON.stringify(s);
    if (!always && json === sentSettings) return;
    sentSettings = json;
    wire.send({ v: 1, kind: 'settings', ...(JSON.parse(json) as CockpitSettings), ...(hidden ? { hidden: true } : {}) });
  };
  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    let msgs: Cmds[] = [];
    let bytes = 0;
    const out = () => {
      if (msgs.length === 1) wire.send(msgs[0] as Cmds);
      else if (msgs.length > 1) wire.send({ v: 1, kind: 'batch', msgs });
      msgs = [];
      bytes = 40; // the batch's own envelope, `{"v":1,"kind":"batch","msgs":[]}` and commas
    };
    out();
    for (const m of held.splice(0)) {
      const n = JSON.stringify(m).length + 1;
      if (msgs.length >= RELAY_BATCH_MAX || bytes + n > RELAY_BODY_BYTES) out();
      msgs.push(m);
      bytes += n;
    }
    out();
    sendSettings(false); // a change goes with the next batch
  };
  const every = o.settings ? setInterval(() => sendSettings(true), SETTINGS_MS) : null;
  const off = wire.onBody((b) => {
    const each = b.kind === 'batch' ? b.msgs : [b as LinkMsg];
    for (const m of each) for (const fn of [...fns]) fn(m);
  });
  sendSettings(true); // at once: the host knows what it would hand over before the first frame
  return {
    post(m) {
      if (closed) return;
      if (m.kind === 'cmds') {
        held.push(m);
        timer ??= setTimeout(flush, RELAY_BATCH_MS);
        return;
      }
      flush(); // in order: the cmds posted before it first
      wire.send(m);
    },
    onMessage(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    flush,
    setHidden(h) {
      if (closed) return;
      flush();
      hidden = h;
      sendSettings(true);
    },
    close() {
      if (closed) return;
      flush();
      closed = true;
      if (every !== null) clearInterval(every);
      off();
      fns.clear();
    },
  };
}

/**
 * The cockpit's wire over its socket to the relay (a @pme/controller ManagedTransport and its stamper): each body goes as
 * a `vent`; only a `vent` addressed to `self` (or to nobody) is heard, and only from `from` when it is given (the host).
 */
export function ventWireOver<M extends object>(
  t: { send(m: M): void; onMessage(fn: (m: M) => void): () => void },
  stamp: (b: { kind: 'vent'; body: VentWireBody }) => M,
  o: { self?: string; from?: string } = {},
): VentWire {
  return {
    send: (body) => t.send(stamp({ kind: 'vent', body })),
    onBody: (fn) =>
      t.onMessage((m) => {
        const w = m as { kind?: unknown; from?: unknown; to?: unknown; body?: unknown };
        if (w.kind !== 'vent' || (o.from !== undefined && w.from !== o.from) || (o.self !== undefined && w.to !== undefined && w.to !== o.self)) return;
        fn(w.body as VentWireBody);
      }),
  };
}
