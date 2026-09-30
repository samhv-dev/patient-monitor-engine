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
import { R_VR_BACK, V0_ART, ZC_AO } from './params.ts';
import { valveFlow, type Valve } from './valves.ts';
// hot-loop locals: module bindings of imported constants go through getters under the vitest transform [perf]
const L_compliance = compliance;
const L_RADIAL_FR_HZ = RADIAL_FR_HZ;
const L_RADIAL_GAIN = RADIAL_GAIN;
const L_RADIAL_ZETA = RADIAL_ZETA;
const L_WK_C = WK_C;
const L_WK_CK = WK_CK;
const L_WK_L = WK_L;
const L_WK_P0 = WK_P0;
const L_activationAt = activationAt;
const L_R_VR_BACK = R_VR_BACK;
const L_V0_ART = V0_ART;
const L_ZC_AO = ZC_AO;
const L_valveFlow = valveFlow;

/**
 * FU-8 (F6, I-07; R50 F4, orchestrator ruling 3 — Option D): a compartment cannot give blood it does not hold. A flow
 * OUT of a compartment is scaled by min(1, V / vEmpty) of that compartment's volume (chambers: absolute volume;
 * pulmonary arteries/veins: stressed volume — below it the vessels collapse, West zone 1); the systemic veins and the
 * atria collapse instead of holding a negative transmural pressure (floors in `evaluate`). Without it the passive
 * pressures bottom out (EDPVR → −A, linear atria/pulmonary compliances) while the downstream pressure keeps falling, and
 * a ≈ 3 mL/s forward leak ran the RV, LV and pulmonary bed to NEGATIVE volumes after an exsanguination arrest (VRV −273,
 * VLV −62, VPA −1, VPV −6 mL; CVP −1 to −3.5 on the monitor). `vEmpty` is SIZE-SCALED (profile: 5 mL × W/70, i.e.
 * 0.25 mL in a 3.5 kg neonate): an absolute 5 mL throttled small hearts (neonate CO 0.31 → 0.165 L/min) [ENG: V0_LV,
 * the smallest volume a chamber can still eject from].
 */
export const V_EMPTY_ML = 5;
const give = (q: number, vFrom: number, vTo: number, ve: number): number =>
  q >= 0 ? q * Math.min(1, Math.max(0, vFrom / ve)) : q * Math.min(1, Math.max(0, vTo / ve));

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
  /** FU-4 F1(a): reference resting intrathoracic stressed volume the compression works against, mL. */
  vCprRef: number;
  /** FU-8 (F6): the volume below which a compartment's outflow is throttled, mL (absent = V_EMPTY_ML; profile ×W/70). */
  vEmpty?: number;
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
  /** FU-4 F1(c): thoracic pressure retained on the VENOUS side through the release phase, mmHg (0 outside CPR). */
  cprRelease: (t: number) => number;
  qIn: number; // net volume in (+ fluid, − bleed), mL/s, into the systemic veins
  qVad: (lvp: number, aop: number) => number; // LV → aorta device flow (LVAD), mL/s
  qAortaSrc: (t: number) => number; // volume source in the aorta (IABP dV/dt), mL/s
  memoT?: number; // activation memo (set by evaluate) [perf]
  memoA?: number;
  memoAa?: number;
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

const WR = 2 * Math.PI * L_RADIAL_FR_HZ;

