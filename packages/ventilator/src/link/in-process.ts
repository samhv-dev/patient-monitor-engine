// In-process link: the ventilator and the patient engine in ONE loop on ONE sim clock (lockstep, deterministic).
// Each 20 ms tick: ventilator to t → its commands dispatched → engine.advanceTo(t) → the engine's events reach
// the ventilator before its next step. Used by the tests and by pages that host both (vent-link.html's headless
// mode); a page with a worker-hosted monitor uses port.ts instead.
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { advanceVent, createVent } from '../vent.ts';
import type { VentConfig, VentState } from '../types.ts';
import { createLinkCore, linkEvent, linkTick, patchVent, LINK_TICK_S, type LinkCore } from './core.ts';
import { PROFILES, type ProfileId } from './profiles.ts';

export interface LinkedSim {
  engine: MonitorEngine;
  vs: VentState;
  core: LinkCore;
  /** Every engine event, in order. */
  events: EngineEvent[];
  /** Change ventilator settings (patchVent). */
  set(patch: Partial<VentConfig>): void;
  /** Dispatch an engine command now (a demo's engine step). */
  send(body: Record<string, unknown>): void;
  /** Advance both to sim time t (whole 20 ms ticks). */
  advanceTo(t: number): void;
  now(): number;
}

export function createLinkedSim(opts: { profile?: ProfileId; seed?: number; vent?: Partial<VentConfig> } = {}): LinkedSim {
  const profile = PROFILES[opts.profile ?? 'normal'];
  if (!profile) throw new Error(`unknown profile ${opts.profile}`);
  const engine = createEngine({ seed: opts.seed ?? 7, patient: profile.patient });
  const vs = createVent();
  const core = createLinkCore(vs, profile);
  patchVent(core, opts.vent ?? {});
  const events: EngineEvent[] = [];
  const pending: EngineEvent[] = [];
  engine.on((e) => {
    events.push(e);
    if (e.type === 'lungState') pending.push(e);
  });
  let k = 0;
  let n = 0;
  const send = (cmds: Command[]) => {
    for (const c of cmds) {
      const r = engine.dispatch(c);
      if (!r.accepted) throw new Error(`link command rejected: ${r.reason}`);
    }
  };
  // a sedated, ventilated patient: GA thermal/metabolic state, and the drive owns breathing from t = 0
  send([{ id: 'vent-ga', issuedBy: 'ventilator', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } } as Command]);
  send(linkTick(core, 0));
  const sim: LinkedSim = {
    engine, vs, core, events,
    set: (patch) => patchVent(core, patch),
    send: (body) => send([{ id: `page-${++n}`, issuedBy: 'page', ...body } as Command]),
    advanceTo(t: number) {
      while ((k + 1) * LINK_TICK_S <= t + 1e-9) {
        k++;
        const tk = k * LINK_TICK_S;
        while (pending.length) linkEvent(core, pending.shift() as EngineEvent);
        advanceVent(vs, tk);
        send(linkTick(core, LINK_TICK_S));
        engine.advanceTo(tk);
      }
    },
    now: () => k * LINK_TICK_S,
  };
  return sim;
}
