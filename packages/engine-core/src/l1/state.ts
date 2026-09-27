// L1 patient truth, MANUAL mode (brief §4.9): the shared PatientState schema, instructor targets with
// ramps (linear / exp / sigmoid, delay, mid-ramp retarget from the CURRENT value), control flags and
// pin / release. 'hr' keeps living in the engine's Stage 1 ramp; every other StateVar lives here.
// All state is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import type { ControlFlag } from '../types-hemo.ts';
import type { PatientProfile, Ramp, StateVar } from '../types.ts';
import { constantRamp, rampValue, retarget, type RampState } from './ramp.ts';

export interface VarSpec {
  /** Default adult value (brief §4.9 ranges; research 03 §2, §3.2). */
  def: number;
  min: number;
  max: number;
  /** Build stage whose generators consume the variable; setTarget is accepted from this stage on. */
  stage: 2 | 3 | 4 | 5 | 7;
  /** MANUAL role (brief §4.9 table): instructor target, or derived by a coupling rule. */
  manual: 'target' | 'derived';
}

/** Brief §4.9 shared state schema. Units: bpm, mmHg, %, /min, mL, fraction, °C, mEq/L, ms, mA. */
export const STATE_SCHEMA: Readonly<Record<StateVar, VarSpec>> = {
  hr: { def: 75, min: 0, max: 300, stage: 2, manual: 'target' },
  sbp: { def: 120, min: 0, max: 300, stage: 2, manual: 'target' },
  dbp: { def: 80, min: 0, max: 300, stage: 2, manual: 'target' },
  cvp: { def: 6, min: -5, max: 40, stage: 2, manual: 'target' }, // normal mean 2–8 [03 §2.9]
  papSys: { def: 24, min: 0, max: 120, stage: 2, manual: 'target' }, // 15–30 [03 §2.10]
  papDia: { def: 10, min: 0, max: 60, stage: 2, manual: 'target' }, // 4–12 [03 §2.10]
  pawp: { def: 9, min: 0, max: 40, stage: 2, manual: 'target' }, // 6–12 [03 §2.10]
  spo2: { def: 97, min: 0, max: 100, stage: 3, manual: 'target' },
  pi: { def: 2, min: 0.02, max: 20, stage: 2, manual: 'target' }, // adult median 1.4–1.7, range 0.3–10 [03 §3.2]
  rr: { def: 15, min: 0, max: 80, stage: 3, manual: 'target' },
  vt: { def: 500, min: 0, max: 1500, stage: 3, manual: 'target' },
  etco2: { def: 36, min: 0, max: 150, stage: 3, manual: 'target' },
  fio2: { def: 0.21, min: 0.21, max: 1, stage: 3, manual: 'target' },
  shunt: { def: 0.03, min: 0, max: 0.5, stage: 3, manual: 'target' },
  tempCore: { def: 36.8, min: 25, max: 43, stage: 3, manual: 'target' },
  contractility: { def: 1, min: 0.1, max: 2, stage: 2, manual: 'target' },
  svr: { def: 1.05, min: 0.3, max: 3, stage: 2, manual: 'derived' }, // derived by the M2 tracker in MANUAL
  k: { def: 4.2, min: 2, max: 9, stage: 5, manual: 'target' },
  qtc: { def: 400, min: 300, max: 650, stage: 5, manual: 'target' },
  volumeStatus: { def: 1, min: 0, max: 1, stage: 2, manual: 'target' }, // 1 = normovolaemic, 0 = severe hypovolaemia
  paceThresholdMa: { def: 70, min: 10, max: 200, stage: 4, manual: 'target' }, // R39-4: adult TCP threshold 70 mA (patients 40–120)
};

export const STATE_VARS = Object.keys(STATE_SCHEMA) as StateVar[];
/** Stage 3: how far a coupled truth may sit from its target before the 'override' flag shows. */
const overrideTol = (v: StateVar): number => (v === 'fio2' || v === 'shunt' ? 0.01 : v === 'volumeStatus' ? 0.02 : 0.5);
export type L1Var = Exclude<StateVar, 'hr'>;

