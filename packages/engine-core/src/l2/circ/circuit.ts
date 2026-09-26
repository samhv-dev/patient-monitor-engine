// The Stage 7a circuit (R31, R42; tables §2.1 as amended by audit A1/A2): four time-varying-elastance chambers,
// four valves, the Stage 2 systemic 4-element Windkessel (+ its aorta→radial resonator), systemic veins, a
// pulmonary arterial compartment with characteristic impedance, two parallel lung vascular beds, pulmonary veins,
// a pericardium and a continuous pleural (intrathoracic) pressure. Integrated with classical RK4 at 2 ms.
//
// State s (plain number[]; volumes in mL):
//   0 PC  systemic capacitor pressure (Stage 2 s[0])      C(P)·dPC/dt = Q_ao − (PC − P_sv)/R_sys
//   1 QL  Windkessel inertance flow (Stage 2 s[1])        L·dQL/dt = Zc·(Q_ao − QL)
//   2 X, 3 XD  aorta→radial resonator (Stage 2 s[2], s[3])
//   4 VSV systemic venous volume (total)                  P_sv = (VSV − v0Sv)/cSv
//   5 VRA, 6 VRV, 9 VLA, 10 VLV chamber volumes           P = E(t)·(V − V0) (+ EDPVR) + P_peri + P_it
//   7 VPA pulmonary arterial stressed volume              P_pa = VPA/cPa + P_it ; root = P_pa + Zpa·Q_pv
//   8 VPV pulmonary venous stressed volume                P_pv = VPV/cPv + P_it   (≈ PCWP)
// Chamber pressure (Smith 2004 form): ventricles P = a·Emax·(V − V0) + (1 − a)·A·(e^{β(V − V0)} − 1); atria
// P = (Emin + a·(Emax − Emin))·(V − V0); every intrathoracic compartment adds P_it (pleural, audit R-B) and the
// four chambers add P_peri = A_p·(e^{λ(V_LV + V_RV + vFluid − v0Peri)} − 1) floored at 0 (tables §2.2).
import { compliance } from '../hemo/circulation.ts';
import { RADIAL_FR_HZ, RADIAL_GAIN, RADIAL_ZETA, WK_C, WK_CK, WK_L, WK_P0 } from '../hemo/params.ts';
import { activationAt, type Activation } from './activation.ts';
import { R_VR_BACK, V0_ART, ZC_AO as WK_ZC } from './params.ts';
import { valveFlow, type Valve } from './valves.ts';

export const N_STATE = 11;
export const S = { PC: 0, QL: 1, X: 2, XD: 3, VSV: 4, VRA: 5, VRV: 6, VPA: 7, VPV: 8, VLA: 9, VLV: 10 } as const;

/** Resolved circuit parameters (profile + conditions + reflex/drug multipliers applied). Plain data. */
export interface CircParams {
  eesLv: number; v0Lv: number; aLv: number; betaLv: number;
  eesRv: number; v0Rv: number; aRv: number; betaRv: number;
  eminRa: number; emaxRa: number; v0Ra: number;
  eminLa: number; emaxLa: number; v0La: number;
  rSys: number; cArt: number; // cArt multiplies Stage 2's C(P) (arterial stiffness)
  cSv: number; v0Sv: number; rVr: number;
  cPa: number; zPa: number; pvrL: number; pvrR: number; cPv: number; rPvla: number;
  tv: Valve; pv: Valve; mv: Valve; av: Valve;
  periA: number; periLambda: number; v0Peri: number; vFluid: number;
}

/** Time-dependent inputs for one integration interval (built per tick by the model; not stored). */
export interface CircDrive {
  vent: readonly Activation[];
  atria: readonly Activation[];
  kLv: number; // LV contractility multiplier on Emax (drugs, reflex, ischaemia)
  kRv: number;
  pIt: (t: number) => number; // pleural pressure, mmHg
  cprCardiac: (t: number) => number; // direct compression on the four chambers, mmHg
  cprThoracic: (t: number) => number; // thoracic pump on intrathoracic compartments and the aortic root, mmHg
  qIn: number; // net volume in (+ fluid, − bleed), mL/s, into the systemic veins
  qVad: (lvp: number, aop: number) => number; // LV → aorta device flow (LVAD), mL/s
  qAortaSrc: (t: number) => number; // volume source in the aorta (IABP dV/dt), mL/s
}

