// System-level conditions (tables §5e; R32 lists them under 7f — 7e implements them and 7f SHARES this interface,
// see "Requests"). Each condition is a bundle of multipliers interpolated from the tables' columns by a CONTINUOUS
// stage/grade, smoothed with its own onset τ so a scenario step produces a physiological transition. The engine never
// hard-codes a trajectory: the scenario sets the target (tables §5e header). Pure data + a 1 Hz smoothing step.
//   sepsis        stage 0 none · 1 SIRS · 2 sepsis · 3 septic shock warm · 4 septic shock cold (τ = rampS, default 600 s)
//   anaphylaxis   grade 0 · 2 (II) · 3 (III) · 4 (IV) Ring–Messmer (onset τ 120 s; mediator release suppressed by
//                 epinephrine's β2 effect — mast-cell stabilisation — so repeated epinephrine resolves it)
//   sirs          severity 0–1 (post-bypass vasoplegia, major surgery day 1)
//   hypermetabolic severity 0–1 (serotonin syndrome, NMS: VO2 × up to 3, heat, HR)
//   thyroidStorm  severity 0–1 (thyroid.ts)

export interface ConditionEffects {
  hrF: number;
  svrF: number;
  eesF: number;
  dV0Frac: number;
  kfMult: number; // capillary filtration × → 7c `blood.core.fl.kfMult` (its lung-water seam carries the leak to 7b)
  vo2F: number; // metabolic rate × (VO2, VCO2, heat); 7c's lactate emerges from the O2 demand it raises
  vasoResp: number; // catecholamine/vasopressor responsiveness × → `ps.cond.vasoResp` (7g's PD reads it)
  setShiftC: number; // fever
  siF: number; // insulin sensitivity ×
  extraSymp: number; // sympathetic stress added (fever, pain, mediators)
}

export const NEUTRAL_CONDITIONS: ConditionEffects = { hrF: 1, svrF: 1, eesF: 1, dV0Frac: 0, kfMult: 1, vo2F: 1, vasoResp: 1, setShiftC: 0, siF: 1, extraSymp: 0 };

type Row = Omit<ConditionEffects, never>;
// tables §5e sepsis columns (HR + → × of 75 bpm; SVR, V0, kf, Ees, VO2, vasoResp, tempSet) [TXT/ENG]; erMax/shunt are not seams (R50 F10)
const SEPSIS: readonly Row[] = [
  NEUTRAL_CONDITIONS,
  { ...NEUTRAL_CONDITIONS, hrF: 1.27, svrF: 0.85, dV0Frac: 0.02, kfMult: 1.5, vo2F: 1.1, setShiftC: 1.5, siF: 0.7, extraSymp: 0.3 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.4, svrF: 0.7, dV0Frac: 0.05, kfMult: 2, vo2F: 1.2, vasoResp: 0.9, setShiftC: 2.2, siF: 0.5, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.3, svrF: 0.4, eesF: 0.8, dV0Frac: 0.12, kfMult: 3, vo2F: 1.3, vasoResp: 0.6, setShiftC: 2.4, siF: 0.4, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.25, svrF: 1.0, eesF: 0.5, dV0Frac: 0.1, kfMult: 3.5, vo2F: 1.1, vasoResp: 0.5, setShiftC: 0.2, siF: 0.4, extraSymp: 0.7 },
];
// tables §5e anaphylaxis grades 0, (I folded into II), II, III, IV
const ANAPH: readonly Row[] = [
  NEUTRAL_CONDITIONS,
  { ...NEUTRAL_CONDITIONS, hrF: 1.15, svrF: 0.85, dV0Frac: 0.02, kfMult: 1.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.33, svrF: 0.7, dV0Frac: 0.05, kfMult: 3, extraSymp: 0.3 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.35, svrF: 0.3, dV0Frac: 0.2, kfMult: 8, extraSymp: 0.5 },
  { ...NEUTRAL_CONDITIONS, hrF: 1.35, svrF: 0.2, eesF: 0.7, dV0Frac: 0.3, kfMult: 10, extraSymp: 0.5 },
];
const SIRS: Row = { ...NEUTRAL_CONDITIONS, hrF: 1.2, svrF: 0.78, kfMult: 1.5, vo2F: 1.15, setShiftC: 1, siF: 0.5, extraSymp: 0.2 };
const HYPERMET: Row = { ...NEUTRAL_CONDITIONS, hrF: 1.3, vo2F: 3, setShiftC: 0, extraSymp: 1 };

