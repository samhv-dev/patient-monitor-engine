// CircModel: the L1-owned "haemodynamic integrator" (audit A4, R-A risk row) — the circuit state, its resolved
// parameters, the activations scheduled from the rhythm engine's beat/atrial records, the 10 Hz control layer
// (baroreflex, drugs, volume events, conditions) and per-beat truths. Stepped at 2 ms by the Stage 2 hemo pipeline
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { createBaro, K_PP, stepBaro, type BaroState } from './baroreflex.ts';
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugEffect, type DrugId } from './drugs.ts';
import { betaBlunt } from '../pk/pd.ts'; // Stage 7g
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, P_PL0 } from './params.ts';
import { DEFAULT_PROFILE, resolveProfile, type CircProfile, type ResolvedProfile } from './profile.ts';
import { stabilise, type Stabilised } from './stabilise.ts';
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';

// hot-loop locals (imported bindings are getters under the vitest transform) [perf]
const L_H = H_S;
const L_evaluate = evaluate;
const L_stepCirc = stepCirc;
export const CTL_DT = 0.1; // control layer at 10 Hz (tables §2.1 step 6)
/**
 * R45(a) post-extrasystolic potentiation is a contractility (calcium) effect, not only Frank–Starling (research 03
 * §8.3, JAHA 2015): the beat after a premature one (RR < PESP_PREMATURE × the running normal RR, perfused or not)
 * gets its Emax raised by up to PESP_MAX for that one beat, scaled by prematurity [ENG magnitude, fitted to the
 * Stage 2 band +8–15 mmHg post-PVC SBP].
 */
/** Cardiac-output averaging time constant (CO follows compressions and beats alike) [ENG]. */
export const CO_TAU_S = 4;
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
  origin?: string; // rhythm-engine origin of the beat (sinus, ventricular, paced, …)
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number; origin?: string;
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
  /** Aortic-valve openings since the pipeline last looked: time, EDV and the stroke volume they will eject (estimate). */
  opens: { t: number; sv: number }[];
  lastEjT: number;
  qFwd: number; // LPF (τ CO_TAU_S) of the forward aortic-valve + LVAD flow, mL/s: CO for beats AND compressions
  mapSetPinned: boolean;
  /** MANUAL tracker outputs (Task 14; neutral in MODELED): LV Emax ×, systemic R (null = base), venous V0 +, RV Emax ×, PVR (null = base). */
  man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null };
  lastVentT: number; // R45(a): last ventricular depolarisation (perfused or not)
  rrRef: number; // R45(a): running normal RR, s
  pespNext: number; // R45(a): Emax boost for the next beat
  ref: Stabilised['ref']; // the stabilised resting reference (coronary demand, pulsatile sensing)
  cor: CoronaryState; // R23 coronary supply/demand (stepped at 1 Hz by the pipeline)
  chemo: { sao2: number; paco2: number }; // chemoreflex inputs (written at 1 Hz by the pipeline from L1 truths)
  /**
   * Extra multipliers owned by other modules (coronary ischaemia, conditions; 7b lungs via R46): applied at the next
   * control step. pvrLung × both beds, pvrLungL/R × one bed (HPV, one-lung ventilation, unilateral disease); default 1.
   */
  ext: {
    kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number;
    pvrLung?: number; pvrLungL?: number; pvrLungR?: number; // R46 (7b)
    rSysF?: number; hrF?: number; // R48 (7d, Cushing response): systemic resistance and HR set-point multipliers
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
  };
}

export function createCircModel(profile: CircProfile = DEFAULT_PROFILE): CircModelState {
  const prof = resolveProfile(profile);
  const st = stabilise(prof);
  return {
    prof, weightKg: profile.weightKg, base: st.params, p: structuredClone(st.params), s: st.s, t: 0,
    vent: [], atria: [], kLv: 1, kRv: 1, baro: createBaro(st.ref.map, st.ref.cvp - P_PL0), boluses: [], vol: [], hrModel: prof.targets.hr,
    ctlNext: 0, mapSum: 0, mapN: 0, raTmSum: 0, acc: null, beats: [], opens: [], lastEjT: 0, qFwd: st.ref.co / 0.06, mapSetPinned: false, man: { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null }, lastVentT: -1, rrRef: 60 / prof.targets.hr, pespNext: 0, ref: st.ref, cor: createCoronary(st.ref), chemo: { sao2: 0.97, paco2: 40 },
    ext: { kLv: 1, kRv: 1, pvr: 1, vFluid: 0, pPtx: 0, kIsch: 1 },
  };
}