/** Algebraic outputs at one instant (pressures mmHg, flows mL/s). Reused, never allocated per call. */
export interface CircOut {
  pAo: number; pRad: number; pSv: number; pRa: number; pRv: number; pPa: number; pPaRoot: number; pPv: number; pLa: number; pLv: number;
  pPeri: number; pIt: number; qAv: number; qMv: number; qTv: number; qPv: number; qVr: number; qSys: number; qLungL: number; qLungR: number;
  qPvla: number; qVad: number; aVent: number; aAtria: number;
}

export function createOut(): CircOut {
  return {
    pAo: 0, pRad: 0, pSv: 0, pRa: 0, pRv: 0, pPa: 0, pPaRoot: 0, pPv: 0, pLa: 0, pLv: 0, pPeri: 0, pIt: 0, qAv: 0, qMv: 0, qTv: 0,
    qPv: 0, qVr: 0, qSys: 0, qLungL: 0, qLungR: 0, qPvla: 0, qVad: 0, aVent: 0, aAtria: 0,
  };
}

const WR = 2 * Math.PI * RADIAL_FR_HZ;

/** Evaluate every pressure and flow of state s at time t into o. */
export function evaluate(s: readonly number[], t: number, p: CircParams, d: CircDrive, o: CircOut): void {
  const a = activationAt(d.vent, t);
  const aa = activationAt(d.atria, t);
  const pit = d.pIt(t);
  const cc = d.cprCardiac(t);
  const ct = d.cprThoracic(t);
  const vlv = s[10] as number;
  const vrv = s[6] as number;
  const peri = Math.max(0, p.periA * (Math.exp(p.periLambda * (vlv + vrv + p.vFluid - p.v0Peri)) - 1));
  const ext = pit + ct + peri; // external pressure on the chambers (thoracic pump acts on everything intrathoracic)
  const dl = vlv - p.v0Lv;
  const dr = vrv - p.v0Rv;
  const pLv = a * p.eesLv * d.kLv * dl + (1 - a) * p.aLv * (Math.exp(p.betaLv * dl) - 1) + ext + cc;
  const pRv = a * p.eesRv * d.kRv * dr + (1 - a) * p.aRv * (Math.exp(p.betaRv * dr) - 1) + ext + cc;
  const pRa = (p.eminRa + aa * (p.emaxRa - p.eminRa)) * ((s[5] as number) - p.v0Ra) + ext + cc;
  const pLa = (p.eminLa + aa * (p.emaxLa - p.eminLa)) * ((s[9] as number) - p.v0La) + ext + cc;
  const pSv = ((s[4] as number) - p.v0Sv) / p.cSv;
  const pPa = (s[7] as number) / p.cPa + pit + ct;
  const pPv = (s[8] as number) / p.cPv + pit + ct;
  const pc = s[0] as number;
  const ql = s[1] as number;
  const qVad = d.qVad(pLv, pc);
  const qSrc = d.qAortaSrc(t);
  // aortic valve against the Windkessel's characteristic impedance: P_ao = PC + Zc·(Q_av + Q_src − QL) + ct
  const pX = pc + WK_ZC * (qSrc - ql) + ct;
  const qAv = valveFlow({ r: p.av.r + WK_ZC, k: p.av.k, eroa: p.av.eroa }, pLv - pX);
  const pAo = pX + WK_ZC * qAv;
  const qPv = valveFlow({ r: p.pv.r + p.zPa, k: p.pv.k, eroa: p.pv.eroa }, pRv - pPa);
  const dpv = pSv - pRa;
  o.pAo = pAo;
  o.pRad = pAo + (RADIAL_GAIN * 2 * RADIAL_ZETA * (s[3] as number)) / WR;
  o.pSv = pSv; o.pRa = pRa; o.pRv = pRv; o.pPa = pPa; o.pPaRoot = pPa + p.zPa * qPv; o.pPv = pPv; o.pLa = pLa; o.pLv = pLv;
  o.pPeri = peri; o.pIt = pit;
  o.qAv = qAv; o.qPv = qPv;
  o.qMv = valveFlow(p.mv, pLa - pLv);
  o.qTv = valveFlow(p.tv, pRa - pRv);
  o.qVr = dpv >= 0 ? dpv / p.rVr : dpv / (p.rVr * R_VR_BACK);
  o.qSys = (pc - pSv) / p.rSys;
  o.qLungL = (pPa - pPv) / p.pvrL;
  o.qLungR = (pPa - pPv) / p.pvrR;
  o.qPvla = (pPv - pLa) / p.rPvla;
  o.qVad = qVad;
  o.aVent = a;
  o.aAtria = aa;
}

