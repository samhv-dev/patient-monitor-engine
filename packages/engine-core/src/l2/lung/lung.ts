// The lung module (R31, R43): mechanics at 250 Hz inside the 62.5 Hz respiratory loop, slow dynamics and the mixing
// point at the 10 Hz gas step. Plain JSON-safe state; the resp pipeline (Tasks 13–15) owns one LungState.
import { complianceAt, pressureAt } from './venegas.ts';
import { airwayFlow, createMech, mechSubstep, type MechParams, type MechState } from './mechanics.ts';
import { createO2Lung, stepO2Lung, type O2LungState } from './mix-o2.ts';
import { mixCo2, type Co2Mix } from './mix-co2.ts';
import { CO2_SLOPE_BLOOD, K_TAU_II, MECH_H, N_UNITS, SIDE_SHARE, TAU_EXP_REF, TAU_II_MAX } from './params.ts';
import { createHpv, perfusion, stepHpv, type HpvState, type Perfusion } from './perfusion.ts';
import { createRecruit, nonAerated, stepRecruit, type RecruitState } from './recruit.ts';
import { mechParams, type LungParams } from './side.ts';

export type Mainstem = 'both' | 'left' | 'right';
export interface LungState {
  lp: LungParams;
  mp: MechParams;
  mech: MechState;
  rec: RecruitState;
  hpv: HpvState;
  o2: O2LungState;
  mainstem: Mainstem;
  aer: number[]; // aerated fraction per side the mechanics were built for
  perf: Perfusion;
  co2: Co2Mix;
  frcGaMl: number;
  // breath bookkeeping (volume-driven: an inspiration starts when airway flow turns positive)
  inInsp: boolean;
  v0: number[]; // unit volumes at the start of the inspiration
  tidal: number[]; // per-unit tidal volume of the last breath (mL)
  tInsp: number; // time the last inspiration started
  teS: number; // last complete expiratory time (s)
  tExp0: number; // time the current/last expiration started
  pInsp: number; // last end-inspiratory max unit alveolar pressure (cmH2O)
  peepTot: number; // last end-expiratory mean alveolar pressure (cmH2O)
  tauBar: number; // ventilation-weighted expiratory τ of the units (s)
  t: number;
  /** Executor addition (Task 14): gas steps taken (the first one places g without the alveolar lag). */
  nGas: number;
}

export function blockedSides(m: Mainstem): boolean[] {
  return [m === 'right', m === 'left'];
}

export function createLung(lp: LungParams, frcGaMl: number, fa0: number, cv0: number): LungState {
  const aer = lp.side.map((s) => 1 - s.atel - s.consol);
  const st: LungState = {
    lp, mp: mechParams(lp, aer, [false, false]), mech: createMech(), rec: createRecruit(), hpv: createHpv(),
    o2: createO2Lung(fa0, cv0), mainstem: 'both', aer,
    perf: { f: [SIDE_SHARE[0], SIDE_SHARE[1]], pvrMult: [1, 1], shunt: [0, 0], hypoxic: [0, 0] },
    co2: { pA: [40, 40, 40, 40], pv: 46, e: 1, g: 0.925, riseIII: 0, faCo2: 0.056 },
    frcGaMl, inInsp: false, v0: [0, 0, 0, 0], tidal: [0, 0, 0, 0], tInsp: 0, teS: 3, tExp0: 0, pInsp: 0, peepTot: 0, tauBar: 0.54, t: 0, nGas: 0,
  };
  return st;
}

/**
 * Advance the mechanics by one 62.5 Hz sample (4 sub-steps). mode/x as mechSubstep. Breaths are found from the airway
 * flow: an inspiration starts when flow turns positive (flow mode: x > 0; pressure mode: > 50 mL/s, Stage 3's frame
 * threshold) and ends when it stops being positive outside a hold.
 */