export interface L1State {
  mode: 'manual' | 'modeled'; // Stage 7a (Task 15 switches it)
  vars: Record<L1Var, RampState>;
  pinned: StateVar[];
  /** Stage 3: coupled truths (coupling rules and the gas/temperature models); absent → the ramp is the truth. */
  coupled?: Partial<Record<L1Var, number>>;
}

export function createL1State(profile?: PatientProfile): L1State {
  const vars = {} as Record<L1Var, RampState>;
  for (const v of STATE_VARS) {
    if (v === 'hr') continue;
    const b = profile?.baseline?.[v];
    vars[v] = constantRamp(b ?? STATE_SCHEMA[v].def);
  }
  return { mode: 'manual', vars, pinned: [] };
}

/** Truth of an L1 variable at time t (sim seconds): the coupled truth when a coupling rule sets one (Stage 3). */
export function l1Value(st: L1State, v: L1Var, t: number): number {
  const c = st.coupled?.[v];
  return c !== undefined ? c : rampValue(st.vars[v], t);
}

/** Stage 3: the instructor's target (ramp) itself, ignoring couplings. */
export function l1Target(st: L1State, v: L1Var, t: number): number {
  return rampValue(st.vars[v], t);
}

/** True while a ramp is still moving at time t (brief §4.9 'ramping' flag). */
export function isRamping(r: RampState, t: number): boolean {
  return r.durationS > 0 && r.from !== r.to && t < r.t0 + r.delayS + r.durationS;
}

/** Validation for setTarget / pin (brief §4.9 ranges). Returns a reason, or undefined when accepted. */
export function validateTarget(variable: StateVar, value: number | undefined, ramp: Ramp | undefined): string | undefined {
  const spec = STATE_SCHEMA[variable];
  if (!spec) return `unknown state variable ${String(variable)}`;
  if (spec.stage > 3) return `${variable} is not implemented until Stage ${spec.stage}`;
  if (spec.manual === 'derived') return `${variable} is derived in MANUAL mode (coupling rule M2)`;
  if (value !== undefined && (!Number.isFinite(value) || value < spec.min || value > spec.max)) {
    return `${variable} must be ${spec.min}–${spec.max}`;
  }
  if (ramp && !(ramp.durationS >= 0 && ramp.durationS <= 900)) return 'ramp.durationS must be 0–900 s';
  if (ramp && ramp.delayS !== undefined && !(ramp.delayS >= 0)) return 'ramp.delayS must be ≥ 0';
  return undefined;
}

/** setTarget (and pin in MANUAL): a new ramp from the current value (brief §4.9 ramp semantics). */
export function setL1Target(st: L1State, v: L1Var, t: number, value: number, ramp?: Ramp): void {
  st.vars[v] = retarget(st.vars[v], t, value, ramp);
}

/** MANUAL pin: the variable is instructor-owned anyway, so pin = optional retarget + the 'pinned' flag. */
export function pinVar(st: L1State, v: StateVar): void {
  if (!st.pinned.includes(v)) st.pinned.push(v);
}

/** MANUAL release: drops the 'pinned' flag and keeps the value (MODELED blends to the model, Stage 7). */
export function releaseVar(st: L1State, v: StateVar | 'all'): void {
  st.pinned = v === 'all' ? [] : st.pinned.filter((x) => x !== v);
}

/**
 * Control flags for the 1 Hz 'state' event (brief §4.9 "Control flags"): override (set by coupling rules)
 * wins over pinned, which wins over ramping.
 */
export function l1Flags(
  st: L1State,
  t: number,
  hrRamp: RampState,
  overrides: readonly StateVar[],
): Partial<Record<StateVar, ControlFlag>> {
  const out: Partial<Record<StateVar, ControlFlag>> = {};
  for (const v of STATE_VARS) {
    const r = v === 'hr' ? hrRamp : st.vars[v];
    const c = v === 'hr' ? undefined : st.coupled?.[v]; // Stage 3: a coupled truth away from its target
    if (overrides.includes(v) || (c !== undefined && Math.abs(c - rampValue(r, t)) > overrideTol(v))) out[v] = 'override';
    else if (st.pinned.includes(v)) out[v] = 'pinned';
    else if (isRamping(r, t)) out[v] = 'ramping';
  }
  return out;
}
