// The window link (the second transport): the ventilator in its own window/iframe, the monitor elsewhere in the
// same browser. A tiny versioned message set over a `LinkPort` — BroadcastChannel `pme-vent/<session>` across
// windows, or a local pair in one page. It deliberately does NOT go through the controller's HostSession (roles,
// auth, samples guard): the ventilator is a device on the host, not a controller. The app's own cockpit iframe
// uses `createFramePort` (direct same-origin delivery) instead of BroadcastChannel.
//   vent → monitor: { kind: 'cmds' }      the linkTick commands of ventilator tick `tick` (frame, shunt, airway);
//                                         the monitor side stamps them `atTick` so bursts replay on their own ticks
//   monitor → vent: { kind: 'lungState' } every lungState event of the engine, to be applied on ventilator tick `atTick`:
//                                         the first one past the clock limit, which the ventilator cannot have reached,
//                                         so the tick it takes the lung on is the engine's to say, never the wall clock's
//                   { kind: 'clock' }     the ventilator tick it may run up to: the ENGINE is the master clock, the
//                                         ventilator never runs more than MAX_AHEAD_TICKS ahead of the newest engine
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
//                   { kind: 'run' }       fast-forward: run up to this ventilator tick NOW, not on the wall
//                                         clock — the cockpit steps through the span with the engine
//   either way:     { kind: 'time' }      pause / resume / scale, so both sides stay on one sim time base
//   page → vent:    { kind: 'control' }   settings patch, circuit, profile (the combined page's scripted demos)
//   vent → monitor: { kind: 'settings' }  the cockpit's settings, for a hand-over to the engine's own ventilator when a
//                                         cockpit on another device goes (plan room-and-instruments.md §4 D9, R8a;
//                                         sent from R8c on; over the relay, inside the controller's `vent` message)
//   vent → monitor: { kind: 'state' }     the ventilator's whole state after tick `tick`, whenever it changed; the
//                                         monitor keeps it in the engine (`deviceState`), so a bookmark holds it
//   monitor → vent: { kind: 'restore' }   the engine went back to a bookmark holding that state: load it, and make
//                                         at once, unsent, the ticks up to `upTo` that the restored engine already has
//   vent → monitor: { kind: 'restored' }  the answer, loaded or not; its later messages carry the restore's `epoch`
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import type { LungStateEvent } from '../lung-input.ts';
import type { ProfileId } from './profiles.ts';
import type { VentSnapshot } from './vent-driver.ts';

export type LinkMsg =
  | { v: 1; kind: 'cmds'; tick: number; cmds: Command[]; epoch?: string }
  | { v: 1; kind: 'lungState'; ev: LungStateEvent; atTick?: number }
  | { v: 1; kind: 'clock'; ventTick: number }
  | { v: 1; kind: 'run'; ventTick: number }
  | { v: 1; kind: 'time'; action: 'pause' | 'resume' | 'scale'; value?: number }
  | { v: 1; kind: 'control'; patch?: Partial<VentConfig>; circuit?: 'connected' | 'disconnected'; profile?: ProfileId }
  | { v: 1; kind: 'settings'; cfg: VentConfig }
  | { v: 1; kind: 'state'; tick: number; epoch?: string; state: VentSnapshot }
  | { v: 1; kind: 'restore'; epoch: string; state: VentSnapshot; lungs: StampedLung[]; allowed: number; upTo: number }
  | { v: 1; kind: 'restored'; epoch: string; loaded: boolean };

/**
 * What the engine holds of the ventilator driving it (a `deviceState` command; restored as a `deviceState` event): the
 * ventilator's state, the link's own (the tick offset, the last ventilator tick the engine has, the clock it published)
 * and the lungStates sent for ticks after that state's (the state may not hold them yet). The engine's queue holds the frames up to `link.lastTick`; the state may be older (a
 * report comes after its frames), and the ventilator then makes those ticks again, which the link does not send twice.
 */
export interface LinkRecord {
  v: 1;
  vent: VentSnapshot;
  link: { offset: number | null; lastTick: number; allowed: number; engTick: number };
  lungs: StampedLung[];
}

