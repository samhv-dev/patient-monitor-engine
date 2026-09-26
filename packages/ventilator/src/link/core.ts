// The transport-agnostic half of the R27 link: what the ventilator side sends every 20 ms tick, and what it does
// with the engine's events. Both the in-process link (in-process.ts) and the window link (port.ts) use it.
//   vent → engine: one `externalDrive` VentFrame per tick (50 Hz, the R27 ceiling); at start the profile's shunt
//                  (or the interim recruitment model's, whenever it moves) and its Stage 7 stand-ins; `applyEvent airway disconnected|patent` when the
//                  circuit is opened/closed at the Y-piece (so EtCO2 goes flat at once, Stage 3 M4).
//   engine → vent: `lungState` → applyLungState (lung-input.ts).
import type { Command, EngineEvent } from '@pme/engine-core';
import { applyLungState, createLungLink, LUNG_KEYS, lungBaseOf, type LungLink } from '../lung-input.ts';
import type { VentConfig } from '../types.ts';
import { toVentFrame } from '../frame.ts';
import { modeName } from '../presets.ts';
import type { VentState } from '../types.ts';
import { createRecruit, stepRecruit, type RecruitState } from './recruit.ts';
import type { LinkProfile } from './profiles.ts';

export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz

export interface LinkCore {
  vs: VentState;
  lung: LungLink;
  profile: LinkProfile;
  recruit: RecruitState | null;
  circuitSent: 'connected' | 'disconnected';
  started: boolean;
  seq: number;
}

export function createLinkCore(vs: VentState, profile: LinkProfile): LinkCore {
  Object.assign(vs.cfg, profile.vent);
  return {
    vs, lung: createLungLink(vs.cfg), profile,
    recruit: profile.recruit ? createRecruit(profile.recruit, vs.cfg.peep) : null,
    circuitSent: 'connected', started: false, seq: 0,
  };
}

const mk = (core: LinkCore, body: Record<string, unknown>): Command => ({ id: `vent-${++core.seq}`, issuedBy: 'ventilator', ...body }) as Command;

/** Commands for the engine after the ventilator has advanced to the current tick. */
export function linkTick(core: LinkCore, dt: number): Command[] {
  const vs = core.vs;
  const out: Command[] = [];
  if (!core.started) { // the profile's fixed shunt and Stage 7 stand-ins, once
    core.started = true;
    if (!core.recruit) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: core.profile.shunt }));
    for (const s of core.profile.standIn) out.push(mk(core, { type: 'setTarget', variable: s.variable, value: s.value, ramp: { durationS: s.rampS } }));
    const cond = core.profile.condition; // Stage 7a: the engine's own circulation condition
    if (cond) out.push(mk(core, { type: 'applyEvent', event: { kind: 'condition', id: cond.id, severity: cond.severity } }));
  }
  if (vs.circuit !== core.circuitSent) {
    core.circuitSent = vs.circuit;
    out.push(mk(core, { type: 'applyEvent', event: { kind: 'airway', state: vs.circuit === 'disconnected' ? 'disconnected' : 'patent' } }));
  }
  out.push(mk(core, { type: 'externalDrive', source: 'ventilator', frame: toVentFrame(vs, modeName(vs.cfg)) }));
  if (core.recruit && core.profile.recruit) {
    const totalPeep = vs.circuit === 'disconnected' ? 0 : vs.cfg.peep + vs.p.measured.autoPEEP;
    const sh = stepRecruit(core.recruit, core.profile.recruit, totalPeep, dt);
    if (sh !== null) out.push(mk(core, { type: 'setTarget', variable: 'shunt', value: sh }));
  }
  return out;
}

/** Engine events the ventilator consumes. */
export function linkEvent(core: LinkCore, ev: EngineEvent): void {
  if (ev.type === 'lungState') applyLungState(core.vs, core.lung, ev);
}

/**
 * Change ventilator settings from outside (a page, a demo, a test). A patch that touches the lung (LUNG_KEYS)
 * also moves the lungState base, or the next lungState would put the old lung back.
 */
export function patchVent(core: LinkCore, patch: Partial<VentConfig>): void {
  Object.assign(core.vs.cfg, patch);
  if (LUNG_KEYS.some((k) => k in patch)) core.lung.base = lungBaseOf(core.vs.cfg);
}