/** A mechanical beat at time t (the rhythm engine's R time). Pulseless beats schedule nothing (activation off). */
/**
 * `eff` (0–1): mechanical efficiency of a dyssynchronous ventricular rhythm relative to a well-conducted VT ≤ 150/min,
 * from the rhythm engine's k_rhythm (brief §4.8, "shared by both modes": VT 0.6 → 0.2 above 200/min, torsades 0.1);
 * the filling part of k_rhythm is NOT used — filling is emergent here.
 */
export function circOnBeat(m: CircModelState, t: number, hr: number, origin: string, perfused: boolean, eff = 1): void {
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
  const amp = (origin === 'ventricular' || origin === 'paced' ? DYSSYNC : 1) * Math.min(1, Math.max(0, eff)) * (1 + boost);
  m.vent.push({ t0: t, T: activationPeriodS(Math.max(30, Math.min(250, hr))), amp, origin });
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

const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null } as const;
const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

/** Chemoreflex → circulation (B §4.9; tables §1.1). Hypoxic HR sign by age band; hypercapnic pressor response. */
export function chemoFactors(c: { sao2: number; paco2: number }, band: string): { hrF: number; svrF: number } {
  let hrF = 1;
  const hyp = Math.max(0, 0.85 - c.sao2); // below 85 %
  if (hyp > 0) {
    const brady = band === 'neonate' || band === 'infant' || c.sao2 < 0.6;
    hrF = brady ? Math.max(0.5, 1 - 2.5 * hyp) : Math.min(1.3, 1 + 1.2 * hyp); // plan slope 1.6 failed its own test (SaO2 75 % infant → HR ×0.84, wanted < 0.8) [ENG]
  }
  const hcap = Math.min(0.2, Math.max(0, c.paco2 - 50) * 0.01); // +1 %/mmHg above 50, capped at +20 % [ENG]
  return { hrF: hrF * (1 + hcap), svrF: 1 + hcap };
}

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
  const d7 = m.ext.drug; // Stage 7g: multipliers from l2/pk (the 7a bolus list stays empty once 7g consumes drug events)
  if (d7) {
    de.hr *= d7.hr; de.ees *= d7.ees; de.svr *= d7.svr; de.v0Frac += d7.v0Frac; de.pvr *= d7.pvr; de.gv *= d7.gv; de.gvHr *= d7.gvHr;
  }
  const w = m.weightKg / 70;
  const b = env.modeled
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv, gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned }, raTm)
    : { rrMs: 0, hrF: 1, svrF: 1, eesF: 1, dV0: 0, cSvF: 1 };
  const ch = env.modeled ? chemoFactors(m.chemo, m.prof.band) : { hrF: 1, svrF: 1 }; // Task 19
  const p = m.p;
  const base = m.base;
  const man = env.modeled ? NEUTRAL_MAN : m.man; // Stage 7a Task 14: the MANUAL tracker's solution
  const x = m.ext; // R48/R49 multipliers (default 1; endoDV0Frac default 0)
  p.rSys = (man.rSys ?? base.rSys) * b.svrF * de.svr * ch.svrF * (x.rSysF ?? 1) * (x.endoSvrF ?? 1);
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + b.dV0 + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
  p.cSv = base.cSv * b.cSvF;
  const pvrF = man.pvr === null ? 1 : man.pvr / ((base.pvrL * base.pvrR) / (base.pvrL + base.pvrR));
  const lung = m.ext.pvrLung ?? 1; // R46 (7b): per-lung PVR multipliers on the per-lung flow split
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungL ?? 1);
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungR ?? 1);
  p.vFluid = base.vFluid + m.ext.vFluid;
  const kc = x.kChem ?? 1;
  m.kLv = b.eesF * de.ees * m.ext.kLv * m.ext.kIsch * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
  // tables §3 "Effects": ischaemic diastolic stiffening, β_LV × (1 + 0.5·δ) — with δ taken from the filtered
  // contractility loss (kIsch = 1 − G_ISCH·δ), so LVEDP rises as the ischaemic spiral develops (R23)
  p.betaLv = base.betaLv * (1 + (0.5 * (1 - m.ext.kIsch)) / G_ISCH);
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
  p.emaxRa = base.eminRa + (base.emaxRa - base.eminRa) * kc; // atrial active elastance (7c kChem)
  p.emaxLa = base.eminLa + (base.emaxLa - base.eminLa) * kc;
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0)) + b.rrMs / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
  m.vol = m.vol.filter((v) => v.until > m.t);
}