export function lungMechStep(ls: LungState, mode: 'flow' | 'pressure' | 'closed', x: number, dt: number): void {
  const n = Math.max(1, Math.round(dt / MECH_H));
  for (let i = 0; i < n; i++) {
    mechSubstep(ls.mp, ls.mech, mode, x, dt / n);
    ls.t += dt / n;
    const insp = mode === 'flow' ? x > 0 : mode === 'closed' ? ls.inInsp : airwayFlow(ls.mech) > 50;
    if (insp && !ls.inInsp) {
      ls.inInsp = true;
      ls.teS = ls.t - ls.tExp0;
      ls.peepTot = meanAlveolar(ls);
      ls.v0 = ls.mech.v.slice();
      ls.tInsp = ls.t;
    } else if (!insp && ls.inInsp) {
      ls.inInsp = false;
      ls.tidal = ls.mech.v.map((v, u) => Math.max(0, v - (ls.v0[u] as number)));
      ls.pInsp = maxAlveolar(ls);
      ls.tExp0 = ls.t;
    } else if (!insp && mode === 'pressure' && x >= ls.pInsp) {
      // Executor addition (Task 24): an airway pressure held at or above the last peak (a sustained-inflation
      // manoeuvre) keeps raising the alveolar pressure after the flow has fallen below the 50 mL/s breath threshold
      ls.pInsp = Math.max(ls.pInsp, maxAlveolar(ls));
    }
  }
}

/** Capnogram terms for the next cycle (decision 9): extra phase II τ from the expiratory τ spread, phase III rise. */
export function capnoTerms(ls: LungState): { tauII: number; riseIII: number } {
  return { tauII: Math.min(TAU_II_MAX, K_TAU_II * Math.max(0, ls.tauBar - TAU_EXP_REF)), riseIII: ls.co2.riseIII };
}

function alveolar(ls: LungState, u: number): number {
  let s = 0;
  for (let k = 0; k < N_UNITS; k++) s += ls.mech.v[k] as number;
  return s / ls.mp.ccw + ls.mp.units[u]!.sig.c - ls.mp.units[u]!.sig.d * Math.log(1 / Math.min(0.999, Math.max(0.001, ((ls.mech.v[u] as number) - ls.mp.units[u]!.sig.a) / ls.mp.units[u]!.sig.b)) - 1);
}
function meanAlveolar(ls: LungState): number {
  let s = 0;
  let n = 0;
  for (let u = 0; u < N_UNITS; u++) if (!ls.mp.blocked[u] && ls.mp.units[u]!.rIn < 1e3) { s += alveolar(ls, u); n++; }
  return n ? s / n : 0;
}
function maxAlveolar(ls: LungState): number {
  let m = -1e9;
  for (let u = 0; u < N_UNITS; u++) if (!ls.mp.blocked[u] && ls.mp.units[u]!.rIn < 1e3) m = Math.max(m, alveolar(ls, u));
  return m;
}

export interface GasInputs {
  va: number; // Stage 3 alveolar ventilation now (L/min)
  q: number; // pulmonary blood flow (L/min)
  baseShunt: number; // Stage 3 `shunt` (MANUAL-calibrated), fraction of CO
  fio2: number;
  massFlowFio2: number | null;
  vo2: number;
  vco2: number;
  paco2: number; // Stage 3 fast compartment
  tempC: number;
  bloodL: number;
  coRatio: number;
  ga: boolean;
  indFactor: number;
  volatileMac: number;
  /** 7a adapter: measured per-lung flows (L/min) when the circulation exists, else null (fallback split). */
  sideFlow: number[] | null;
  /** Executor addition (Task 14): reference pulmonary flow (L/min, CO_ref); the CO2 mix never sees less. */
  qRef?: number;
}

