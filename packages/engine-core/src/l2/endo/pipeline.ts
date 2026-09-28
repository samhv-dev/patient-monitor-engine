// Stage 7e pipeline: the per-pass endocrine/thermal work the engine calls after 7c's `advanceBlood` (R51 addendum 14
// order: pk → resp/lung → blood → endo → organs → hemo). Every pass: observe 7g's accepted doses and hand 7g's
// dantrolene effect to the heat model. 1 Hz steps on Stage 3's temperature grid: read the inputs through adapters.ts,
// step the endocrine core, write the thermal inputs (endocrine heat, fever set point) and emit the `endo` event.
// Commands: `stimulus` (R51 addendum 12: the one shape; 7f observes it), `meal`, `thermal7e` and the 7e `condition`
// ids. 7e owns NO drug ids (R51 §3). Everything is plain JSON-safe data.
import type { L1State } from '../../l1/state.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import type { EndoClinicalEvent } from '../../types-endo.ts';
import { VAGAL_SITES } from '../../types-neuro.ts'; // FU-4 G7: the stimulus's optional vagal site
import type { HemoState } from '../hemo/pipeline.ts';
import type { RespState } from '../resp/pipeline.ts';
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
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
  ecg: { tempC: number; shiver: number }; // last values pushed as ECG modifier deltas
  kfMult: number; // last capillary-leak multiplier written into 7c
  lungSev: number; // last 7b anaphylaxis severity written
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
  out: EngineEvent[];
}

export interface EndoCtx {
  l1: L1State;
  hemo: HemoState;
  resp: RespState;
  ps: object; // the engine's PipelineState (duck-typed reads of 7g `pk`, 7c `blood`, 7d `organs`, 7f `neuro`)
}

export function resolveEndoProfile(profile: PatientProfile | undefined): EndoProfile {
  const e = (profile as { endo?: Partial<EndoProfile> } | undefined)?.endo ?? {};
  return { ...DEFAULT_ENDO_PROFILE, ...e };
}

export function createEndoState(profile: PatientProfile | undefined, weightKg: number): EndoState {
  return {
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ecg: { tempC: 0, shiver: 0 },
    kfMult: 1, lungSev: 0, cascade: { ...NEUTRAL_CASCADE }, out: [],
  };
}

/** Advance to time tEnd (s): this pass's 7g doses at once, then the 1 Hz steps. */
export function advanceEndo(es: EndoState, ctx: EndoCtx, tEnd: number): void {
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  observeDoses(es, pk);
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
  for (; es.k <= tEnd + 1e-9; es.k++) {
    const t = es.k;
    readInfusions(es, pk);
    stepEndoCore(es.core, readEndoInputs(ctx, es, t), 1);
    const o = es.core.out;
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.feverShift = o.setShiftC;
    es.cascade = cascade(th); // R-7f-8: 7f's hypothermic MAC reduction reads macF
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

/** Validation hook: a reason, undefined (accepted) or null (not a Stage 7e command). Runs BEFORE Stage 3's. */
export function validateEndoCommand(cmd: Command): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as EndoClinicalEvent | { kind: string; id?: string };
  switch (ev.kind) {
    case 'stimulus': {
      const i = (ev as { intensity?: number }).intensity;
      const site = (ev as { site?: string }).site; // FU-4 G7: the optional vagal site (7a observes it)
      if (site !== undefined && !(VAGAL_SITES as readonly string[]).includes(site)) return `site must be ${VAGAL_SITES.join(', ')}`;
      return i === undefined ? 'intensity is required' : range('intensity', i, 0, 2);
    }
    case 'meal':
      return range('carbohydrateG', (ev as { carbohydrateG: number }).carbohydrateG, 0, 300);
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      if (e.exposure !== undefined && !['draped', 'exposed', 'prep'].includes(e.exposure)) return 'exposure must be draped, exposed or prep';
      return range('airSpeedMs', e.airSpeedMs, 0, 2);
    }
    case 'condition': {
      const c = ev as { id: string; severity?: number; phase?: string; rampS?: number };
      if (!ENDO_CONDITIONS.includes(c.id)) return null; // Stage 3 (mh), 7a, 7c (burns, dka) …
      if (c.phase !== undefined && !(c.phase in SEPSIS_PHASES)) return 'phase must be sirs, sepsis, warm or cold';
      return range('severity', c.severity, 0, 1) ?? range('rampS', c.rampS, 10, 7200) ?? (c.severity === undefined ? 'severity is required' : undefined);
    }
    default:
      return null;
  }
}

/** Apply hook: true when the command was a Stage 7e command. */
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
