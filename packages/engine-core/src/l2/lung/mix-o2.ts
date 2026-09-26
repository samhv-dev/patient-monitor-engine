// The mixing point, O2 side (R43; tables §4.1, §4.5; catalogue §22–§23). Two alveolar O2 stores, one per lung
// (Stage 3's store split by side, each with its own aerated FRC), so a blocked lung keeps oxygenating its blood
// until its gas is absorbed (OLV onset) and each side desaturates at its own rate. Within a side, units depart from
// the store's fraction by their steady-state V/Q difference; low-V/Q units (vqLow) respond to FiO2, true shunt does
// not. Arterial content = flow-weighted end-capillary contents + shunt at mixed-venous content (Stage 3's blood pool).
import { content, odc, po2ForContent } from '../gas/o2.ts';
import { BLOOD_VENOUS_FRACTION, MASS_FLOW_DEFICIT_ML_MIN, PB_MMHG, PH2O_MMHG, RQ } from '../gas/params.ts';
import { VQ_LOW } from './params.ts';

const PI_DRY = PB_MMHG - PH2O_MMHG;

export interface O2LungState { fa: number[]; cv: number; sa: number; pao2: number }
export interface O2LungInputs {
  va: number; // delivered alveolar ventilation (L/min)
  vent: number[]; // per-unit share of va
  perf: number[]; // per-unit exchanging flow (L/min)
  vdAlv: number[];
  qLow: number[]; // per-side low-V/Q flow (L/min)
  qShunt: number; // L/min, all true shunt (both sides + extrapulmonary)
  fio2: number;
  massFlowFio2: number | null; // apnoea with a patent airway
  blocked: boolean[];
  vo2: number;
  paco2: number;
  pA: number[]; // unit PACO2 (mixCo2)
  tempC: number;
  frcSide: number[]; // aerated gas volume per side (mL)
  bloodL: number;
  dl: number[]; // diffusion factor per side
  coRatio: number;
}

/** End-capillary content with West's diffusion equilibration (tables §4.5): only dl < 1 or high CO matters. */
function endCap(pAO2: number, cv: number, x: O2LungInputs, dl: number): number {
  if (dl >= 1 && x.coRatio <= 1.5) return content(pAO2, x.tempC, x.paco2);
  const pv = po2ForContent(cv, x.tempC, x.paco2);
  const k = 5.5 * dl * Math.min(1, 1 / Math.max(0.3, x.coRatio)); // equilibrium by 0.25 of a 0.75 s transit at dl 1
  return content(pAO2 - (pAO2 - pv) * Math.exp(-k), x.tempC, x.paco2);
}

/** Steady-state alveolar O2 fraction of a unit with ventilation va (L/min) and flow q, given Cv (bisection). */
function faSteady(va: number, q: number, fio2: number, faco2: number, cv: number, x: O2LungInputs): number {
  if (va <= 1e-4) return 0.01;
  let lo = 0.01;
  let hi = Math.max(0.02, fio2);
  for (let i = 0; i < 24; i++) {
    const f = (lo + hi) / 2;
    const up = q * (content(f * PI_DRY, x.tempC, x.paco2) - cv); // mL/min
    const rhs = fio2 - (1 / RQ - 1) * faco2 - up / (va * 1000);
    if (rhs > f) lo = f;
    else hi = f;
  }
  return (lo + hi) / 2;
}

export function createO2Lung(fa: number, cv: number): O2LungState {
  return { fa: [fa, fa], cv, sa: 0.97, pao2: 95 };
}

/** Unit alveolar PO2s for the current store state (also used by HPV and the recruitment inputs). */
export function unitPao2(st: O2LungState, x: O2LungInputs): { unit: number[]; low: number[] } {
  const unit = [0, 0, 0, 0];
  const low = [0, 0];
  for (let s = 0; s < 2; s++) {
    const base = st.fa[s] as number;
    if (x.va <= 0 || x.blocked[s]) {
      unit[2 * s] = base * PI_DRY;
      unit[2 * s + 1] = base * PI_DRY;
      low[s] = base * PI_DRY;
      continue;
    }
    let wSum = 0;
    let mean = 0;
    const ss = [0, 0];
    for (let k = 0; k < 2; k++) {
      const u = 2 * s + k;
      const vaP = x.va * (x.vent[u] as number) * (1 - (x.vdAlv[u] as number));
      ss[k] = faSteady(vaP, x.perf[u] as number, x.fio2, (x.pA[u] as number) / PI_DRY, st.cv, x);
      mean += vaP * (ss[k] as number);
      wSum += vaP;
    }
    mean = wSum > 0 ? mean / wSum : base;
    for (let k = 0; k < 2; k++) unit[2 * s + k] = Math.max(0.005, base + (ss[k] as number) - mean) * PI_DRY;
    const ql = x.qLow[s] as number;
    const fl = ql > 0 ? faSteady(VQ_LOW * ql, ql, x.fio2, x.paco2 / PI_DRY, st.cv, x) : mean;
    low[s] = Math.max(0.005, base + fl - mean) * PI_DRY;
  }
  return { unit, low };
}

export function stepO2Lung(st: O2LungState, x: O2LungInputs, dtS: number): void {
  const dt = dtS / 60;
  const { unit, low } = unitPao2(st, x);
  let caNum = x.qShunt * st.cv;
  let q = x.qShunt;
  for (let s = 0; s < 2; s++) {
    let uptake = 0;
    for (let k = 0; k < 2; k++) {
      const u = 2 * s + k;
      const qu = x.perf[u] as number;
      const cc = endCap(unit[u] as number, st.cv, x, x.dl[s] as number);
      uptake += qu * (cc - st.cv);
      caNum += qu * cc;
      q += qu;
    }
    const ql = x.qLow[s] as number;
    const cl = content(low[s] as number, x.tempC, x.paco2);
    uptake += ql * (cl - st.cv);
    caNum += ql * cl;
    q += ql;
    const f = st.fa[s] as number;
    const vaS = x.blocked[s] ? 0 : x.va * ((x.vent[2 * s] as number) + (x.vent[2 * s + 1] as number));
    let dF: number;
    if (vaS > 0) dF = vaS * 1000 * (x.fio2 - f - (1 / RQ - 1) * (x.paco2 / PI_DRY)) - uptake;
    else {
      dF = -uptake * (1 - f);
      if (!x.blocked[s] && x.massFlowFio2 !== null) dF += Math.max(0, uptake - MASS_FLOW_DEFICIT_ML_MIN * ((x.frcSide[s] as number) / Math.max(1, (x.frcSide[0] as number) + (x.frcSide[1] as number)))) * (x.massFlowFio2 - f);
    }
    st.fa[s] = Math.min(1, Math.max(0.001, f + (dF / Math.max(20, x.frcSide[s] as number)) * dt));
  }
  const ca = caNum / Math.max(1e-6, q);
  const vv = BLOOD_VENOUS_FRACTION * x.bloodL;
  st.cv = Math.max(0, st.cv + ((q * (ca - st.cv) - x.vo2) / vv) * dt);
  st.pao2 = po2ForContent(ca, x.tempC, x.paco2);
  st.sa = odc(st.pao2, x.tempC, x.paco2);
}
