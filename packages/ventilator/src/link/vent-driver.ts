// Ventilator side of the window link: runs the ventilator on real time × scale, but never past the tick the
// monitor's `clock` messages allow (the engine is the master clock; before the first clock message it may run
// 2·LEAD_TICKS, enough to send the frame the monitor learns the offset from), posts each tick's commands, and applies lungState / time / control messages. Without a port
// (vent-hamilton.html alone) it free-runs.
// `frame(nowMs)` is called by the page's requestAnimationFrame loop (or by a test with a fake clock).
import { decodeState, encodeState } from '@pme/engine-core';
import { advanceVent, createVent, resetPhysics, setCircuit } from '../vent.ts';
import type { VentState } from '../types.ts';
import { createLinkCore, linkEvent, linkTick, patchVent, LINK_TICK_S, type LinkCore } from './core.ts';
import { LEAD_TICKS, type LinkPort } from './port.ts';
import type { CockpitSettings } from './relay-port.ts';
import { PROFILES, type ProfileId } from './profiles.ts';

/**
 * FX-1: the longest animation frame a LINKED ventilator counts in full (wall s). Free-running it keeps v1.9's 0.1 s; linked,
 * the engine's `clock` already bounds it (never more than MAX_AHEAD_TICKS ahead), and 0.1 s made a cockpit drawn at
 * ≈ 5 frames/s (CI's Linux WebKit: 200–280 ms apart) run at half the session's speed — at ×4 it breathed for the patient
 * at ×2, every frame late. Frames ≤ 0.1 s apart (any normal screen) step exactly as before.
 */
export const LINKED_MAX_FRAME_S = 0.5;

/**
 * Everything the ventilator holds that decides its next frames, JSON-safe (`body` is engine-core's snapshot codec): what a
 * bookmark keeps of it, so that a restore returns the ventilator with the patient. `face` is the front end's id (a state
 * is loaded only by the face that saved it); `tick` the ventilator tick it was taken after.
 */
export interface VentSnapshot {
  v: 1;
  face: string | null;
  tick: number;
  body: unknown;
}

/** What a front end adds to the snapshot: its own state that changes what the ventilator does or signals. `load` is
 *  also its moment to show the loaded settings. */
export interface VentExtension {
  face: string;
  save(): unknown;
  load(x: unknown): void;
}

interface Body {
  profile: ProfileId;
  sim: number;
  vs: VentState;
  core: Omit<LinkCore, 'vs' | 'profile'>;
  ext?: unknown;
}

/** The settings a snapshot holds, and what it last measured (a hand-over's input), or null when it is not one. */
export function snapshotSettings(s: VentSnapshot): CockpitSettings | null {
  if (s?.v !== 1) return null;
  const vs = (decodeState(s.body) as Body).vs;
  return { cfg: vs.cfg, measured: { RR: vs.p.measured.RR, VTE: vs.p.measured.VTE } };
}

/** Copy `src` into `dst` in place (the front ends hold references to the ventilator's objects). */
const refill = (dst: object, src: object) => {
  for (const k of Object.keys(dst)) if (!(k in src)) delete (dst as Record<string, unknown>)[k];
  Object.assign(dst, src);
};

export interface VentDriver {
  vs: VentState;
  core: LinkCore;
  /** Sim time of the ventilator (s). */
  simT(): number;
  frame(nowMs: number): void;
  setProfile(id: ProfileId): void;
  paused: boolean;
  scale: number;
  /** Called after every 5 ms step (the front end's 200 Hz sample buffers). */
  onStep: ((vs: VentState) => void) | undefined;
  /** Called after a `control` message changed settings (the front end redraws its knobs and sheets). */
  onControl: (() => void) | undefined;
  /** The front end's part of the snapshot. */
  ext: VentExtension | undefined;
  snapshot(): VentSnapshot;
  /** False (nothing changed) when the snapshot is not one this driver and its front end can load. */
  load(s: VentSnapshot): boolean;
  dispose(): void;
}

