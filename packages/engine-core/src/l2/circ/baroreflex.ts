// Arterial baroreflex (B §4.9 MODELED summary; tables §1.1 G_v, g_hs/g_R/g_V/g_c; audit A5 resetting, A6 venous
// compliance effector). Stepped at 10 Hz from the mean arterial pressure (never from a drug: A11 — reflex responses
// to a pressor are emergent). Error e = MAP_set − MAP (positive = hypotension).
//   vagal: RR_v = G_v·(−e_v) ms, e_v = LPF τ 1 s of delay(0.3 s)(e)        fast limb, both directions
//   sympathetic: e_s = LPF τ 10 s of delay(2.5 s)(e), saturating at ±SYMP_SAT (fraction):
//     HR ×(1 + g_hs·e_s), SVR ×(1 + g_R·e_s), Emax ×(1 + g_c·e_s), venous V0 −g_V·e_s mL, cSv ×(1 − g_C·e_s)
//   resetting: |MAP − set|/set > 5 % held 420 s → set += 0.35·(MAP − set) [ENG-Pulse, N-P16]
export const BARO_DT = 0.1;
export const VAGAL_DELAY_S = 0.3;
export const VAGAL_TAU_S = 1.0;
export const SYMP_DELAY_S = 2.5;
export const SYMP_TAU_S = 10;
export const G_HS = 0.04; // /mmHg HR (B §4.9 "HR ×(1+g_hs·e_s)") [ENG within 0.01–0.02]
/** Sympathetic WITHDRAWAL (hypertension side) is weaker than activation (sigmoid baroreflex curve, operating point
 * near the lower plateau) → gains × 0.3 when e_s < 0 [ENG, prototype: phenylephrine HR −5–15 with class II HR 100–120]. */
export const SYMP_WITHDRAW = 0.3;
/** R45(b): the chronotropic withdrawal is weaker still — reflex bradycardia to a pressor is mainly vagal (B §4.9 sanity 1,
 * HR −5–15 at MAP +15–25) once g_hs rises to 0.04 for the class II/III tachycardia [ENG]. */
export const SYMP_WITHDRAW_HR = 0.1;
export const G_R = 0.02; // /mmHg SVR [ENG: above B §4.9 0.01–0.02 — needed for class II "SBP near normal" in the prototype]
export const G_C = 0.008; // /mmHg contractility [ENG]
export const G_V = 20; // mL/mmHg venous unstressed volume (B §4.9 10–20; upper end, prototype haemorrhage), × W/70
export const G_CSV = 0.004; // /mmHg venous compliance (A6: up to 30 %)
export const SYMP_SAT = 0.6; // saturation of each sympathetic factor (B §4.9 ±40–60 %)
export const VAGAL_MAX_MS = 600; // RR lengthening cap (vagal activation)
/** Vagal WITHDRAWAL saturates once resting vagal tone is gone (HR → intrinsic ≈ 95 at 40 y) [ENG]. */
export const VAGAL_WITHDRAW_MS = 200;
/**
 * Sequence-method BRS (tables G_v 15 ms/mmHg) overstates the steady-state reflex RR change: phenylephrine gives
 * HR −5–15 for MAP +15–25 (B §4.9 sanity 1) ≈ 6 ms/mmHg at HR 75. The vagal limb uses G_v × 0.4 [ENG, prototype].
 */
export const VAGAL_STEADY = 0.2;
export const MAP_TAU_S = 1; // e = MAP_set − LPF_1s(MAP) (B §4.9)
export const RESET_FRAC = 0.05;
export const RESET_HOLD_S = 420;
export const RESET_GAIN = 0.35;
/**
 * R45(b) cardiopulmonary (low-pressure) limb: atrial stretch receptors sense the TRANSMURAL right-atrial pressure;
 * unloading (mild hypovolaemia, PEEP) causes vasoconstriction and venoconstriction before the arterial pressure falls,
 * with little HR change — which is why class I–II haemorrhage narrows PP while SBP holds (ATLS; tables §1/§7).
 * e_cp = RA_tm,set − LPF_τ(RA_tm); SVR ×(1 + G_CP_R·e_cp); venous unstressed volume −G_CP_V·e_cp (stressed-volume
 * recruitment from the splanchnic reservoir) [ENG magnitudes, calibration pass R44].
 */
export const CP_TAU_S = 3;
export const G_CP_R = 0.06; // /mmHg of transmural RA pressure
export const G_CP_V = 200; // mL/mmHg (× W/70)
export const CP_CLAMP = 10; // mmHg of e_cp that the limb can use
/** Most unstressed volume the reflexes can recruit (arterial + cardiopulmonary limbs together): ≈ 1 L in an adult
 * (Guyton; Magder) → 12 mL/kg [ENG]. Once it is spent (class III), venous return — and pressure — fall. */
