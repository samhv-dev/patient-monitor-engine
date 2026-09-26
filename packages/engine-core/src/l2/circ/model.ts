// CircModel: the L1-owned "haemodynamic integrator" (audit A4, R-A risk row) — the circuit state, its resolved
// parameters, the activations scheduled from the rhythm engine's beat/atrial records, the 10 Hz control layer
// (baroreflex, drugs, volume events, conditions) and per-beat truths. Stepped at 2 ms by the Stage 2 hemo pipeline
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { createBaro, K_PP, stepBaro, type BaroState } from './baroreflex.ts';
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugId } from './drugs.ts';
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, P_PL0 } from './params.ts';
import { DEFAULT_PROFILE, resolveProfile, type CircProfile, type ResolvedProfile } from './profile.ts';
import { stabilise, type Stabilised } from './stabilise.ts';

export const CTL_DT = 0.1; // control layer at 10 Hz (tables §2.1 step 6)
/**
 * R45(a) post-extrasystolic potentiation is a contractility (calcium) effect, not only Frank–Starling (research 03
 * §8.3, JAHA 2015): the beat after a premature one (RR < PESP_PREMATURE × the running normal RR, perfused or not)
 * gets its Emax raised by up to PESP_MAX for that one beat, scaled by prematurity [ENG magnitude, fitted to the
 * Stage 2 band +8–15 mmHg post-PVC SBP].
 */
export const PESP_MAX = 0.5;
export const PESP_PREMATURE = 0.8;

/** Per-beat truths published by the model (tables §2.1 step 5). */
export interface CircBeat {
  t: number; // activation onset
  sbp: number; dbp: number; map: number; // radial truth
  aoSys: number; aoDia: number;
  sv: number; // forward LV stroke volume (aortic valve), mL
  svRv: number;
  lvedv: number; lvesv: number; lvedp: number; lvsp: number;
  avOpen: number; avClose: number; // s after onset (−1 = did not open)
  dur: number; // to the next beat
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number;
}

export interface VolumeEvent {
  rate: number; // mL/s (+ fluid, − bleed)
  until: number;
}

export interface CircModelState {
  prof: ResolvedProfile;
  weightKg: number;
  base: CircParams; // stabilised profile parameters
  p: CircParams; // effective parameters (base × reflex × drugs × conditions)
  s: number[];
  t: number; // time of s
  vent: Activation[];
  atria: Activation[];
  kLv: number;
  kRv: number;
  baro: BaroState;
  boluses: Bolus[];
  vol: VolumeEvent[];
  hrModel: number; // bpm the reflex/drugs ask the rhythm engine for (MODELED)
  ctlNext: number;
  mapSum: number;
  mapN: number;
  raTmSum: number; // R45(b): transmural RA pressure accumulator for the cardiopulmonary limb
  acc: BeatAcc | null;
  beats: CircBeat[]; // last 16
  lastEjT: number;
  mapSetPinned: boolean;
  lastVentT: number; // R45(a): last ventricular depolarisation (perfused or not)
  rrRef: number; // R45(a): running normal RR, s
  pespNext: number; // R45(a): Emax boost for the next beat
  ref: Stabilised['ref']; // the stabilised resting reference (coronary demand, pulsatile sensing)
  /** Extra multipliers owned by other modules (coronary ischaemia, conditions): applied at the next control step. */
  ext: { kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number };
}

export function createCircModel(profile: CircProfile = DEFAULT_PROFILE): CircModelState {
  const prof = resolveProfile(profile);
  const st = stabilise(prof);
  return {
    prof, weightKg: profile.weightKg, base: st.params, p: structuredClone(st.params), s: st.s, t: 0,
    vent: [], atria: [], kLv: 1, kRv: 1, baro: createBaro(st.ref.map, st.ref.cvp - P_PL0), boluses: [], vol: [], hrModel: prof.targets.hr,
    ctlNext: 0, mapSum: 0, mapN: 0, raTmSum: 0, acc: null, beats: [], lastEjT: 0, mapSetPinned: false, lastVentT: -1, rrRef: 60 / prof.targets.hr, pespNext: 0, ref: st.ref,
    ext: { kLv: 1, kRv: 1, pvr: 1, vFluid: 0, pPtx: 0, kIsch: 1 },
  };
}

