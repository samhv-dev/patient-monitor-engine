// The window link (R27 second transport): the ventilator in its own window/iframe, the monitor elsewhere in the
// same browser. A tiny versioned message set over a `LinkPort` — BroadcastChannel `pme-vent/<session>` across
// windows, or a local pair in one page. It deliberately does NOT go through the controller's HostSession (roles,
// auth, samples guard): the ventilator is a device on the host, not a controller.
//   vent → monitor: { kind: 'cmds' }      the linkTick commands of ventilator tick `tick` (frame, shunt, airway);
//                                         the monitor side stamps them `atTick` so bursts replay on their own ticks
//   monitor → vent: { kind: 'lungState' } every lungState event of the engine
//                   { kind: 'clock' }     the ventilator tick it may run up to: the ENGINE is the master clock, the
//                                         ventilator never runs more than MAX_AHEAD_TICKS ahead of the newest engine
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
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

/**
 * Monitor side: dispatch the ventilator's commands on the engine tick that matches the ventilator tick (so a burst
 * of frames from one animation frame, or a ×10 time scale, replays at 50 Hz sim time), forward lungState, apply
 * time messages, and publish the engine's clock. The tick offset is learnt from the first (unstamped) dispatch
 * result — which is the engine's current tick + 1 — and only ever grows by the lateness the engine reports; a
 * ventilator restart (its tick goes backwards) relearns it. Returns a detach function.
 */
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): () => void {
  let offset: number | null = null;
  let learning = false;
  let lastTick = -1;
  let allowed = -Infinity;
  let engTick = 0;
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
      }
      lastTick = m.tick;
      for (const c of m.cmds) {
        const at = offset === null ? undefined : m.tick + offset;
        const probe = offset === null && !learning;
        if (probe) learning = true;
        void Promise.resolve(mon.dispatch(at === undefined ? c : { ...c, atTick: at })).then((r) => {
          if (!r.accepted) onRejected(c, r.reason);
          else if (probe) {
            offset = r.tick - m.tick + LEAD_TICKS;
            learning = false;
            engTick = Math.max(engTick, r.tick - 1);
            publishClock();
          } else if (at !== undefined && r.tick > at) offset = (offset ?? 0) + r.tick - at;
        });
      }
    } else if (m.kind === 'time') {
      if (m.action === 'pause') mon.pause?.();
      else if (m.action === 'resume') mon.resume?.();
      else if (m.value !== undefined) mon.setTimeScale?.(m.value);
    }
  });
  const offEng = mon.on((e) => {
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (tk > engTick) {
      engTick = tk;
      publishClock();
    }
    if (e.type === 'lungState') port.post({ v: 1, kind: 'lungState', ev: e });
  });
  return () => {
    offPort();
    offEng();
  };
}
