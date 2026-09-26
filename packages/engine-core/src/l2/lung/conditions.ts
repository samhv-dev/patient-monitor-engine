// Conditions → per-lung parameters (catalogue §33 stacking, Q93; severity knots after Pulse's severity-table
// pattern, audit borrow #9 / N-P13). Pure: the same specs always resolve to the same LungParams.
import { HEALTHY, LUNG_CONDITIONS, type Effect, type EffectKey, type Knots, type LungConditionData } from '../../../data/lung-pathology.ts';
import type { LungConditionSpec, LungSide } from '../../types-lung.ts';
import { R_TUBE, SIDE_SHARE } from './params.ts';
import { healthyParams, type LungParams } from './side.ts';

const GLOBAL: readonly EffectKey[] = ['ccw', 'frc', 'pvr', 'tIt', 'pPtx', 'leakFrac', 'co2Slope', 'pMax', 'extraShunt', 'evlwi'];
const SIDE_ADD: readonly EffectKey[] = ['atel', 'consol', 'vqLow', 'vdAlv'];

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
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
 * Sided conditions (decision 13): 'affected' effects act on the chosen side; 'both' crs/raw are whole-system
 * multipliers converted onto that side, vdAlv/vqLow adds go to that side ÷ its share, global keys stay global.
 */
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1): Resolved {
  const sides: Acc[] = [fresh(), fresh()];
  const g = fresh();
  const blocked: LungSide[] = [];
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
      const v = effectValue(e, s);
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
  const ew = Math.max(0, g.evlwi - 7);
  const water = { c: Math.max(0.5, 1 - 0.04 * ew), r: 1 + 0.03 * ew, shunt: 0.03 * Math.max(0, g.evlwi - 10) };
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
    sp.rLung = Math.max(0.5, (HEALTHY.raw * a.raw * rawEvent * water.r - R_TUBE)) / w / share;
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
  lp.frcMult = g.frc;
  lp.pvr = g.pvr;
  lp.tIt = g.tIt;
  lp.pPtx = g.pPtx;
  lp.leakFrac = g.leakFrac;
  lp.co2Slope = g.co2Slope;
  lp.pMax = g.pMax;
  return { lp, blocked };
}