/** A mechanical beat at time t (the rhythm engine's R time). Pulseless beats schedule nothing (activation off). */
export function circOnBeat(m: CircModelState, t: number, hr: number, origin: string, perfused: boolean): void {
  // R45(a): prematurity → potentiation of the NEXT beat; normal intervals update the reference RR
  const boost = m.pespNext;
  m.pespNext = 0;
  if (m.lastVentT >= 0) {
    const q = (t - m.lastVentT) / m.rrRef;
    if (q < PESP_PREMATURE) m.pespNext = PESP_MAX * Math.min(1, (PESP_PREMATURE - q) / (PESP_PREMATURE - 0.4));
    else if (q < 1.25) m.rrRef += (t - m.lastVentT - m.rrRef) * 0.2;
  }
  m.lastVentT = t;
  if (!perfused) return;
  const amp = (origin === 'ventricular' || origin === 'paced' ? DYSSYNC : 1) * (1 + boost);
  m.vent.push({ t0: t, T: activationPeriodS(Math.max(30, Math.min(250, hr))), amp });
}

/** An atrial depolarisation (P onset): atrial contraction, whatever the ventricles are doing (cannon waves emerge). */
export function circOnAtrial(m: CircModelState, tP: number): void {
  m.atria.push({ t0: tP + ATRIAL_DELAY_S, T: ATRIAL_T_S, amp: 1 });
}

export function circGiveDrug(m: CircModelState, drug: DrugId, doseMg: number): void {
  m.boluses.push({ drug, t: m.t, scale: bolusScale(drug, doseMg, m.weightKg, m.boluses) });
}

/** Bleed (negative) or infuse (positive) `ml` over `overS` seconds from now. */
export function circVolume(m: CircModelState, ml: number, overS: number): void {
  m.vol.push({ rate: ml / Math.max(0.1, overS), until: m.t + Math.max(0.1, overS) });
}

/** Environment the pipeline supplies each interval: pleural pressure, CPR, devices. */
export interface CircEnv {
  pIt: (t: number) => number;
  cprCardiac: (t: number) => number;
  cprThoracic: (t: number) => number;
  qVad: (lvp: number, aop: number) => number;
  qAortaSrc: (t: number) => number;
  modeled: boolean; // reflexes and the HR request run only in MODELED mode
}

const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

function control(m: CircModelState, env: CircEnv): void {
  const map = m.mapN > 0 ? m.mapSum / m.mapN : m.baro.mapLp;
  // R45(b): pulsatile sensing — the last three beats' pulse pressure relative to the resting one (K_PP)
  const lb = m.beats.slice(-3);
  const ppNow = lb.length ? lb.reduce((a, x) => a + x.sbp - x.dbp, 0) / lb.length : m.ref.sbp - m.ref.dbp;
  const sensed = map + K_PP * (ppNow - (m.ref.sbp - m.ref.dbp));
  const raTm = m.mapN > 0 ? m.raTmSum / m.mapN : m.baro.cpLp;
  m.raTmSum = 0;
  m.mapSum = 0;
  m.mapN = 0;
  const de = drugEffect(m.boluses, m.t, m.prof.betaBlockC);
  const w = m.weightKg / 70;
  const b = env.modeled
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: m.prof.betaBlock, betaBlockC: m.prof.betaBlockC, weightScale: w, pinnedSet: m.mapSetPinned }, raTm)
    : { rrMs: 0, hrF: 1, svrF: 1, eesF: 1, dV0: 0, cSvF: 1 };
  const p = m.p;
  const base = m.base;
  p.rSys = base.rSys * b.svrF * de.svr;
  p.v0Sv = base.v0Sv + b.dV0 + de.v0Frac * m.prof.bloodVolumeMl;
  p.cSv = base.cSv * b.cSvF;
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr;
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr;
  p.vFluid = base.vFluid + m.ext.vFluid;
  m.kLv = b.eesF * de.ees * m.ext.kLv * m.ext.kIsch;
  m.kRv = b.eesF * de.ees * m.ext.kRv;
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr) + b.rrMs / 1000;
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
  m.vol = m.vol.filter((v) => v.until > m.t);
}

