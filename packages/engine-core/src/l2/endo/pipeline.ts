// The endocrine pipeline: the per-pass endocrine/thermal work the engine calls after the blood's `advanceBlood`
// (order: pk → resp/lung → blood → endo → organs → hemo). Every pass: observe the drug model's accepted doses and hand
// its dantrolene effect to the heat model. 1 Hz steps on the temperature grid: read the inputs through adapters.ts,
// step the endocrine core, write the thermal inputs (endocrine heat, fever set point) and emit the `endo` event.
// Commands: `stimulus` (the one shape; the neuro model observes it), `meal`, `thermal7e` and the endocrine `condition`
// ids. The endocrine model owns NO drug ids. Everything is plain JSON-safe data.
import type { L1State } from '../../l1/state.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import type { EndoClinicalEvent } from '../../types-endo.ts';
import { VAGAL_SITES } from '../../types-neuro.ts'; // The stimulus's optional vagal site
import type { HemoState } from '../hemo/pipeline.ts';
import type { RespState } from '../resp/pipeline.ts';
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
import { mhFromExposure, type MhExposure, type MhOwner } from '../thermal/mh.ts';
import { observeDoses, pkOf, readEndoInputs, readInfusions } from './adapters.ts';
import { SEPSIS_PHASES } from './conditions.ts';
import { createEndoCore, DEFAULT_ENDO_PROFILE, stepEndoCore, type EndoCore, type EndoProfile } from './core.ts';
import { meal } from './glucose.ts';

/** The cascade before the first 1 Hz step (every factor neutral). */
const NEUTRAL_CASCADE: Cascade = { hrF: 1, clearanceF: 1, macF: 1, coagF: 1, stage: 0, shiverLevel: 0 };

export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;
  ageY: number; // Written into the heat model's `ageY` (the thresholds fall with age; the resp pipeline owns `resp`)
  ecg: { tempC: number; shiver: number }; // last values pushed as ECG modifier deltas
  kfMult: number; // Last capillary-leak multiplier written into the blood model
  lungSev: number; // Last lung anaphylaxis severity written
  cascade: Cascade; // cascade(th) at the last 1 Hz step: the neuro model reads endo.cascade.macF
  mhOwner?: MhOwner; // Who made the MH state once an exposure was seen (absent = no exposure yet)
  out: EngineEvent[];
}

export interface EndoCtx {
  l1: L1State;
  hemo: HemoState;
  resp: RespState;
  ps: object; // the engine's PipelineState (duck-typed reads of `pk`, `blood`, `organs`, `neuro`)
}

export function resolveEndoProfile(profile: PatientProfile | undefined): EndoProfile {
  const e = (profile as { endo?: Partial<EndoProfile> } | undefined)?.endo ?? {};
  return { ...DEFAULT_ENDO_PROFILE, ...e };
}

export function createEndoState(profile: PatientProfile | undefined, weightKg: number): EndoState {
  return {
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ageY: profile?.ageY ?? 40, ecg: { tempC: 0, shiver: 0 },
    kfMult: 1, lungSev: 0, cascade: { ...NEUTRAL_CASCADE }, out: [],
  };
}

/** Advance to time tEnd (s): this pass's drug doses at once, then the 1 Hz steps. */
export function advanceEndo(es: EndoState, ctx: EndoCtx, tEnd: number): void {
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  th.ageY = es.ageY; // The patient's age reaches the thermoregulatory thresholds (the resp pipeline creates the state)
  observeDoses(es, pk);
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // The drug model's dantrolene effect → the MH suppression (thermal/mh.ts)
  // An MH-susceptible patient's triggers (the neuro model's exposure times) start the MH state the endocrine model owns
  const mhx = (ctx.ps as { neuro?: { mhExposure?: MhExposure } }).neuro?.mhExposure;
  if (mhx) {
    const r = mhFromExposure(th.mh, mhx, es.mhOwner, tEnd);
    th.mh = r.mh;
    es.mhOwner = r.owner;
  }
  for (; es.k <= tEnd + 1e-9; es.k++) {
    const t = es.k;
    readInfusions(es, pk);
    stepEndoCore(es.core, readEndoInputs(ctx, es, t), 1);
    const o = es.core.out;
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.feverShift = o.setShiftC;
    es.cascade = cascade(th); // The neuro model's hypothermic MAC reduction reads macF
    es.out.push({
      type: 'endo', t,
      glucoseMgDl: Math.round(o.glucoseMgDl), glucoseMmolL: Math.round(o.glucoseMmol * 10) / 10,
      insulinUuMl: Math.round(o.insulinUuMl * 10) / 10, epinephrinePgMl: Math.round(o.epiPgMl),
      norepinephrinePgMl: Math.round(o.nePgMl), cortisolNmolL: Math.round(o.cortisolNmolL), stressIndex: o.stressIndex,
      mhActivity: Math.round(thermalMetabolic(th, t).mhActivity * 100) / 100,
      shivering: th.out.shiverW > 1, sweating: th.out.sweatW > 1, vasoconstricted: th.out.vasoF < 0.5,
      tempPeriphC: Math.round(th.tp * 10) / 10,
    });
  }
}

