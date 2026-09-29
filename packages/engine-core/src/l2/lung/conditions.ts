// Conditions → per-lung parameters (catalogue §33 stacking, Q93; severity knots after Pulse's severity-table
// pattern, audit borrow #9 / N-P13). Pure: the same specs always resolve to the same LungParams.
import { HEALTHY, LUNG_CONDITIONS, type Effect, type EffectKey, type Knots, type LungConditionData } from '../../../data/lung-pathology.ts';
import type { LungConditionSpec, LungSide } from '../../types-lung.ts';
import { R_TUBE, SIDE_SHARE } from './params.ts';
import { healthyParams, type LungParams } from './side.ts';

const GLOBAL: readonly EffectKey[] = ['ccw', 'frc', 'pvr', 'tIt', 'pPtx', 'leakFrac', 'co2Slope', 'pMax', 'extraShunt', 'evlwi'];
const SIDE_ADD: readonly EffectKey[] = ['atel', 'consol', 'vqLow', 'vdAlv'];
/** Stage V.1 (E-V1-2): conditions whose extraShunt the data mark "lung-water shunt" (§13 pulmonary oedema, §21 aspiration pneumonitis). */
const WATER_SHUNT_IDS: readonly string[] = ['pulmOedema', 'aspiration'];

/**
 * FU-6 R2: airway smooth muscle. The reversible (bronchoconstrictor) part of a condition relaxes with the ONE
 * bronchodilation state B (0–1: 7g's `bus.airway.bronchodilation` — β2 agonists, epinephrine, volatile anaesthetics,
 * ketamine, magnesium, each with its own 7g time course). The condition's effective severity for the listed keys is
 * s·(1 − frac·B). frac = the largest reversible share of the condition's airway obstruction:
 *   bronchospasm 0.85, anaphylaxis 0.85: acute smooth-muscle spasm, near-complete reversal with β2 agonist/epinephrine
 *     and deepening with a volatile (Dewachter 2009 Anesthesiology 111:1141; Miller 10e bronchospasm management);
 *     the rest is mucosal oedema/secretions [ENG 0.85].
 *   asthma 0.7: acute severe asthma reverses partly within the hour (FEV1 +50–70 % of the deficit after β2 agonist;
 *     GINA 2023; Rodrigo 2002 Chest 122:160) [ENG 0.7].
 *   copd 0.2, raw only: bronchodilator response in ventilated COPD, inspiratory resistance −15–20 % (Dhand 1996 AJRCCM
 *     154:388) [ENG 0.2]; emphysema's compliance, dead space and diffusion do not reverse.
 * `shark`: the condition draws the Stage 3 shark-fin capnogram (R39-6 SHARK_TAU_II) at its equivalent bronchospasm
 * severity (FU-6 R6, Task 3: one capnogram whatever command started the spasm).
 */
export const SMOOTH_MUSCLE: Readonly<Record<string, { frac: number; keys: readonly EffectKey[] | 'all'; shark: boolean }>> = {
  bronchospasm: { frac: 0.85, keys: 'all', shark: true },
  anaphylaxis: { frac: 0.85, keys: 'all', shark: true },
  asthma: { frac: 0.7, keys: ['raw', 'rawExp', 'fSlow', 'tauSlowS', 'vqLow'], shark: true },
  copd: { frac: 0.2, keys: ['raw'], shark: false },
};

/**
 * FU-6 F6 (Orchestrator ruling (FU-6 review), 2026-09-28): the reversible share is not a constant — a REFRACTORY spasm
 * exists. `frac` above is the share a FRESH, severe-but-not-near-fatal spasm reverses; two things take it away, both
 * because the obstruction stops being smooth muscle:
 *   SEVERITY. In the R39-6 near-fatal range (severity 1.0 → 1.25, reached through the airway `bronchospasm` alias) the
 *     lumen fills with mucosal oedema and mucus plugs rather than tone (extensive luminal plugging in fatal asthma:
 *     Kuyper et al. 2003 Am J Med 115:6), so the reversible share falls to (1 − REFRACT_SEV) of itself at 1.25 [ENG 0.6].
 *   DURATION. A slow-onset attack — hours of inflammation, oedema and plugging — responds less and more slowly to a β2
 *     agonist than a sudden-onset, mostly bronchospastic one (McFadden 2003 AJRCCM 168:740; Rodrigo & Rodrigo 2000
 *     Chest 118:1547; Rodrigo, Rodrigo & Hall 2004 Chest 125:1081), so the share decays toward (1 − REFRACT_DUR_MAX) of
 *     itself with τ REFRACT_TAU_MIN [ENG 0.9 and 360 min (the 6 h slow-onset boundary); fit target: Task 2's
 *     non-responder row — a 12 h severe asthma improves < 15 % with a saturating β2 dose (measured −14 %) — and every
 *     fresh arm keeping ≥ 95 % of `frac` (0.963 at 15 min)].
 * The age is sim time since the condition appeared plus the spec's `ageMin` (the attack's age when it was sent), so
 * status asthmaticus is one command: `lungCondition asthma 1, ageMin 720` keeps ≈ 0.7 · 0.22 ≈ 0.16 of its airway
 * obstruction reversible. FU-6 adds NO dose-response of its own — B is 7g's; this function is the MAXIMUM reversal.
 */