function closeBeat(m: CircModelState, t: number): void {
  const a = m.acc;
  if (!a || a.n < 5) return;
  m.beats.push({
    t: a.t, sbp: a.sbp, dbp: a.dbp, map: a.sum / a.n, aoSys: a.aoS, aoDia: a.aoD, sv: a.sv, svRv: a.svRv, lvedv: a.edv, lvesv: a.esv,
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t,
  });
  if (m.beats.length > 16) m.beats.shift();
}

const newAcc = (t: number, edv: number, edp: number): BeatAcc => ({
  t, sbp: -Infinity, dbp: Infinity, sum: 0, n: 0, aoS: -Infinity, aoD: Infinity, sv: 0, svRv: 0, edv, esv: edv, edp, lvsp: -Infinity, open: -1, close: -1, prevQ: 0,
});

/**
 * Advance the model to time tEnd in 2 ms RK4 steps; `o` receives the algebraic outputs at each step end and
 * `onStep(o, t)` (optional) sees every one of them (the pipeline samples the radial pressure for its transducer).
 */
export function stepCircModel(m: CircModelState, tEnd: number, env: CircEnv, o: CircOut, onStep?: (o: CircOut, t: number) => void): void {
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt: (t) => env.pIt(t) + m.ext.pPtx, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic,
    qIn: 0, qVad: env.qVad, qAortaSrc: env.qAortaSrc,
  };
  while (m.t < tEnd - 1e-9) {
    if (m.t >= m.ctlNext - 1e-9) {
      control(m, env);
      m.ctlNext += CTL_DT;
      d.kLv = m.kLv;
      d.kRv = m.kRv;
    }
    let q = 0;
    for (const v of m.vol) if (v.until > m.t) q += v.rate;
    d.qIn = q;
    // a beat window opens at each ventricular activation onset inside this step
    const next = m.vent.find((x) => x.t0 > m.t && x.t0 <= m.t + H_S);
    if (next) {
      closeBeat(m, next.t0);
      evaluate(m.s, m.t, m.p, d, o);
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt);
    }
    stepCirc(m.s, m.t, H_S, m.p, d);
    m.t += H_S;
    evaluate(m.s, m.t, m.p, d, o);
    m.mapSum += o.pRad;
    m.raTmSum += o.pRa - o.pIt;
    m.mapN++;
    const a = m.acc;
    if (a) {
      if (o.pRad > a.sbp) a.sbp = o.pRad;
      if (o.pRad < a.dbp) a.dbp = o.pRad;
      a.sum += o.pRad;
      a.n++;
      if (o.pAo > a.aoS) a.aoS = o.pAo;
      if (o.pAo < a.aoD) a.aoD = o.pAo;
      a.sv += Math.max(0, o.qAv) * H_S;
      a.svRv += Math.max(0, o.qPv) * H_S;
      const v = m.s[S.VLV] as number;
      if (v < a.esv) a.esv = v;
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
      if (a.prevQ <= 1 && o.qAv > 1 && a.open < 0) {
        a.open = m.t - a.t;
        m.lastEjT = m.t;
      }
      if (a.prevQ > 1 && o.qAv <= 1 && a.open >= 0) a.close = m.t - a.t;
      a.prevQ = o.qAv;
    }
    onStep?.(o, m.t);
  }
  m.vent = pruneActivations(m.vent, m.t);
  m.atria = pruneActivations(m.atria, m.t);
}

/** Cardiac output (L/min) from the last beats within 10 s; 0 when nothing ejected for 3 s. */
export function circCardiacOutput(m: CircModelState): number {
  if (m.t - m.lastEjT > 3) return 0;
  const bs = m.beats.filter((b) => m.t - b.t < 10);
  if (bs.length < 2) return 0;
  const sv = bs.reduce((a, b) => a + b.sv, 0);
  const dur = bs.reduce((a, b) => a + b.dur, 0);
  return (sv / Math.max(0.1, dur)) * 0.06;
}
