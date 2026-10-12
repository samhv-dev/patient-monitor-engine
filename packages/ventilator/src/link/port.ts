// The window link (R27 second transport): the ventilator in its own window/iframe, the monitor elsewhere in the
// same browser. A tiny versioned message set over a `LinkPort` — BroadcastChannel `pme-vent/<session>` across
// windows, or a local pair in one page. It deliberately does NOT go through the controller's HostSession (roles,
// auth, samples guard): the ventilator is a device on the host, not a controller. FX-1: the app's own cockpit iframe
// uses `createWindowPort` (window.postMessage) instead of BroadcastChannel.
//   vent → monitor: { kind: 'cmds' }      the linkTick commands of ventilator tick `tick` (frame, shunt, airway);
//                                         the monitor side stamps them `atTick` so bursts replay on their own ticks
//   monitor → vent: { kind: 'lungState' } every lungState event of the engine
//                   { kind: 'clock' }     the ventilator tick it may run up to: the ENGINE is the master clock, the
//                                         ventilator never runs more than MAX_AHEAD_TICKS ahead of the newest engine
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
//                   { kind: 'run' }       Stage 10 (fast-forward): run up to this ventilator tick NOW, not on the wall
//                                         clock — the cockpit steps through the span with the engine
//   either way:     { kind: 'time' }      pause / resume / scale, so both sides stay on one sim time base
//   page → vent:    { kind: 'control' }   settings patch, circuit, profile (the combined page's scripted demos)
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import type { LungStateEvent } from '../lung-input.ts';
import type { ProfileId } from './profiles.ts';

export type LinkMsg =
  | { v: 1; kind: 'cmds'; tick: number; cmds: Command[] }
  | { v: 1; kind: 'lungState'; ev: LungStateEvent }
  | { v: 1; kind: 'clock'; ventTick: number }
  | { v: 1; kind: 'run'; ventTick: number } // Stage 10
  | { v: 1; kind: 'time'; action: 'pause' | 'resume' | 'scale'; value?: number }
  | { v: 1; kind: 'control'; patch?: Partial<VentConfig>; circuit?: 'connected' | 'disconnected'; profile?: ProfileId };

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

/** What `createWindowPort` needs of a window (structurally typed, so a test can pass a fake). */
export interface PortWindow {
  postMessage(data: unknown, targetOrigin: string): void;
  addEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
  removeEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
  location: { origin: string };
}

/**
 * FX-1: a port between a page and the same-origin iframe it embeds, over `window.postMessage` (delivered inside the
 * page, unlike BroadcastChannel, which WebKit routes through another process). On CI's Linux WebKit, BroadcastChannel
 * messages from the app to its own cockpit iframe arrived seconds late or not at all — a speed change never reached
 * the cockpit, and with no `clock` the cockpit stopped at its last limit, so the patient went apnoeic after "Return
 * here". `peer()` is read at every post (an iframe's contentWindow outlives its documents); only messages from `peer()`
 * on this page's origin and this session's channel are taken.
 */