export const REFRACT_SEV = 0.6;
export const REFRACT_DUR_MAX = 0.9;
export const REFRACT_TAU_MIN = 360;

/** FU-6 F6: the share of a smooth-muscle condition's severity that bronchodilation can reverse (0–`frac`). */
export function reversibleShare(frac: number, severity: number, ageMin = 0): number {
  const sev = 1 - REFRACT_SEV * Math.min(1, Math.max(0, (severity - 1) / 0.25)); // near-fatal: oedema and plugging
  const dur = 1 - REFRACT_DUR_MAX * (1 - Math.exp(-Math.max(0, ageMin) / REFRACT_TAU_MIN)); // slow-onset attack
  return frac * sev * dur;
}

/**
 * FU-6 R6: the shark-fin capnogram's severity (0 = none) from the smooth-muscle conditions after bronchodilation —
 * bronchospasm at its own (unclamped, 1.25 = the R39-6 near-fatal extreme) severity; the others at the bronchospasm
 * severity with the same airway resistance (Stage 3's raw = 1 + 5·s^1.5 inverted). `ageMin` as `resolveLung` (F6).
 */
export function spasmSeverity(specs: readonly LungConditionSpec[], bd = 0, exempt: readonly string[] = [], ageMin: Readonly<Record<string, number>> = {}): number {
  let out = 0;
  for (const spec of specs) {
    const sm = SMOOTH_MUSCLE[spec.id];
    const d = conditionData(spec.id);
    if (!sm?.shark || !d || !(spec.severity > 0)) continue;
    const s = relaxed(spec, 'raw', spec.severity, bd, exempt, ageMin[spec.id] ?? 0);
    if (spec.id === 'bronchospasm') { out = Math.max(out, s); continue; }
    const raw = d.effects.find((e) => e.key === 'raw');
    const m = raw ? effectValue(raw, Math.min(1, s)) : 1;
    out = Math.max(out, (Math.max(0, m - 1) / 5) ** (2 / 3));
  }
  return out;
}

/**
 * Effective severity of `spec` for effect `key` under bronchodilation B (FU-6 R2); `exempt` ids keep their own.
 * `ageMin` = the attack's age in minutes (FU-6 F6; 0 = fresh).
 */
export function relaxed(spec: LungConditionSpec, key: EffectKey, s: number, bd: number, exempt: readonly string[], ageMin = 0): number {
  const sm = SMOOTH_MUSCLE[spec.id];
  if (!sm || bd <= 0 || exempt.includes(spec.id)) return s;
  const frac = reversibleShare(sm.frac, spec.severity, ageMin); // FU-6 F6: the non-reversible share
  return sm.keys === 'all' || sm.keys.includes(key) ? s * (1 - frac * Math.min(1, bd)) : s;
}

export function conditionData(id: string): LungConditionData | undefined {
  return LUNG_CONDITIONS.find((c) => c.id === id);
}

/** Value of an effect at severity s: knots interpolate linearly (flat outside); a number is the value at s = 1. */
export function effectValue(e: Effect, s: number): number {
  const def = HEALTHY[e.key];
  if (typeof e.v === 'number') {
    if (e.op === 'mul') return 1 + (e.v - 1) * s;
    if (e.op === 'add') return e.v * s;
    return def + (e.v - def) * s;
  }
  return interp(e.v, s);
}