function closeBeat(m: CircModelState, t: number): void {
  const a = m.acc;
  if (!a || a.n < 5) return;
  m.beats.push({
    t: a.t, sbp: a.sbp, dbp: a.dbp, map: a.sum / a.n, aoSys: a.aoS, aoDia: a.aoD, sv: a.sv, svRv: a.svRv, lvedv: a.edv, lvesv: a.esv,
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t, origin: a.origin,
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
  // RK4 asks for the inputs at t, t + h/2 (twice), t + h and again at t + h for the outputs: remember the last two
  // pleural values (the breath-driver lookup is the costliest input) [perf]
  let t1 = Number.NaN, v1 = 0, t2 = Number.NaN, v2 = 0;
  const pIt = (t: number): number => {
    if (t === t1) return v1;
    if (t === t2) return v2;
    const v = env.pIt(t) + m.ext.pPtx;
    t2 = t1;
    v2 = v1;
    t1 = t;
    v1 = v;
    return v;
  };
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic,
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
    const next = m.vent.find((x) => x.t0 > m.t && x.t0 <= m.t + L_H);
    if (next) {
      closeBeat(m, next.t0);
      L_evaluate(m.s, m.t, m.p, d, o);
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt);
      if (next.origin !== undefined) m.acc.origin = next.origin;
    }
    L_stepCirc(m.s, m.t, L_H, m.p, d);
    m.t += L_H;
    L_evaluate(m.s, m.t, m.p, d, o);
    m.qFwd += (Math.max(0, o.qAv) + o.qVad - m.qFwd) * (L_H / CO_TAU_S);
    if (o.qAv > 1 && env.cprCardiac(m.t) > 0) m.lastEjT = m.t; // a compression that ejects (beats set it below)
    m.mapSum += o.pRad;
    m.raTmSum += o.pRa - o.pIt - o.pPeri; // atrial stretch: transmural across the wall (pericardial pressure compresses)
    m.mapN++;
    const a = m.acc;
    if (a) {
      if (o.pRad > a.sbp) a.sbp = o.pRad;
      if (o.pRad < a.dbp) a.dbp = o.pRad;
      a.sum += o.pRad;
      a.n++;
      if (o.pAo > a.aoS) a.aoS = o.pAo;
      if (o.pAo < a.aoD) a.aoD = o.pAo;
      a.sv += Math.max(0, o.qAv) * L_H;
      a.svRv += Math.max(0, o.qPv) * L_H;
      const v = m.s[S.VLV] as number;
      if (v < a.esv) a.esv = v;
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
      if (a.prevQ <= 1 && o.qAv > 1 && a.open < 0) {
        a.open = m.t - a.t;
        m.lastEjT = m.t;
        // the pleth needs its pulse when the valve opens: SV estimated as EDV − the last beat's ESV
        const lb = m.beats[m.beats.length - 1];
        m.opens.push({ t: m.t, sv: Math.max(0, a.edv - (lb ? lb.lvesv : a.edv * 0.4)) });
        if (m.opens.length > 8) m.opens.shift();
      }
      if (a.prevQ > 1 && o.qAv <= 1 && a.open >= 0) a.close = m.t - a.t;
      a.prevQ = o.qAv;
    }
    onStep?.(o, m.t);
  }
  m.vent = pruneActivations(m.vent, m.t);
  m.atria = pruneActivations(m.atria, m.t);
}

/** Cardiac output (L/min): forward aortic + LVAD flow averaged over ≈ 4 s (beats and CPR alike); 0 when nothing ejected for 3 s. */
export function circCardiacOutput(m: CircModelState): number {
  if (m.t - m.lastEjT > 3) return 0;
  return m.qFwd * 0.06;
}
