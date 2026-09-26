// Ventilator side of the window link: runs the ventilator on real time × scale, but never past the tick the
// monitor's `clock` messages allow (the engine is the master clock; before the first clock message it may run
// 2·LEAD_TICKS, enough to send the frame the monitor learns the offset from), posts each tick's commands, and applies lungState / time / control messages. Without a port
// (vent-hamilton.html alone) it free-runs.
// `frame(nowMs)` is called by the page's requestAnimationFrame loop (or by a test with a fake clock).
import { advanceVent, createVent, resetPhysics, setCircuit } from '../vent.ts';
import type { VentState } from '../types.ts';
import { createLinkCore, linkEvent, linkTick, patchVent, LINK_TICK_S, type LinkCore } from './core.ts';
import { LEAD_TICKS, type LinkPort } from './port.ts';
import { PROFILES, type ProfileId } from './profiles.ts';

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
  dispose(): void;
}

export function createVentDriver(port: LinkPort | null, profile: ProfileId = 'normal', vs: VentState = createVent()): VentDriver {
  const prof = (id: ProfileId) => PROFILES[id] ?? (PROFILES.normal as NonNullable<(typeof PROFILES)[string]>);
  let core = createLinkCore(vs, prof(profile));
  let k = Math.round(vs.p.t / LINK_TICK_S);
  let sim = k * LINK_TICK_S;
  let lastMs: number | null = null;
  let allowed = port ? k + 2 * LEAD_TICKS : Infinity;
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
    frame(nowMs: number) {
      const dt = lastMs === null ? 0 : Math.min(0.1, (nowMs - lastMs) / 1000); // v1.9: clamp long frames
      lastMs = nowMs;
      if (d.paused) return;
      sim = Math.min(sim + dt * d.scale, allowed * LINK_TICK_S);
      while ((k + 1) * LINK_TICK_S <= sim + 1e-9) {
        k++;
        advanceVent(vs, k * LINK_TICK_S, d.onStep);
        const cmds = linkTick(core, LINK_TICK_S);
        port?.post({ v: 1, kind: 'cmds', tick: k, cmds });
      }
    },
    setProfile(id: ProfileId) {
      core = createLinkCore(vs, prof(id));
      resetPhysics(vs);
    },
    dispose: () => off?.(),
  };
  const off = port?.onMessage((m) => {
    if (m.kind === 'lungState') linkEvent(core, m.ev);
    else if (m.kind === 'clock') allowed = Math.max(allowed, m.ventTick);
    else if (m.kind === 'time') {
      if (m.action === 'pause') d.paused = true;
      else if (m.action === 'resume') d.paused = false;
      else if (m.value !== undefined) d.scale = m.value;
    } else if (m.kind === 'control') {
      if (m.profile) d.setProfile(m.profile);
      if (m.patch) patchVent(core, m.patch);
      if (m.circuit) setCircuit(vs, m.circuit);
      d.onControl?.();
    }
  });
  return d;
}