/** Evaluate every pressure and flow of state s at time t into o. */
export function evaluate(s: readonly number[], t: number, p: CircParams, d: CircDrive, o: CircOut): void {
  // RK4 evaluates t + h/2 twice and t + h twice (k4 and the outputs): the activation is memoised per time [perf]
  let a: number;
  let aa: number;
  if (d.memoT === t) {
    a = d.memoA as number;
    aa = d.memoAa as number;
  } else {
    a = L_activationAt(d.vent, t);
    aa = L_activationAt(d.atria, t);
    d.memoT = t;
    d.memoA = a;
    d.memoAa = aa;
  }
  const pit = d.pIt(t);
  const vlv = s[10] as number;
  const vrv = s[6] as number;
  let cc = d.cprCardiac(t);
  let ct = d.cprThoracic(t);
  let cr = 0;
  if (cc > 0 || ct > 0 || (cr = d.cprRelease(t)) > 0) {
    // FU-4 F1(a): a compression displaces blood. The pressure it generates scales with the intrathoracic stressed
    // volume available to displace, so an exsanguinated thorax generates no aortic pressure and no CPP.
    const vStr =
      Math.max(0, vlv - p.v0Lv) + Math.max(0, vrv - p.v0Rv) +
      Math.max(0, (s[5] as number) - p.v0Ra) + Math.max(0, (s[9] as number) - p.v0La) +
      Math.max(0, s[7] as number) + Math.max(0, s[8] as number);
    const f = Math.min(1, vStr / p.vCprRef);
    cc *= f;
    ct *= f;
    cr *= f;
  }
  const peri = Math.max(0, p.periA * (Math.exp(p.periLambda * (vlv + vrv + p.vFluid - p.v0Peri)) - 1));
  // FU-4 F1(c): incomplete chest recoil leaves a residual pressure on the collapsible venous side (RA, pulmonary bed)
  // through the release phase; the stiff pressurised aorta is not held up by it, so the Ao − RA gradient narrows to
  // the Paradis 1990 band instead of the ≈ 46 the full release gave.
  const ext = pit + ct + peri; // external pressure on the chambers (thoracic pump acts on everything intrathoracic)
  const extV = ext + cr; // venous/right-heart side: + the retained release pressure
  const dl = vlv - p.v0Lv;
  const dr = vrv - p.v0Rv;
  const pLv = a * p.eesLv * d.kLv * dl + (1 - a) * p.aLv * (Math.exp(p.betaLv * dl) - 1) + ext + cc;
  const pRv = a * p.eesRv * d.kRv * dr + (1 - a) * p.aRv * (Math.exp(p.betaRv * dr) - 1) + ext + cc;
  // FU-4 F1(c): while the chest is being compressed the thin-walled right heart and great veins are a Starling
  // resistor — they collapse rather than hold a negative transmural pressure, so the MEASURED atrial pressure tracks
  // the intrathoracic pressure (which is what a catheter reads: Paradis 1990's RA relaxation pressure of 15–25, not
  // the ≈ 4 an uncollapsed chamber gives). FU-8 (F6): outside CPR too — an atrium below its unstressed volume, and the
  // systemic veins below theirs, collapse instead of sucking (the transmural pressure is negative only then, so every
  // calibrated CVP rig is unchanged).
  const traRa = (p.eminRa + aa * (p.emaxRa - p.eminRa)) * ((s[5] as number) - p.v0Ra);
  const traLa = (p.eminLa + aa * (p.emaxLa - p.eminLa)) * ((s[9] as number) - p.v0La);
  const pRa = Math.max(0, traRa) + extV + cc;
  const pLa = Math.max(0, traLa) + extV + cc;
  const pSv = Math.max(0, (s[4] as number) - p.v0Sv) / p.cSv;
  const pPa = (s[7] as number) / p.cPa + pit + ct + cr;
  const pPv = (s[8] as number) / p.cPv + pit + ct + cr;
  const pc = s[0] as number;
  const ql = s[1] as number;
  const qVad = d.qVad(pLv, pc);
  // aortic valve against the Windkessel's characteristic impedance: P_ao = PC + Zc·(Q_av − QL) + ct. A balloon (IABP)
  // displaces volume in the descending aorta, i.e. into the compliance, not through the root's Zc (which turned a
  // 60 ms deflation into a −35 mmHg spike at the valve) [ENG]
  const pX = pc - L_ZC_AO * ql + ct;
  const qAv = L_valveFlow(p.av, pLv - pX, L_ZC_AO);
  const pAo = pX + L_ZC_AO * qAv;
  const qPv = L_valveFlow(p.pv, pRv - pPa, p.zPa);
  const dpv = pSv - pRa;
  o.pAo = pAo;
  o.pRad = pAo + (L_RADIAL_GAIN * 2 * L_RADIAL_ZETA * (s[3] as number)) / WR;
  o.pSv = pSv; o.pRa = pRa; o.pRv = pRv; o.pPa = pPa; o.pPaRoot = pPa + p.zPa * qPv; o.pPv = pPv; o.pLa = pLa; o.pLv = pLv;
  o.pPeri = peri; o.pIt = pit;
  const ve = p.vEmpty ?? V_EMPTY_ML;
  const vRa = s[5] as number;
  const vRv = s[6] as number;
  const vPa = s[7] as number;
  const vPv = s[8] as number;
  const vLa = s[9] as number;
  o.qAv = give(qAv, vlv, Infinity, ve);
  o.qPv = give(qPv, vRv, vPa, ve);
  o.qMv = give(L_valveFlow(p.mv, pLa - pLv), vLa, vlv, ve);
  o.qTv = give(L_valveFlow(p.tv, pRa - pRv), vRa, vRv, ve);
  o.qVr = give(dpv >= 0 ? dpv / p.rVr : dpv / (p.rVr * L_R_VR_BACK), Infinity, vRa, ve);
  o.qSys = (pc - pSv) / p.rSys;
  o.qLungL = give((pPa - pPv) / p.pvrL, vPa, vPv, ve);
  o.qLungR = give((pPa - pPv) / p.pvrR, vPa, vPv, ve);
  o.qPvla = give((pPv - pLa) / p.rPvla, vPv, vLa, ve);
  o.qVad = qVad;
  o.aVent = a;
  o.aAtria = aa;
}