function interp(rows: readonly Row[], x: number): Row {
  const c = Math.min(rows.length - 1, Math.max(0, x));
  const i = Math.min(rows.length - 2, Math.floor(c));
  const f = c - i;
  const a = rows[i] as Row;
  const b = rows[i + 1] as Row;
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Row)[]) out[k] = a[k] + (b[k] - a[k]) * f;
  return out;
}

/** Combine bundles: multipliers multiply, additive terms add (audit #9 "max-combined" for the multipliers). */
export function combine(list: readonly ConditionEffects[]): ConditionEffects {
  const o = { ...NEUTRAL_CONDITIONS };
  for (const c of list) {
    o.hrF *= c.hrF; o.svrF *= c.svrF; o.eesF *= c.eesF; o.kfMult *= c.kfMult; o.vo2F *= c.vo2F; o.vasoResp *= c.vasoResp;
    o.siF *= c.siF;
    o.dV0Frac += c.dV0Frac; o.setShiftC += c.setShiftC; o.extraSymp += c.extraSymp;
  }
  return o;
}

export interface ConditionState {
  sepsis: { target: number; cur: number; tauS: number };
  anaph: { target: number; mediator: number };
  sirs: { target: number; cur: number };
  hypermet: { target: number; cur: number };
  storm: { target: number; cur: number };
}

export const ANAPH_ON_TAU_S = 120; // onset 1–3 min (tables)
export const ANAPH_OFF_TAU_S = 600; // mediators clear over ≈ 10 min once release stops [ENG]
export const ANAPH_EPI_STABILISE = 0.8; // β2 mast-cell stabilisation at full β2 effect [ENG, Q56]
export const COND_TAU_S = 600; // SIRS / hypermetabolic / storm smoothing [ENG]

export function createConditions(): ConditionState {
  return {
    sepsis: { target: 0, cur: 0, tauS: 600 }, anaph: { target: 0, mediator: 0 }, sirs: { target: 0, cur: 0 },
    hypermet: { target: 0, cur: 0 }, storm: { target: 0, cur: 0 },
  };
}

const relax = (cur: number, target: number, tau: number, dt: number) => target + (cur - target) * Math.exp(-dt / tau);

/** 1 Hz step. `beta2` is EXOGENOUS (7g) epinephrine's β2 effect (0–1, effects.ts `mastB2`): it stabilises mast cells. */
export function stepConditions(c: ConditionState, beta2: number, dtS: number): void {
  c.sepsis.cur = relax(c.sepsis.cur, c.sepsis.target, c.sepsis.tauS, dtS);
  const release = c.anaph.target * (1 - ANAPH_EPI_STABILISE * Math.min(1, Math.max(0, beta2)));
  c.anaph.mediator = relax(c.anaph.mediator, release, release > c.anaph.mediator ? ANAPH_ON_TAU_S : ANAPH_OFF_TAU_S, dtS);
  c.sirs.cur = relax(c.sirs.cur, c.sirs.target, COND_TAU_S, dtS);
  c.hypermet.cur = relax(c.hypermet.cur, c.hypermet.target, COND_TAU_S, dtS);
  c.storm.cur = relax(c.storm.cur, c.storm.target, COND_TAU_S, dtS);
}

/** The combined effects of sepsis, anaphylaxis, SIRS and the hypermetabolic state (thyroid storm is thyroid.ts's). */
export function conditionEffects(c: ConditionState): ConditionEffects {
  const scale = (r: Row, s: number): Row => interp([NEUTRAL_CONDITIONS, r], s);
  return combine([
    interp(SEPSIS, c.sepsis.cur),
    interp(ANAPH, c.anaph.mediator * 4), // mediator 0–1 → grade 0–4 (severity 0.5 = II, 0.75 = III, 1 = IV)
    scale(SIRS, c.sirs.cur),
    scale(HYPERMET, c.hypermet.cur),
  ]);
}

/** `condition { id: 'sepsis', phase }` → the stage target (severity 0–1 scales it). */
export const SEPSIS_PHASES = { sirs: 1, sepsis: 2, warm: 3, cold: 4 } as const;