/** 10 Hz: recruitment, HPV, perfusion, CO2 mix, O2 stores. Rebuilds unit mechanics when aeration moves. */
export function lungGasStep(ls: LungState, x: GasInputs, dt: number): void {
  const lp = ls.lp;
  const blocked = blockedSides(ls.mainstem);
  const faCo2 = ls.co2.faCo2;
  stepRecruit(ls.rec, lp.side, {
    fio2: x.fio2, faO2: ls.o2.fa, faCo2, peepTot: ls.peepTot, pInsp: ls.pInsp, ga: x.ga, indFactor: x.indFactor, blocked,
  }, dt);
  const non = nonAerated(ls.rec, lp.side);
  const aer = non.map((n) => 1 - n);
  if (Math.abs((aer[0] as number) - (ls.aer[0] as number)) > 0.005 || Math.abs((aer[1] as number) - (ls.aer[1] as number)) > 0.005 || ls.mp.blocked[0] !== blocked[0] || ls.mp.blocked[2] !== blocked[1]) {
    ls.aer = aer;
    ls.mp = mechParams(lp, aer, blocked);
  }
  const sidePao2 = ls.o2.fa.map((f) => f * 713);
  ls.perf = perfusion(lp.side, non, sidePao2, ls.hpv, x.volatileMac);
  stepHpv(ls.hpv, ls.perf.hypoxic, dt);
  // flows. Executor deviation (Task 14): the O2 side uses the actual flow floored at 0.05 L/min (arrest: q = 0 gave
  // 0/0 = NaN in both mixes); the CO2 mix sees at least the reference flow `qRef`, so a low cardiac output does not
  // lower g/e on top of Stage 3's low-flow factor φ, which already owns low-flow CO2 kinetics (R39-2 CPR retune;
  // plan decision 7: "the CPR kinetics are untouched").
  const qO2 = Math.max(0.05, x.q);
  const qCo2 = Math.max(qO2, x.qRef ?? 0);
  const extra = Math.min(0.6, x.baseShunt + lp.extraShunt);
  const qp = qO2 * (1 - extra);
  const f = x.sideFlow ? x.sideFlow.map((v) => v / Math.max(1e-6, x.sideFlow![0]! + x.sideFlow![1]!)) : ls.perf.f;
  const perfU = [0, 0, 0, 0];
  const qLow = [0, 0];
  let qShunt = qO2 * extra;
  for (let s = 0; s < 2; s++) {
    const sp = lp.side[s]!;
    const qs = qp * (f[s] as number);
    qShunt += qs * (ls.perf.shunt[s] as number);
    const qa = qs * (1 - (ls.perf.shunt[s] as number));
    qLow[s] = qa * sp.vqLow;
    perfU[2 * s] = qa * (1 - sp.vqLow) * (1 - sp.fSlow);
    perfU[2 * s + 1] = qa * (1 - sp.vqLow) * sp.fSlow;
  }
  const tidSum = ls.tidal.reduce((a, b, u) => a + (ls.mp.blocked[u] ? 0 : b), 0);
  // Executor deviation (Task 14): before the first complete breath (tidal all 0) ventilation is shared by the open
  // units' compliances (the passive distribution), not zero — a zero split put every unit at PAO2 ≈ 7 mmHg and the
  // SaO2 truth at 0.2 for the first breath of every run.
  const cU = ls.mp.units.map((un, u) => (ls.mp.blocked[u] || !(un.rIn < 1e3) ? 0 : complianceAt(un.sig, ls.mech.v[u] as number)));
  const cSum = cU.reduce((a, b) => a + b, 0);
  const vent = tidSum > 0 ? ls.tidal.map((v, u) => (!ls.mp.blocked[u] ? v / tidSum : 0)) : cU.map((c) => (cSum > 0 ? c / cSum : 0));
  const vdAlv = [0, 1, 2, 3].map((u) => lp.side[u >> 1]!.vdAlv);
  const tauEx = ls.mp.units.map((un, u) => {
    const c = complianceAt(un.sig, ls.mech.v[u] as number);
    const crs = 1 / (1 / Math.max(1e-3, c) + 1 / (ls.mp.ccw * (SIDE_SHARE[u >> 1] as number)));
    return (un.rEx + ls.mp.rTube) * crs;
  });
  ls.tauBar = tidSum > 0 || cSum > 0 ? tauEx.reduce((a, tau, u) => a + tau * (vent[u] as number), 0) : ls.tauBar;
  const gPrev = ls.co2.g;
  const kC = qCo2 / qO2;
  const mix = mixCo2({
    // Executor deviation (Task 14): teS capped at 10 s — after an apnoea the 'expiration' lasted minutes and exp(−w/τ)
    // underflowed to 0, which returned g = 0 (EtCO2 0) for the first breath after the apnoea
    va: x.va, vent, perf: perfU.map((p) => p * kC), qLow: (qLow[0]! + qLow[1]!) * kC, qShunt: qShunt * kC, vdAlv, tauEx, teS: Math.min(10, Math.max(0.3, ls.teS)), paco2: x.paco2, vco2: x.vco2,
  });
  const frcSide = [0, 1].map((s) => ls.frcGaMl * lp.frcMult * (SIDE_SHARE[s] as number) * (aer[s] as number));
  // Executor addition (Task 14): the end-tidal ratio g follows the alveolar gas, which relaxes toward the mixing
  // point's steady state with the alveolar CO2 time constant τ = C_A/(Q·S + VA/713), C_A = aerated FRC/713 mL/mmHg
  // (≈ 6 s ventilated, 8 s apnoeic in the healthy adult). During apnoea g → 1 (alveolar gas equilibrates with the
  // capillary blood), so the first breath after an apnoea shows the accumulated CO2 (Stage 3 M4), and the
  // momentary va = 0 at the start of every externally driven breath no longer flips EtCO2 by 8 %.
  if (ls.nGas > 0) {
    const cA = (frcSide[0]! + frcSide[1]!) / 713;
    const gk = qCo2 * CO2_SLOPE_BLOOD + (x.va * 1000) / 713;
    const tau = (60 * cA) / Math.max(1, gk);
    mix.g = gPrev + (mix.g - gPrev) * (1 - Math.exp(-dt / Math.max(0.5, tau)));
  }
  ls.co2 = mix;
  ls.nGas++;
  stepO2Lung(ls.o2, {
    va: x.va, vent, perf: perfU, vdAlv, qLow, qShunt, fio2: x.fio2, massFlowFio2: x.massFlowFio2, blocked, vo2: x.vo2,
    paco2: x.paco2, pA: ls.co2.pA, tempC: x.tempC, frcSide, bloodL: x.bloodL, dl: lp.side.map((s) => s.dl), coRatio: x.coRatio,
  }, dt);
}