export function interp(k: Knots, s: number): number {
  const first = k[0] as readonly [number, number];
  if (s <= first[0]) return first[1];
  for (let i = 1; i < k.length; i++) {
    const [x1, y1] = k[i] as readonly [number, number];
    const [x0, y0] = k[i - 1] as readonly [number, number];
    if (s <= x1) return y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return (k[k.length - 1] as readonly [number, number])[1];
}

type Acc = Record<EffectKey, number>;
const fresh = (): Acc => ({ ...HEALTHY, crs: 1, raw: 1, dlFactor: 1, perfShare: 1, ccw: 1, frc: 1, pvr: 1, co2Slope: 1, pMax: 1, atel: 0, consol: 0, vqLow: 0, vdAlv: 0, extraShunt: 0, leakFrac: 0 });

function apply(acc: Acc, key: EffectKey, op: Effect['op'], v: number): void {
  if (op === 'mul') acc[key] *= v;
  else if (op === 'add') acc[key] += v;
  else if (Math.abs(v - HEALTHY[key]) > Math.abs(acc[key] - HEALTHY[key])) acc[key] = v; // 'set': furthest from healthy wins
}

export interface Resolved {
  lp: LungParams;
  /** Sides blocked by a condition's mainstem rule (OLV, endobronchial). */
  blocked: LungSide[];
}

/**
 * Resolve condition specs for a patient of `ibwKg`. `bronchoDil` = FU-6 R2's bronchodilation state B (0 = none; the
 * Stage 3 airway multiplier `rawEvent` it replaced is retired: the airway `bronchospasm` event is an alias of the lung
 * condition, FU-6 R6); `bdExempt` = condition ids whose owner already applies the relief (7e's anaphylaxis);
 * `smAgeMin` = each smooth-muscle condition's age in minutes (FU-6 F6).
 * `evlwiAdd` = Stage 7c's lung water from the blood (mL/kg above the conditions' EVLWI; G7b ruling 8, E-7c-1).
 * Sided conditions (decision 13): 'affected' effects act on the chosen side; 'both' crs/raw are whole-system
 * multipliers converted onto that side, vdAlv/vqLow adds go to that side ÷ its share, global keys stay global.
 */
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, evlwiAdd = 0, bronchoDil = 0, bdExempt: readonly string[] = [], smAgeMin: Readonly<Record<string, number>> = {}): Resolved {
  const sides: Acc[] = [fresh(), fresh()];
  const g = fresh();
  const blocked: LungSide[] = [];
  let waterAdd = 0; // Stage V.1 (E-V1-2)
  for (const spec of specs) {
    const d = conditionData(spec.id);
    if (!d || !(spec.severity > 0)) continue;
    const s = Math.min(1, spec.severity);
    const side: LungSide = spec.side ?? d.defaultSide ?? 'R';
    const si = side === 'L' ? 0 : 1;
    if (d.mainstem === 'blockAffected' && !blocked.includes(side)) blocked.push(side);
    let atelSum = 0;
    let consolSum = 0;
    const local: Acc[] = [fresh(), fresh()];
    for (const e of d.effects) {
      const v = effectValue(e, relaxed(spec, e.key, s, bronchoDil, bdExempt, smAgeMin[spec.id] ?? 0)); // FU-6 R2: the reversible part relaxes (F6: by age)
      if (e.key === 'extraShunt' && e.op === 'add' && WATER_SHUNT_IDS.includes(d.id)) waterAdd += v; // Stage V.1 (E-V1-2)
      if (GLOBAL.includes(e.key)) { apply(g, e.key, e.op, v); continue; }
      if (!d.sided) { apply(local[0] as Acc, e.key, e.op, v); apply(local[1] as Acc, e.key, e.op, v); }
      else if (e.where === 'affected') apply(local[si] as Acc, e.key, e.op, v);
      else if ((e.key === 'crs' || e.key === 'raw') && d.mainstem === 'blockAffected') apply(local[1 - si] as Acc, e.key, e.op, v); // the ventilated lung carries the tube/DLT
      else if (e.key === 'crs' || e.key === 'raw') apply(local[si] as Acc, e.key, 'mul', Math.max(0.1, 1 - (1 - v) / (SIDE_SHARE[si] as number)));
      else if (SIDE_ADD.includes(e.key)) apply(local[si] as Acc, e.key, e.op, e.op === 'add' ? v / (SIDE_SHARE[si] as number) : v);
      else apply(local[si] as Acc, e.key, e.op, v);
      if (e.key === 'atel') atelSum += v;
      if (e.key === 'consol') consolSum += v;
    }
    if (spec.recruitFrac !== undefined && atelSum + consolSum > 0) {
      // re-split the condition's non-aerated lung by the requested recruitability (catalogue §6 high 0.5 / low 0.15)
      for (const acc of local) {
        const tot = acc.atel + acc.consol;
        acc.atel = tot * spec.recruitFrac;
        acc.consol = tot * (1 - spec.recruitFrac);
      }
    }
    for (let k = 0; k < 2; k++) {
      const a = local[k] as Acc;
      const t = sides[k] as Acc;
      for (const key of Object.keys(a) as EffectKey[]) {
        if (key === 'crs' || key === 'raw' || key === 'dlFactor' || key === 'perfShare') t[key] *= a[key];
        else if (SIDE_ADD.includes(key)) t[key] += a[key];
        else apply(t, key, 'set', a[key]);
      }
    }
  }
  const lp = healthyParams(ibwKg);
  const w = ibwKg / 70;
  const crsH = HEALTHY.crs * w;
  const ccwH = HEALTHY.ccw * w;
  // lung water (tables §4.5, Q25): shunt +0.03 per mL/kg above 10; lung compliance ×(1 − 0.04·(EVLWI − 7)₊) ≥ 0.5; R ×(1 + 0.03·(EVLWI − 7)₊)
  const ew = Math.max(0, g.evlwi + evlwiAdd - 7); // Stage 7c: + the blood's lung water (E-7c-1)
  const water = { c: Math.max(0.5, 1 - 0.04 * ew), r: 1 + 0.03 * ew, shunt: 0.03 * Math.max(0, g.evlwi + evlwiAdd - 10) };
  for (let k = 0; k < 2; k++) {
    const a = sides[k] as Acc;
    const sp = lp.side[k]!;
    const share = SIDE_SHARE[k] as number;
    const crs = crsH * a.crs;
    const inv = 1 / crs - 1 / ccwH;
    const cLtot = inv > 1e-6 ? 1 / inv : 20 * crs;
    sp.cL = cLtot * share * water.c;
    const non = Math.min(0.95, a.atel + a.consol);
    const scale = a.atel + a.consol > 0 ? non / (a.atel + a.consol) : 1;
    sp.atel = a.atel * scale;
    sp.consol = a.consol * scale;
    sp.aerRef = Math.max(0.05, 1 - sp.atel - sp.consol);
    sp.rLung = Math.max(0.5, (HEALTHY.raw * a.raw * water.r - R_TUBE)) / w / share; // FU-6 R6: no Stage 3 multiplier
    sp.rawExp = a.rawExp;
    sp.fSlow = a.fSlow;
    sp.tauSlowS = Math.max(0.2, a.tauSlowS);
    sp.pOpen = a.pOpen;
    sp.tauRecS = a.tauRecS;
    sp.vqLow = Math.min(0.4, HEALTHY.vqLow + a.vqLow);
    sp.vdAlv = Math.min(0.9, HEALTHY.vdAlv + a.vdAlv);
    sp.dl = a.dlFactor;
    sp.hpv = a.hpv;
    sp.perf = a.perfShare;
  }
  // §33 caps: whole-lung non-aeration ≤ 0.7 unless a side is fully collapsed by a sided condition
  const whole = lp.side.reduce((acc, sp, k) => acc + (SIDE_SHARE[k] as number) * (sp.atel + sp.consol), 0);
  if (whole > 0.7) for (const sp of lp.side) { const f = 0.7 / whole; sp.atel *= f; sp.consol *= f; sp.aerRef = Math.max(0.05, 1 - sp.atel - sp.consol); }
  lp.ccw = ccwH * g.ccw;
  lp.extraShunt = Math.min(0.6, g.extraShunt + water.shunt);
  lp.waterShunt = Math.min(lp.extraShunt, waterAdd + water.shunt); // Stage V.1 (E-V1-2)
  lp.frcMult = g.frc;
  lp.pvr = g.pvr;
  lp.tIt = g.tIt;
  lp.pPtx = g.pPtx;
  lp.leakFrac = g.leakFrac;
  lp.co2Slope = g.co2Slope;
  lp.pMax = g.pMax;
  return { lp, blocked };
}