const ev = createOut();
function deriv(t: number, s: readonly number[], ds: number[], p: CircParams, d: CircDrive): void {
  evaluate(s, t, p, d, ev);
  const qSrc = d.qAortaSrc(t);
  ds[0] = (ev.qAv + ev.qVad + qSrc - ev.qSys) / (L_compliance(s[0] as number) * p.cArt);
  ds[1] = (L_ZC_AO * (ev.qAv - (s[1] as number))) / L_WK_L;
  ds[2] = s[3] as number;
  ds[3] = WR * WR * (ev.pAo - (s[2] as number)) - 2 * L_RADIAL_ZETA * WR * (s[3] as number);
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
  const lo = L_WK_P0 - Math.log(3) / L_WK_CK; // below: C = 3·WK_C
  const hi = L_WK_P0 + Math.log(2) / L_WK_CK; // above: C = 0.5·WK_C
  const seg = (a: number, b: number): number => {
    // ∫ WK_C·e^{−k(p−P0)} dp from a to b inside [lo, hi]
    return (L_WK_C / L_WK_CK) * (Math.exp(-L_WK_CK * (a - L_WK_P0)) - Math.exp(-L_WK_CK * (b - L_WK_P0)));
  };
  let v = 0;
  const x = Math.max(0, pc);
  if (x <= lo) v = 3 * L_WK_C * x;
  else {
    v = 3 * L_WK_C * Math.max(0, lo) + seg(Math.max(0, lo), Math.min(x, hi));
    if (x > hi) v += 0.5 * L_WK_C * (x - hi);
  }
  return v * cArt;
}

/** Total blood volume represented by state s (mL): the unstressed arterial volume is bookkeeping only. */
export function totalVolume(s: readonly number[], p: CircParams): number {
  return L_V0_ART + arterialVolume(s[0] as number, p.cArt) + (s[4] as number) + (s[5] as number) + (s[6] as number) + (s[7] as number) + (s[8] as number) + (s[9] as number) + (s[10] as number);
}
