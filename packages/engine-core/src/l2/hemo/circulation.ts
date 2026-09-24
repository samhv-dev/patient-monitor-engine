// Systemic and pulmonary circulations (brief §4.2; research 03 §2.8, §2.10), integrated together with RK4
// at 2 ms substeps (four per 125 Hz sample). State vector s:
//   s[0] Pc  capacitor (distal) pressure            C·dPc/dt = Q − (Pc − P_floor)/R
//   s[1] QL  inertance flow                          L·dQL/dt = Zc·(Q − QL)
//        P_aortic = Pc + Zc·(Q − QL) + P_thoracic(CPR)            (4-element Windkessel, Stergiopulos)
//   s[2], s[3]  aorta→radial transfer: a 2nd-order resonator driven by P_aortic,
//        x'' = ωr²·(P_aortic − x) − 2ζr·ωr·x',   P_radial = P_aortic + G·(2ζr/ωr)·x'
//        i.e. a resonant PEAKING filter (unity gain at DC and at high frequency, 1 + G at f_r), whose gain G is
//        "tuned so that radial SBP exceeds aortic SBP by 5–20 mmHg" (brief §4.2). A plain low-pass would also
//        strip the upstroke's high frequencies, and an underdamped transducer would then have nothing to ring on.
//   s[4] Ppa pulmonary capacitor pressure           Cp·dPpa/dt = Qrv − (Ppa − PAWP)/Rp ;  PAP = Ppa + Zp·Qrv
import { flowAt, pressureAt, type Pulse } from './ejection.ts';
import { PA_C, PA_ZC, RADIAL_FR_HZ, RADIAL_GAIN, RADIAL_ZETA, WK_C, WK_CK, WK_L, WK_P0, WK_ZC } from './params.ts';

export const N_CIRC = 5;
const WR = 2 * Math.PI * RADIAL_FR_HZ;

export interface CircInputs {
  lv: readonly Pulse[]; // LV flow pulses (radial time) incl. CPR pump flow
  rv: readonly Pulse[]; // RV flow pulses
  thor: readonly Pulse[]; // CPR thoracic pressure pulses (radial time), mmHg
  pFloor: number; // CVP (beating) → Pmsf (arrest)
  pawp: number; // pulmonary outflow pressure
  R: number; // systemic resistance (the M2 tracker's output)
  Rp: number; // pulmonary resistance
}

/** C(P) = C0·exp(−k·(P − P0)), clamped to 0.5–3 × C0 (brief §4.2 table: compliance falls with pressure). */
export function compliance(p: number): number {
  return WK_C * Math.min(3, Math.max(0.5, Math.exp(-WK_CK * (p - WK_P0))));
}

function deriv(t: number, s: readonly number[], d: number[], x: CircInputs): void {
  const q = flowAt(x.lv, t);
  const pc = s[0] as number;
  const ql = s[1] as number;
  const pao = pc + WK_ZC * (q - ql) + pressureAt(x.thor, t);
  d[0] = (q - (pc - x.pFloor) / x.R) / compliance(pc);
  d[1] = (WK_ZC * (q - ql)) / WK_L;
  d[2] = s[3] as number;
  d[3] = WR * WR * (pao - (s[2] as number)) - 2 * RADIAL_ZETA * WR * (s[3] as number);
  d[4] = (flowAt(x.rv, t) - ((s[4] as number) - x.pawp) / x.Rp) / PA_C;
}

const k1 = new Array<number>(N_CIRC).fill(0);
const k2 = new Array<number>(N_CIRC).fill(0);
const k3 = new Array<number>(N_CIRC).fill(0);
const k4 = new Array<number>(N_CIRC).fill(0);
const tmp = new Array<number>(N_CIRC).fill(0);

/** Advance s (in place) from t to t + h with classical RK4. */
export function stepCirculation(s: number[], t: number, h: number, x: CircInputs): void {
  deriv(t, s, k1, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + (h / 2) * (k1[i] as number);
  deriv(t + h / 2, tmp, k2, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + (h / 2) * (k2[i] as number);
  deriv(t + h / 2, tmp, k3, x);
  for (let i = 0; i < N_CIRC; i++) tmp[i] = (s[i] as number) + h * (k3[i] as number);
  deriv(t + h, tmp, k4, x);
  for (let i = 0; i < N_CIRC; i++) {
    s[i] = (s[i] as number) + (h / 6) * ((k1[i] as number) + 2 * (k2[i] as number) + 2 * (k3[i] as number) + (k4[i] as number));
  }
}

/** Radial (site) pressure at time t for state s. */
export function radialPressure(s: readonly number[], t: number, x: CircInputs): number {
  return aorticPressure(s, t, x) + (RADIAL_GAIN * 2 * RADIAL_ZETA * (s[3] as number)) / WR;
}

/** Aortic root pressure at time t for state s (used by tests and the aortic-vs-radial check). */
export function aorticPressure(s: readonly number[], t: number, x: CircInputs): number {
  return (s[0] as number) + WK_ZC * (flowAt(x.lv, t) - (s[1] as number)) + pressureAt(x.thor, t);
}

/** Pulmonary artery pressure at time t (3-element: Ppa + Zp·Qrv). */
export function paPressure(s: readonly number[], t: number, x: CircInputs): number {
  return (s[4] as number) + PA_ZC * flowAt(x.rv, t);
}

/** A state at rest: every pressure at `map` (systemic) and `pam` (pulmonary). */
export function restState(map: number, pam: number): number[] {
  return [map, 0, map, 0, pam];
}