export const V0_RECRUIT_MAX_ML_KG = 12;
/**
 * R45(b): carotid/aortic receptors fire with pulsatility as well as mean pressure (Chapleau & Abboud 1987): at the
 * same mean, a narrower pulse pressure unloads them. The reflex senses MAP + K_PP·(PP − PP_set) [ENG].
 */
export const K_PP = 0.3;

export interface BaroState {
  set: number;
  q: number[]; // delay line of e at 10 Hz (plain data)
  ev: number; // vagal filtered error
  es: number; // sympathetic filtered error
  offT: number; // time the MAP has been > 5 % off the set point
  mapLp: number; // LPF 1 s of the input MAP
  cpSet: number; // R45(b): transmural RA set point, mmHg (NaN = limb off)
  cpLp: number; // LPF of the transmural RA pressure
}

export interface BaroGains {
  gVagal: number; // ms/mmHg
  gSymp: number; // × on every sympathetic gain (age, β-blockade, GA)
  betaBlock: number; // 0–1: fraction of the β-mediated HR (and, unless betaBlockC is given, contractility) gain removed
  betaBlockC?: number; // 0–1: fraction of the β-mediated contractility gain removed (tables g_c ×0.5)
  weightScale: number; // W/70
  pinnedSet: boolean; // MAP_set pinned by the instructor: no resetting
  hrGain?: number; // × on the sympathetic HR arm only (drug depression of the chronotropic reflex)
}

export interface BaroOut {
  rrMs: number; // vagal RR increment (ms, + = slower)
  hrF: number;
  svrF: number;
  eesF: number;
  dV0: number; // mL added to the venous unstressed volume (− = venoconstriction)
  cSvF: number;
}

export function createBaro(set: number, cpSet = Number.NaN): BaroState {
  const n = Math.round(SYMP_DELAY_S / BARO_DT) + 1;
  return { set, q: new Array<number>(n).fill(0), ev: 0, es: 0, offT: 0, mapLp: set, cpSet, cpLp: cpSet };
}

const clampSat = (x: number) => Math.min(SYMP_SAT, Math.max(-SYMP_SAT, x));

/** One 10 Hz step with the current mean arterial pressure; returns the effector factors. */
export function stepBaro(b: BaroState, map: number, g: BaroGains, raTm?: number): BaroOut {
  b.mapLp += (map - b.mapLp) * (1 - Math.exp(-BARO_DT / MAP_TAU_S));
  const e = b.set - b.mapLp;
  b.q.push(e);
  b.q.shift();
  const eVag = b.q[b.q.length - 1 - Math.round(VAGAL_DELAY_S / BARO_DT)] as number;
  const eSym = b.q[0] as number;
  b.ev += (eVag - b.ev) * (1 - Math.exp(-BARO_DT / VAGAL_TAU_S));
  b.es += (eSym - b.es) * (1 - Math.exp(-BARO_DT / SYMP_TAU_S));
  if (!g.pinnedSet && Math.abs(b.mapLp - b.set) > RESET_FRAC * b.set) {
    b.offT += BARO_DT;
    if (b.offT >= RESET_HOLD_S) {
      b.set += RESET_GAIN * (b.mapLp - b.set);
      b.offT = 0;
    }
  } else b.offT = 0;
  const s = g.gSymp * (b.es < 0 ? SYMP_WITHDRAW : 1);
  const beta = 1 - g.betaBlock;
  const betaC = 1 - (g.betaBlockC ?? g.betaBlock);
  let ecp = 0;
  if (raTm !== undefined && Number.isFinite(b.cpSet)) {
    b.cpLp += (raTm - b.cpLp) * (1 - Math.exp(-BARO_DT / CP_TAU_S));
    ecp = Math.min(CP_CLAMP, Math.max(-CP_CLAMP, b.cpSet - b.cpLp));
  }
  const scp = g.gSymp * (ecp < 0 ? SYMP_WITHDRAW : 1);
  return {
    rrMs: Math.min(VAGAL_MAX_MS, Math.max(-VAGAL_WITHDRAW_MS, -VAGAL_STEADY * g.gVagal * b.ev)),
    hrF: 1 + clampSat(G_HS * g.gSymp * (g.hrGain ?? 1) * (b.es < 0 ? SYMP_WITHDRAW_HR : 1) * beta * b.es),
    svrF: 1 + clampSat(G_R * s * b.es + G_CP_R * scp * ecp),
    eesF: 1 + clampSat(G_C * s * betaC * b.es),
    dV0: Math.max(-V0_RECRUIT_MAX_ML_KG * 70 * g.weightScale, -G_V * g.weightScale * s * Math.min(40, Math.max(-40, b.es)) - G_CP_V * g.weightScale * scp * ecp),
    cSvF: 1 - clampSat(G_CSV * s * b.es) * 0.5,
  };
}