export function createWindowPort(session: string, peer: () => Pick<PortWindow, 'postMessage'> | null | undefined, self: PortWindow = window): LinkPort {
  const ch = linkChannelName(session);
  const fns = new Set<(m: LinkMsg) => void>();
  const onMsg = (e: MessageEvent) => {
    const d = e.data as { ch?: unknown; m?: unknown } | null;
    if (e.origin !== self.location.origin || e.source !== peer() || typeof d !== 'object' || d === null || d.ch !== ch || !isMsg(d.m)) return;
    for (const fn of [...fns]) fn(d.m);
  };
  self.addEventListener('message', onMsg);
  return {
    post: (m) => peer()?.postMessage({ ch, m }, self.location.origin),
    onMessage(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    close() {
      fns.clear();
      self.removeEventListener('message', onMsg);
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
/** Stage 10: a cockpit that has not answered a `run` in this long is given up on (the engine's own drive timeout then
 *  takes over, as when the cockpit is closed), wall ms [ENG]. */
export const RUN_TIMEOUT_MS = 2000;

/** The link's detach function; Stage 10: also `runTo`, the fast-forward's lockstep with the cockpit. */
export type LinkDetach = (() => void) & {
  /**
   * Have the ventilator's frames for every engine tick up to `engTick` dispatched (with their `atTick`) before the
   * engine runs there. Resolves at once when the link has not learnt its offset yet (no cockpit ventilates).
   */
  runTo(engTick: number): Promise<void>;
};

/**
 * Monitor side: dispatch the ventilator's commands on the engine tick that matches the ventilator tick (so a burst
 * of frames from one animation frame, or a ×10 time scale, replays at 50 Hz sim time), forward lungState, apply
 * time messages, and publish the engine's clock. The tick offset is learnt from the first (unstamped) dispatch
 * result — which is the engine's current tick + 1 — and only ever grows by the lateness the engine reports; a
 * ventilator restart (its tick goes backwards) relearns it. Returns a detach function.
 */
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): LinkDetach {
  let offset: number | null = null;
  let learning = false;
  let gen = 0; // Stage V.1: bumped by a ventilator restart; results of commands sent before it are stale
  let lastTick = -1;
  let allowed = -Infinity;
  let engTick = 0;
  let waiter: { ventTick: number; done: () => void } | null = null; // Stage 10: a fast-forward step waits for frames
  const publishClock = () => {
    if (offset === null) return;
    const allow = engTick - offset + MAX_AHEAD_TICKS;
    if (allow >= allowed + 2) {
      allowed = allow;
      port.post({ v: 1, kind: 'clock', ventTick: allow });
    }
  };
  const offPort = port.onMessage((m) => {
    if (m.kind === 'cmds') {
      if (m.tick < lastTick) {
        offset = null;
        allowed = -Infinity;
        learning = false; // Stage V.1: a probe still in flight belongs to the old ventilator — relearn from this one
        gen++;
      }
      lastTick = m.tick;
      const w = waiter !== null && m.tick >= waiter.ventTick ? waiter : null; // Stage 10: released after these dispatches
      for (const c of m.cmds) {
        const at = offset === null ? undefined : m.tick + offset;
        const probe = offset === null && !learning;
        if (probe) learning = true;
        const g = gen;
        // FU-11 (F08): a probe that is refused, throws or rejects frees the next command to probe (before, `learning`
        // stayed true, no offset was ever learnt, no clock was published and the ventilator stalled for good)
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
            publishClock();
          } else if (at !== undefined && r.tick > at) offset = (offset ?? 0) + r.tick - at;
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
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (e.type === 'toneCancel' && e.ids === undefined) {
      // FU-11 (R50 F1): the engine was RESTORED (its restore marker: a toneCancel without ids; a new engine re-attaches
      // instead). The old timeline's offset stamped every later frame in the restored future (50 s late after a 50 s
      // rewind) and no clock was published: the cockpit stopped ventilating the patient while its own screen looked
      // normal. Start a new generation: the next frame probes, the clock is published again from the restored time.
      // (Event times alone cannot tell: a breath or a beat may carry a time seconds before "now".)
      offset = null;
      allowed = -Infinity;
      learning = false;
      gen++;
      engTick = Math.floor(e.after / 0.02 + 1e-6);
      publishClock();
      return;
    }
    if (tk > engTick) {
      engTick = tk;
      publishClock();
    }
    if (e.type === 'lungState') port.post({ v: 1, kind: 'lungState', ev: e });
  });
  const detach = () => {
    offPort();
    offEng();
    waiter?.done();
  };
  return Object.assign(detach, {
    runTo(eng: number): Promise<void> {
      if (offset === null) return Promise.resolve();
      const ventTick = eng - offset;
      if (lastTick >= ventTick) return Promise.resolve();
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
  });
}