const ev = createOut();
function deriv(t: number, s: readonly number[], ds: number[], p: CircParams, d: CircDrive): void {
  evaluate(s, t, p, d, ev);
  const qSrc = d.qAortaSrc(t);
  ds[0] = (ev.qAv + ev.qVad + qSrc - ev.qSys) / (compliance(s[0] as number) * p.cArt);
  ds[1] = (WK_ZC * (ev.qAv + qSrc - (s[1] as number))) / WK_L;
  ds[2] = s[3] as number;
  ds[3] = WR * WR * (ev.pAo - (s[2] as number)) - 2 * RADIAL_ZETA * WR * (s[3] as number);
  ds[4] = ev.qSys - ev.qVr + d.qIn;
  ds[5] = ev.qVr - ev.qTv;
  ds[6] = ev.qTv - ev.qPv;
  ds[7] = ev.qPv - ev.qLungL - ev.qLungR;
  ds[8] = ev.qLungL + ev.qLungR - ev.qPvla;
  ds[9] = ev.qPvla - ev.qMv;
  ds[10] = ev.qMv - ev.qAv - ev.qVad;
}

const k1 = new Array<number>(N_STATE).fill(0);
const k2 = new Array<number>(N_STATE).fill(0);
const k3 = new Array<number>(N_STATE).fill(0);
const k4 = new Array<number>(N_STATE).fill(0);
const tmp = new Array<number>(N_STATE).fill(0);

/** Advance s in place from t to t + h (classical RK4). */
export function stepCirc(s: number[], t: number, h: number, p: CircParams, d: CircDrive): void {
  deriv(t, s, k1, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + (h / 2) * (k1[i] as number);
  deriv(t + h / 2, tmp, k2, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + (h / 2) * (k2[i] as number);
  deriv(t + h / 2, tmp, k3, p, d);
  for (let i = 0; i < N_STATE; i++) tmp[i] = (s[i] as number) + h * (k3[i] as number);
  deriv(t + h, tmp, k4, p, d);
  for (let i = 0; i < N_STATE; i++) {
    s[i] = (s[i] as number) + (h / 6) * ((k1[i] as number) + 2 * (k2[i] as number) + 2 * (k3[i] as number) + (k4[i] as number));
  }
}

/** Stressed arterial volume ∫₀^PC C(p) dp for Stage 2's C(P) = WK_C·clamp(e^{−k(P−P0)}, 0.5, 3), × cArt. */
export function arterialVolume(pc: number, cArt: number): number {
  const lo = WK_P0 - Math.log(3) / WK_CK; // below: C = 3·WK_C
  const hi = WK_P0 + Math.log(2) / WK_CK; // above: C = 0.5·WK_C
  const seg = (a: number, b: number): number => {
    // ∫ WK_C·e^{−k(p−P0)} dp from a to b inside [lo, hi]
    return (WK_C / WK_CK) * (Math.exp(-WK_CK * (a - WK_P0)) - Math.exp(-WK_CK * (b - WK_P0)));
  };
  let v = 0;
  const x = Math.max(0, pc);
  if (x <= lo) v = 3 * WK_C * x;
  else {
    v = 3 * WK_C * Math.max(0, lo) + seg(Math.max(0, lo), Math.min(x, hi));
    if (x > hi) v += 0.5 * WK_C * (x - hi);
  }
  return v * cArt;
}

/** Total blood volume represented by state s (mL): the unstressed arterial volume is bookkeeping only. */
export function totalVolume(s: readonly number[], p: CircParams): number {
  return V0_ART + arterialVolume(s[0] as number, p.cArt) + (s[4] as number) + (s[5] as number) + (s[6] as number) + (s[7] as number) + (s[8] as number) + (s[9] as number) + (s[10] as number);
}