/** True shunt fraction now (for lungState and the `shunt` coupled truth). */
export function shuntFraction(ls: LungState, baseShunt: number): number {
  const extra = Math.min(0.6, baseShunt + ls.lp.extraShunt);
  const f = ls.perf.f;
  return Math.min(0.9, extra + (1 - extra) * ((f[0] as number) * (ls.perf.shunt[0] as number) + (f[1] as number) * (ls.perf.shunt[1] as number)));
}

/**
 * Whole respiratory-system static compliance (mL/cmH2O): ventilated units in parallel, in series with the chest wall.
 * Executor deviation (Task 13): each unit's lung compliance is the CHORD over the last breath (tidal volume / its
 * transpulmonary pressure change from the end-expiratory volume v0), the tangent at v0 before the first breath — so
 * the value is a per-breath Cstat that does not ripple within a breath (the plan's tangent at the instantaneous
 * volume moved lungState and the Stage 2 breath signal u(t) by ±2 mL/cmH2O inside every breath).
 */
export function staticCompliance(ls: LungState): number {
  let cl = 0;
  for (let u = 0; u < N_UNITS; u++) {
    if (ls.mp.blocked[u] || !(ls.mp.units[u]!.rIn < 1e3)) continue;
    const sig = ls.mp.units[u]!.sig;
    const v0 = ls.v0[u] as number;
    const tid = ls.tidal[u] as number;
    const dp = tid > 1 ? pressureAt(sig, v0 + tid) - pressureAt(sig, v0) : 0;
    cl += dp > 1e-3 ? tid / dp : complianceAt(sig, v0);
  }
  return cl > 0 ? 1 / (1 / cl + 1 / ls.mp.ccw) : 1;
}