/** A lungState and the ventilator tick it is applied on (null: at once, sent before the link knew its offset). */
export interface StampedLung {
  ev: LungStateEvent;
  at: number | null;
}

/** How a restore ended at the ventilator: it loaded the state, it could not (it drives on with its own), no answer. */
export type RestoreOutcome = 'loaded' | 'refused' | 'silent';

export const isLinkRecord = (r: unknown): r is LinkRecord =>
  typeof r === 'object' && r !== null && (r as LinkRecord).v === 1 && (r as LinkRecord).vent?.v === 1 && typeof (r as LinkRecord).link === 'object';

export interface LinkPort {
  post(m: LinkMsg): void;
  onMessage(fn: (m: LinkMsg) => void): () => void;
  close(): void;
}

export const linkChannelName = (session: string): string => `pme-vent/${session}`;
const isMsg = (d: unknown): d is LinkMsg => typeof d === 'object' && d !== null && (d as { v?: unknown }).v === 1 && typeof (d as { kind?: unknown }).kind === 'string';

/** BroadcastChannel port (a channel never hears its own posts). `Impl` is injectable for tests. */
export function createBroadcastPort(session: string, Impl: new (name: string) => BroadcastChannel = BroadcastChannel): LinkPort {
  const ch = new Impl(linkChannelName(session));
  const fns = new Set<(m: LinkMsg) => void>();
  ch.onmessage = (e: MessageEvent) => {
    if (isMsg(e.data)) for (const fn of [...fns]) fn(e.data);
  };
  return {
    post: (m) => ch.postMessage(m),
    onMessage(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    close() {
      fns.clear();
      ch.close();
    },
  };
}

/** The property of a window under which `createFramePort` keeps its receivers, by channel name. */
export const FRAME_PORT_KEY = '__pmeVentRx';
type Receivers = Record<string, (m: unknown) => void>;

/**
 * FX-1: a port between a page and the same-origin iframe it embeds that never waits on the receiving document's own
 * task queue. Each side keeps its receiver on its window (`FRAME_PORT_KEY`); a post clones the message and hands it to
 * the peer's receiver in a microtask of the POSTING side. On CI's Linux WebKit, messages to the cockpit iframe — over
 * BroadcastChannel and over window.postMessage alike — were held for seconds or never delivered once the Ventilator
 * view was hidden (PR #58 diagnostic runs 38203086536, 38207874736): a speed change was lost, and without `clock`
 * messages the cockpit stopped at its last limit. `peer()` is read at every post (an iframe's contentWindow outlives its
 * documents); a post before the peer's receiver exists is dropped, as a BroadcastChannel post before the peer opened it.
 */
export function createFramePort(session: string, peer: () => object | null | undefined, self: object = globalThis): LinkPort {
  const ch = linkChannelName(session);
  const fns = new Set<(m: LinkMsg) => void>();
  const own = ((self as { [FRAME_PORT_KEY]?: Receivers })[FRAME_PORT_KEY] ??= {});
  const receive = (d: unknown) => {
    if (isMsg(d)) for (const fn of [...fns]) fn(d);
  };
  own[ch] = receive;
  return {
    post(m) {
      let rx: ((m: unknown) => void) | undefined;
      try {
        rx = (peer() as { [FRAME_PORT_KEY]?: Receivers } | null | undefined)?.[FRAME_PORT_KEY]?.[ch];
      } catch {
        return; // a cross-origin peer (never the app's own cockpit): nothing to deliver to
      }
      if (typeof rx !== 'function') return;
      const copy = structuredClone(m);
      queueMicrotask(() => rx(copy));
    },
    onMessage(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    close() {
      fns.clear();
      if (own[ch] === receive) delete own[ch];
    },
  };
}

/** Two connected ports in one page (synchronous delivery). */
export function createLocalPortPair(): [LinkPort, LinkPort] {
  const mk = (): LinkPort & { peer?: Set<(m: LinkMsg) => void>; own: Set<(m: LinkMsg) => void> } => {
    const own = new Set<(m: LinkMsg) => void>();
    const p: LinkPort & { peer?: Set<(m: LinkMsg) => void>; own: Set<(m: LinkMsg) => void> } = {
      own,
      post: (m) => {
        for (const fn of [...(p.peer ?? [])]) fn(m);
      },
      onMessage(fn) {
        own.add(fn);
        return () => own.delete(fn);
      },
      close: () => own.clear(),
    };
    return p;
  };
  const a = mk();
  const b = mk();
  a.peer = b.own;
  b.peer = a.own;
  return [a, b];
}

/** What the monitor side needs of a MonitorHandle (@pme/renderer) or a MonitorEngine — structurally typed. */
export interface MonitorLike {
  dispatch(cmd: Command): Promise<DispatchResult> | DispatchResult;
  on(fn: (e: EngineEvent) => void): () => void;
  pause?(): void;
  resume?(): void;
  setTimeScale?(k: number): void;
}

/** Frames are scheduled this many engine ticks ahead of the first measured arrival (jitter of one rAF frame). */
export const LEAD_TICKS = 5;
/** The ventilator may run this far ahead of the newest engine event (events carry sim time; beats and 1 Hz state). */
export const MAX_AHEAD_TICKS = 75;
/** A cockpit that has not answered a `run` in this long is given up on (the engine's own drive timeout then
 *  takes over, as when the cockpit is closed), wall ms [ENG: network]. */
export const RUN_TIMEOUT_MS = 2000;
/** A ventilator that has not taken a restore is sent it again at most this often while it sends, wall ms [ENG: ui]. */
export const RESTORE_REPOST_MS = 250;

let epochs = 0;
const newEpoch = () => `${Date.now().toString(36)}.${++epochs}`;

/** The link's detach function; also `runTo`, the fast-forward's lockstep with the cockpit. */
export type LinkDetach = (() => void) & {
  /**
   * Have the ventilator's frames for every engine tick up to `engTick` dispatched (with their `atTick`) before the
   * engine runs there. Resolves at once when the link has not learnt its offset yet (no cockpit ventilates).
   */
  runTo(engTick: number): Promise<void>;
  /** The last restore the ventilator was sent (null: none yet): resolves when it ventilates the restored patient, or not. */
  restoring(): Promise<RestoreOutcome> | null;
};

/**
 * Monitor side: dispatch the ventilator's commands on the engine tick that matches the ventilator tick (so a burst
 * of frames from one animation frame, or a ×10 time scale, replays at 50 Hz sim time), forward lungState, apply
 * time messages, and publish the engine's clock. The tick offset is learnt from the first (unstamped) dispatch
 * result — which is the engine's current tick + 1 — and only ever grows, to what the latest late frame needed; a
 * ventilator restart (its tick goes backwards) relearns it. Returns a detach function.
 */
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): LinkDetach {
  let offset: number | null = null;
  let learning = false;
  let gen = 0; // Stage V.1: bumped by a ventilator restart; results of commands sent before it are stale
  let lastTick = -1;
  let allowed = -Infinity;
  let engTick = 0;
  let waiter: { ventTick: number; done: () => void } | null = null; // A fast-forward step waits for frames
  let vent: VentSnapshot | null = null; // The ventilator's last state: null for one that sends none
  let lungs: StampedLung[] = [];
  let detached = false;
  let dirty = false;
  /** The record goes to the engine once per task in which it changed, so a snapshot taken in any later task holds it. */
  const touch = () => {
    if (vent === null || dirty) return;
    dirty = true;
    queueMicrotask(() => {
      dirty = false;
      if (vent === null || detached) return;
      const state: LinkRecord = { v: 1, vent, link: { offset, lastTick, allowed, engTick }, lungs };
      try {
        void Promise.resolve(mon.dispatch({ id: 'vent-state', issuedBy: 'ventilator', type: 'deviceState', source: 'ventilator', state })).catch(() => {});
      } catch {
        // an engine that refuses it keeps the record it had
      }
    });
  };
  /** A restore sent and not yet answered: the ventilator's messages from before it are not heard. */
  let awaiting: { msg: Extract<LinkMsg, { kind: 'restore' }>; at: number } | null = null;
  /** The ticks the restored engine already holds, which the restored ventilator makes again. */
  let dropTo = -1;
  /** The last restore's end (it settles once; a later restore starts another). */
  let outcome: { p: Promise<RestoreOutcome>; settle: (o: RestoreOutcome) => void } | null = null;
  const settle = (o: RestoreOutcome) => outcome?.settle(o);
  const relearn = () => {
    offset = null;
    allowed = -Infinity;
    learning = false;
    gen++;
  };
  const restore = (r: LinkRecord) => {
    settle('silent');
    offset = r.link.offset;
    lastTick = r.link.lastTick;
    allowed = r.link.allowed;
    engTick = r.link.engTick;
    learning = false;
    vent = r.vent;
    lungs = r.lungs;
    dropTo = r.link.lastTick;
    let s: (o: RestoreOutcome) => void = () => {};
    const p = new Promise<RestoreOutcome>((res) => {
      const timer = setTimeout(() => s('silent'), RUN_TIMEOUT_MS);
      s = (o) => {
        clearTimeout(timer);
        s = () => {};
        res(o);
      };
    });
    outcome = { p, settle: (o) => s(o) };
    const msg = {
      v: 1, kind: 'restore', epoch: newEpoch(), state: r.vent, lungs: r.lungs, upTo: dropTo,
      allowed: Number.isFinite(allowed) ? allowed : Math.max(dropTo, r.vent.tick) + 2 * LEAD_TICKS,
    } as const;
    awaiting = { msg, at: Date.now() };
    touch();
    port.post(msg);
  };
  /** Whether a message of the ventilator is not heard: one from before the restore it has not taken yet. */
  const fenced = (m: Extract<LinkMsg, { kind: 'cmds' | 'state' | 'restored' }>): boolean => {
    if (!awaiting) return m.kind === 'restored';
    if (m.kind === 'restored') {
      if (m.epoch !== awaiting.msg.epoch) return true;
      awaiting = null;
      if (!m.loaded) {
        dropTo = -1;
        relearn();
        settle('refused');
      }
      return true;
    }
    if (m.epoch === undefined) {
      // a ventilator that cannot take a restore drives on from its own state, as before
      awaiting = null;
      dropTo = -1;
      relearn();
      settle('refused');
      return false;
    }
    if (m.epoch === awaiting.msg.epoch) return false;
    if (Date.now() - awaiting.at >= RESTORE_REPOST_MS) {
      awaiting.at = Date.now();
      port.post(awaiting.msg);
    }
    return true;
  };
  const publishClock = () => {
    if (offset === null) return;
    const allow = engTick - offset + MAX_AHEAD_TICKS;
    if (allow >= allowed + 2) {
      allowed = allow;
      touch();
      port.post({ v: 1, kind: 'clock', ventTick: allow });
    }
  };
  const offPort = port.onMessage((m) => {
    if ((m.kind === 'cmds' || m.kind === 'state' || m.kind === 'restored') && fenced(m)) return;
    if (m.kind === 'state') {
      vent = m.state;
      const tick = m.state.tick;
      lungs = lungs.filter((l) => l.at !== null && l.at > tick);
      touch();
    } else if (m.kind === 'cmds') {
      if (m.tick <= dropTo) return;
      if (dropTo >= 0) {
        dropTo = -1;
        settle('loaded');
      }
      if (m.tick < lastTick) {
        offset = null;
        allowed = -Infinity;
        learning = false; // Stage V.1: a probe still in flight belongs to the old ventilator — relearn from this one
        gen++;
      }
      lastTick = m.tick;
      touch();
      const w = waiter !== null && m.tick >= waiter.ventTick ? waiter : null; // Released after these dispatches
      for (const c of m.cmds) {
        const at = offset === null ? undefined : m.tick + offset;
        const probe = offset === null && !learning;
        if (probe) learning = true;
        const g = gen;
        // A probe that is refused, throws or rejects frees the next command to probe (otherwise `learning` stays true,
        // no offset is ever learnt, no clock is published and the ventilator stalls for good)
        const failed = (reason?: string) => {
          if (probe && g === gen) learning = false;
          onRejected(c, reason);
        };
        let sent: Promise<DispatchResult> | DispatchResult;
        try {
          sent = mon.dispatch(at === undefined ? c : { ...c, atTick: at });
        } catch (err) {
          failed(err instanceof Error ? err.message : String(err));
          continue;
        }
        void Promise.resolve(sent).then((r) => {
          if (!r.accepted) failed(r.reason);
          else if (g !== gen) return; // Stage V.1: learnt from the ventilator before a restart — never install it
          else if (probe) {
            offset = r.tick - m.tick + LEAD_TICKS;
            learning = false;
            engTick = Math.max(engTick, r.tick - 1);
            touch();
            publishClock();
          } else if (at !== undefined && r.tick > at) {
            // FX-1: the offset this frame needed, not the current offset plus its lateness. A burst of late frames is
            // stamped with one offset, and adding each frame's lateness moved it once per frame (40 frames 35 ticks late:
            // 14 s); the clock limit then held the cockpit until the engine's 5 s drive watchdog declared apnoea. For a
            // single late frame the two rules agree.
            offset = Math.max(offset ?? 0, r.tick - m.tick);
            touch();
          }
        }, (err: unknown) => failed(err instanceof Error ? err.message : String(err)));
      }
      w?.done();
    } else if (m.kind === 'time') {
      if (m.action === 'pause') mon.pause?.();
      else if (m.action === 'resume') mon.resume?.();
      else if (m.value !== undefined) mon.setTimeScale?.(m.value);
    }
  });
  const offEng = mon.on((e) => {
    if (e.type === 'deviceState') {
      if (e.source === 'ventilator' && isLinkRecord(e.state)) restore(e.state);
      return;
    }
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (e.type === 'toneCancel' && e.ids === undefined) {
      // The engine was RESTORED (its restore marker: a toneCancel without ids; a new engine re-attaches instead). The
      // old timeline's offset stamped every later frame in the restored future (50 s late after a 50 s rewind) and no
      // clock was published: the cockpit stopped ventilating the patient while its own screen looked normal. Start a
      // new generation: the next frame probes, the clock is published again from the restored time. (Event times alone
      // cannot tell: a breath or a beat may carry a time seconds before "now".)
      offset = null;
      allowed = -Infinity;
      learning = false;
      gen++;
      engTick = Math.floor(e.after / 0.02 + 1e-6);
      // FX-1: the offset is relearnt from the next frame, but a cockpit already at its clock limit sends none (common on a
      // slow runner: CI WebKit's cockpit froze at its limit after "Return here" and the 5 s watchdog declared apnoea).
      // Let it run 2·LEAD_TICKS past its last frame, as before its first clock; those frames probe the new offset.
      if (lastTick >= 0) {
        allowed = lastTick + 2 * LEAD_TICKS;
        port.post({ v: 1, kind: 'clock', ventTick: allowed });
      }
      publishClock();
      return;
    }
    if (tk > engTick) {
      engTick = tk;
      touch();
      publishClock();
    }
    if (e.type === 'lungState') {
      const at = Number.isFinite(allowed) ? allowed + 1 : null;
      lungs = [...lungs.filter((l) => l.at !== null), { ev: e, at }];
      touch();
      port.post({ v: 1, kind: 'lungState', ev: e, ...(at === null ? {} : { atTick: at }) });
    }
  });
  const detach = () => {
    detached = true;
    offPort();
    offEng();
    waiter?.done();
    settle('silent');
  };
  return Object.assign(detach, {
    runTo(eng: number): Promise<void> {
      if (offset === null) return Promise.resolve();
      const ventTick = eng - offset;
      if (lastTick >= ventTick) return Promise.resolve();
      allowed = Math.max(allowed, ventTick); // what the ventilator may now reach: a lungState is stamped past it
      touch();
      return new Promise<void>((res) => {
        const timer = setTimeout(() => w.done(), RUN_TIMEOUT_MS);
        const w = {
          ventTick,
          done: () => {
            clearTimeout(timer);
            if (waiter === w) waiter = null;
            res();
          },
        };
        waiter?.done();
        waiter = w;
        port.post({ v: 1, kind: 'run', ventTick });
      });
    },
    restoring: () => outcome?.p ?? null,
  });
}