const range = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;
const ENDO_CONDITIONS = ['sepsis', 'anaphylaxis', 'sirs', 'hypermetabolic', 'thyroidStorm'];

/** Validation hook: a reason, undefined (accepted) or null (not an endocrine command). Runs BEFORE the resp hook. */
export function validateEndoCommand(cmd: Command): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as EndoClinicalEvent | { kind: string; id?: string };
  switch (ev.kind) {
    case 'stimulus': {
      const i = (ev as { intensity?: number }).intensity;
      const site = (ev as { site?: string }).site; // The optional vagal site (the circulation observes it)
      if (site !== undefined && !(VAGAL_SITES as readonly string[]).includes(site)) return `site must be ${VAGAL_SITES.join(', ')}`;
      return i === undefined ? 'intensity is required' : range('intensity', i, 0, 2);
    }
    case 'meal': {
      // The amount is required (an empty meal was accepted and its undefined grams poisoned the gut model)
      const g = (ev as { carbohydrateG?: number }).carbohydrateG;
      return g === undefined ? 'carbohydrateG is required' : range('carbohydrateG', g, 0, 300);
    }
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      if (e.exposure !== undefined && !['draped', 'exposed', 'prep'].includes(e.exposure)) return 'exposure must be draped, exposed or prep';
      return range('airSpeedMs', e.airSpeedMs, 0, 2);
    }
    case 'condition': {
      const c = ev as { id: string; severity?: number; phase?: string; rampS?: number };
      if (!ENDO_CONDITIONS.includes(c.id)) return null; // resp (mh), the circulation, the blood (burns, dka) …
      if (c.phase !== undefined && !(typeof c.phase === 'string' && Object.hasOwn(SEPSIS_PHASES, c.phase))) return 'phase must be sirs, sepsis, warm or cold';
      return range('severity', c.severity, 0, 1) ?? range('rampS', c.rampS, 10, 7200) ?? (c.severity === undefined ? 'severity is required' : undefined);
    }
    default:
      return null;
  }
}

/** Apply hook: true when the command was an endocrine command. */
export function applyEndoCommand(es: EndoState, rs: RespState, cmd: Command, t: number): boolean {
  void t;
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as EndoClinicalEvent | { kind: string };
  const c = es.core;
  switch (ev.kind) {
    case 'stimulus':
      es.noxious = (ev as { intensity: number }).intensity;
      return true;
    case 'meal':
      meal(c.glucose, (ev as { carbohydrateG: number }).carbohydrateG);
      return true;
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      const th = rs.temp;
      if (e.exposure !== undefined) th.exposure = e.exposure;
      if (e.airSpeedMs !== undefined) th.airMs = e.airSpeedMs;
      if (e.fluidWarmer !== undefined) th.fluidWarmer = e.fluidWarmer;
      if (e.hme !== undefined) th.vent = { ...th.vent, hme: e.hme };
      return true;
    }
    case 'condition': {
      const k = ev as { id: string; severity: number; phase?: keyof typeof SEPSIS_PHASES; rampS?: number };
      if (k.id === 'sepsis') {
        c.cond.sepsis.target = SEPSIS_PHASES[k.phase ?? 'warm'] * k.severity;
        c.cond.sepsis.tauS = k.rampS ?? 600;
      } else if (k.id === 'anaphylaxis') c.cond.anaph.target = k.severity;
      else if (k.id === 'sirs') c.cond.sirs.target = k.severity;
      else if (k.id === 'hypermetabolic') c.cond.hypermet.target = k.severity;
      else if (k.id === 'thyroidStorm') c.cond.storm.target = k.severity;
      else return false;
      return true;
    }
    default:
      return false;
  }
}