export function createVentDriver(port: LinkPort | null, profile: ProfileId = 'normal', vs: VentState = createVent()): VentDriver {
  const prof = (id: ProfileId) => PROFILES[id] ?? (PROFILES.normal as NonNullable<(typeof PROFILES)[string]>);
  let profileId = profile;
  let core = createLinkCore(vs, prof(profile));
  let k = Math.round(vs.p.t / LINK_TICK_S);
  let sim = k * LINK_TICK_S;
  let lastMs: number | null = null;
  let allowed = port ? k + 2 * LEAD_TICKS : Infinity;
  /** The restore this ventilator last took (its `epoch`): every message of its own carries it. */
  let epoch = '';
  let reported = '';
  let quietTo = -1; // ticks made again after a restore: the restored engine has their frames

  /** Run the ventilator tick by tick up to sim time `to`, posting each tick's commands. */
  const runTo = (to: number) => {
    while ((k + 1) * LINK_TICK_S <= to + 1e-9) {
      k++;
      advanceVent(vs, k * LINK_TICK_S, d.onStep);
      const cmds = linkTick(core, LINK_TICK_S);
      if (k > quietTo) port?.post({ v: 1, kind: 'cmds', tick: k, cmds, epoch });
    }
  };
  /** Its state goes to the monitor whenever it changed (a tick, a knob, a lungState), after the frames it follows. */
  const report = () => {
    if (!port) return;
    const state = d.snapshot();
    const json = JSON.stringify(state);
    if (json === reported) return;
    reported = json;
    port.post({ v: 1, kind: 'state', tick: k, epoch, state });
  };
  const d: VentDriver = {
    vs,
    get core() {
      return core;
    },
    simT: () => sim,
    paused: false,
    scale: 1,
    onStep: undefined,
    onControl: undefined,
    ext: undefined,
    frame(nowMs: number) {
      const dt = lastMs === null ? 0 : Math.min(port ? LINKED_MAX_FRAME_S : 0.1, (nowMs - lastMs) / 1000); // v1.9: clamp long frames
      lastMs = nowMs;
      if (!d.paused) {
        sim = Math.min(sim + dt * d.scale, allowed * LINK_TICK_S);
        runTo(sim);
      }
      report();
    },
    setProfile(id: ProfileId) {
      profileId = id;
      core = createLinkCore(vs, prof(id));
      resetPhysics(vs);
    },
    snapshot() {
      const { vs: _vs, profile: _p, ...rest } = core;
      const body: Body = { profile: profileId, sim, vs, core: rest, ...(d.ext ? { ext: d.ext.save() } : {}) };
      return { v: 1, face: d.ext?.face ?? null, tick: k, body: encodeState(body) };
    },
    load(s: VentSnapshot) {
      if (s?.v !== 1 || s.face !== (d.ext?.face ?? null)) return false;
      const b = decodeState(s.body) as Body;
      refill(vs.cfg, b.vs.cfg);
      refill(vs.p, b.vs.p);
      refill(vs, { ...b.vs, cfg: vs.cfg, p: vs.p });
      profileId = b.profile;
      core = { vs, profile: prof(b.profile), ...b.core };
      k = s.tick;
      sim = b.sim;
      if (d.ext && b.ext !== undefined) d.ext.load(b.ext);
      return true;
    },
    dispose: () => off?.(),
  };
  const off = port?.onMessage((m) => {
    if (m.kind === 'lungState') linkEvent(core, m.ev);
    else if (m.kind === 'clock') allowed = Math.max(allowed, m.ventTick);
    else if (m.kind === 'run') {
      // The engine is about to run past these ticks — produce their frames now, not on the wall clock (fast-forward)
      allowed = Math.max(allowed, m.ventTick);
      runTo(m.ventTick * LINK_TICK_S);
      sim = Math.max(sim, k * LINK_TICK_S);
    }
    else if (m.kind === 'time') {
      if (m.action === 'pause') d.paused = true;
      else if (m.action === 'resume') {
        // A resume links the cockpit to a monitor again (CockpitDesk: after a hand-over, a new link that learns its tick
        // offset from the next frame). Paused at its clock limit it would send none, so the new link could publish no
        // clock: as before its first clock, it may run 2·LEAD_TICKS past its own tick, enough for that frame.
        d.paused = false;
        allowed = Math.max(allowed, k + 2 * LEAD_TICKS);
      }
      else if (m.value !== undefined) d.scale = m.value;
    } else if (m.kind === 'control') {
      if (m.profile) d.setProfile(m.profile);
      if (m.patch) patchVent(core, m.patch);
      if (m.circuit) setCircuit(vs, m.circuit);
      d.onControl?.();
    } else if (m.kind === 'restore') {
      // The engine went back to a bookmark that holds this ventilator's state. The answer comes in any case, loaded or not,
      // so the monitor never waits on a ventilator that cannot take it.
      if (m.epoch === epoch) return;
      epoch = m.epoch;
      const loaded = d.load(m.state);
      if (loaded) {
        allowed = m.allowed;
        if (m.lung) linkEvent(core, m.lung); // applied again: a lungState is absolute, and one may have come after the state
        quietTo = m.upTo;
        runTo(m.upTo * LINK_TICK_S);
        sim = Math.max(sim, k * LINK_TICK_S);
        reported = '';
      }
      port?.post({ v: 1, kind: 'restored', epoch, loaded });
      report();
    }
  });
  return d;
}
