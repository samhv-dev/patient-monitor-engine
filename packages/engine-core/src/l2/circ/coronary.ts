// Coronary supply/demand and ischaemia (R23; tables §3). Stepped at 1 Hz from the last CircBeat:
//   DTF    = (RR − T_sys)/RR with T_sys the beat's emergent valve-open end (avClose) + isovolumic relaxation 60 ms
//            — "diastolic fraction from real valve timing" (not the QS2 regression)
//   CPP    = aortic diastolic pressure − LVEDP (tables §3; the aortic truth, not the radial display)
//   Supply = CFR·((CPP − P_zf)/(CPP_0 − P_zf))·(DTF/DTF_0)                        [normalised; 1 = rest demand]
//   Demand = (HR/HR_0)·(LVSP/LVSP_0)·(kEes)^0.5·(LVEDV/LVEDV_0)^(1/3)            [RPP with a wall-stress term]
//   ratio r = Supply/Demand; deficit δ = max(0, 1 − r); kIsch → 1 − gIsch·δ (τ_down 20 s, τ_up 60 s; Q32)
//   ST: global subendocardial depression −min(0.3, 1.0·δ) mV after a 45 s lag (stLag 30–60 s), applied through the
//       existing Modifiers.ischaemicDepressionMv (0 or −0.05…−0.3 mV); territorial STEMI stays a Stage 5 modifier.
// P_zf 15 mmHg and the CFR mapping are Q31 defaults; the tables' SEVR cross-check is informative only.
import type { CircBeat } from './model.ts';
import type { Stabilised } from './stabilise.ts';
import { P_PL0 } from './params.ts'; // FU-4 G1: the resting pleural pressure (absolute CPP basis)

export const P_ZF = 15; // mmHg (tables §3 pZf; Q31)
export const G_ISCH = 1.5; // (Q32)
export const TAU_ISCH_DOWN_S = 20; // (Q32)
export const TAU_ISCH_UP_S = 60; // (Q32)
export const ST_LAG_S = 45; // 30–60 s (tables §3 stLag)
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]
/** FU-3 item 16: the resting arterial saturation the O2-content ratio is taken against (the chemoreflex's resting 0.97). */
export const SAO2_REF = 0.97;
/**
 * FU-3 item 16: time constant of the hypoxic myocardial depression while the O2 supply deficit stands [ENG, fitted
 * to the asphyxial arrest window: loss of aortic pulsations 9.5 ± 1.4 min (swine, Varvarousi 2011) and 11.4 ± 2.4 min
 * (dogs, DeBehnke 1995) after the airway is occluded on room air]. FU-4 (D3): re-fitted 150 → 260 s to the same window
 * once the R23 floor (0.2) no longer held the hypoxic, hypotensive heart up for ≈ 3 min (arrest +4.50 → +5.62 min).
 * FU-4 (review F13, the scan the ruling requires, after Task 18d): circ-hypoxic-arrest's whole file passes for τ 220–500 s
 * (150 → PEA +4.78 min, 200 → +4.93: below the 5–14 band; 600 → the post-arrest window misses), so the MIDDLE of the
 * plateau is chosen: 360 s → PEA at +6.90 min (margins 1.90 / 7.10 min to the band edges; HR < 40 at +4.33, ≤ 6).
 */
export const TAU_HYP_S = 360;
/**
 * FU-4 G1: floor of the ischaemic contractility factor in MODELED. The R23 floor 0.2 kept a no-flow heart beating at a
 * fifth of its contractility for ever (audit B7: MAP 13, SV 2 mL for 15 min); a myocardium without coronary flow stops
 * contracting within about a minute (Tennant & Wiggers 1935 [P]) — the floor is gone.
 */
export const K_ISCH_MIN = 0;
/**
 * FU-4 G1 (D6): MANUAL keeps R23's balance (floor 0.2, transmural CPP, pressure-work demand). Its set-and-hold tracker
 * can hold an instructor pair with an ischaemic ventricle (FU-3 item 4 defect 1: the check-18 rig at 90/52 parks at
 * kIsch 0.2 with LVEDP 46 — CPP ≈ 0 while the displayed MAP is 65), so a floorless spiral there would arrest a picture
 * the instructor set; MANUAL arrests by NO FLOW instead (arrest.ts MAP_NO_FLOW). Revisit with Q-FU3-4a.
 */
export const K_ISCH_MIN_MANUAL = 0.2;
/**
 * FU-4 G1: time constant of the contractile loss while the heart is NOT beating (pulseless rhythm or no ejection): the
 * no-flow myocardium keeps its capacity to resume through the "electrical phase" of VF, ≈ 4 min (Weisfeldt & Becker
 * 2002, three-phase model [P]), so the loss is slower than the beating ischaemic heart's τ_down 20 s [ENG: τ 120 s puts
 * kIsch at 0.13 after 4 min of no flow, below the arrest threshold — a shock then gives PEA, the circulatory phase].
 */
export const TAU_ISCH_ARREST_S = 120;
/**
 * FU-4 G1: myocardial O2 demand has a basal share (the arrested, non-beating heart: ≈ 15 % of the working MVO2) and an
 * excitation–contraction share paid per beat whatever the load (the unloaded-contraction MVO2 of the PVA–MVO2
 * relation: Suga 1990, Physiol Rev 70:247; Gibbs 1978) [P ranges, ENG split]; only the rest scales with pressure work.
 * Without them a heart at HR 186 and LVSP 25 needed 40 % of its resting O2 and never became ischaemic (audit C4).
 */
export const D_BASAL = 0.15;
export const D_EC = 0.2;
/** FU-4 G1: myocardial O2 demand of a non-ejecting heart relative to rest (basal + E–C: PEA, asystole under CPR) [ENG]. */
export const DEMAND_ARREST = D_BASAL + D_EC;
/**
 * FU-4 F1(d): FIBRILLATING myocardium is not an arrested one — every myofibril contracts continuously and
 * asynchronously, so its MVO2 stays near the working heart's rather than at the basal + E–C share. Measured: with
 * `DEMAND_ARREST` for VF too, CPR at CPP 22–29 repaid the whole debt and `kIsch` recovered 0.84 → 1.00 within 4 min,
 * so a shock after 10 min of VF found a pristine myocardium and D2's three-phase rationale did not hold [ENG size;
 * VF MVO2 reported at roughly half to all of the beating heart's: Suga 1990's PVA–MVO2 relation, the unloaded
 * fibrillating preparations of Gibbs 1978].
 */
export const DEMAND_VF = 0.75;
/** FU-4 G1/G4: rhythms with no mechanical systole (the pulseless flag marks PEA on organised rhythms). */
export const NO_BEAT_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'pWaveAsystole', 'vfCoarse', 'vfFine', 'vtPoly', 'torsades', 'agonal']);
/** FU-4 F1(d): the fibrillating subset of NO_BEAT_RHYTHMS — continuous asynchronous contraction, not an arrested heart. */
export const VF_RHYTHMS: ReadonlySet<string> = new Set(['vfCoarse', 'vfFine', 'vtPoly', 'torsades']);
/** FU-4 G1/G4: what the coronary step uses when the heart is not beating: the continuous CPP (Paradis's relaxation-phase
 * aortic − right-atrial pressure, model.ts `cppAcc`) and the fraction of the cycle it perfuses (CPR relaxation, or 1). */
export interface NoBeat {
  cpp: number;
  dtf: number;
  /** FU-4 F1(d): the non-beating rhythm is ventricular fibrillation (continuous asynchronous contraction). */
  vf?: boolean;
}

export interface CoronaryState {
  ref: Stabilised['ref'];
  dtf0: number;
  ratio: number;
  delta: number;
  kIsch: number;
  ischT: number; // seconds with δ > 0.1
  stMv: number;
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
  hyp: number; // FU-3 item 16: the hypoxic share of the deficit, filtered as kIsch (0–1; MODELED only, 0 in MANUAL)
  cpp: number; // FU-4 G4: the CPP the last step used (last beat's aortic diastolic − LVEDP, or the continuous no-beat value)
  /** FU-4 G5: the RV's flow-share contractility factor (MODELED; 1 in MANUAL) and its resting reference (captured once). */
  kIschRv: number;
  rv0: { perf: number; rvsp: number; edv?: number } | null;
}

export function createCoronary(ref: Stabilised['ref']): CoronaryState {
  const rr = 60 / ref.hr;
  // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype); FU-4 (found in Task 18d's infant/neonate
  // measurement): systole shortens with the resting rate — Weissler's LVET slope −1.7 ms per beat/min (Weissler AM et
  // al., Circulation 1968;37:149–159 [P]) — so a neonate's reference (HR 140: measured valve closure 0.25 s) no longer
  // gets a NEGATIVE resting diastolic fraction (dtf0 −0.003 → the coronary flow ratio −331, kIsch 0.10 and a "low-flow"
  // arrest of a healthy newborn at 47 s). At HR 70 the value is unchanged.
  const tsys = Math.max(0.2, 0.37 - 0.0017 * (ref.hr - 70)) + IVR_S;
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1, hyp: 0, cpp: ref.dbp - ref.lvedp, kIschRv: 1, rv0: null };
}

/**
 * One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. `o2Rel` (FU-3
 * item 16, MODELED only): arterial O2 content ÷ its resting value — myocardial O2 delivery is coronary flow × CaO2 and
 * the resting heart already extracts ≈ 70 % of it, so a content fall is a supply fall only the flow reserve can
 * offset (Guyton & Hall, coronary circulation [TXT]); 1 = the flow-only supply of R23. FU-4: `noBeat` (no beat to
 * read) supplies the continuous CPP and the perfused fraction of the cycle; `modeled` false keeps R23's balance (D6).
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1, noBeat?: NoBeat, modeled = true): void {
  const b = beats[beats.length - 1];
  if (!b && !noBeat) return;
  const r = c.ref;
  // FU-4 G1 (MODELED): CPP on the absolute LV end-diastolic pressure; MANUAL keeps R23's balance (K_ISCH_MIN_MANUAL)
  const pl0 = modeled ? P_PL0 : 0;
  const cpp0 = r.dbp - r.lvedp - pl0;
  let cpp: number;
  let dtf: number;
  let demand: number;
  if (noBeat || !b) {
    // FU-4 G4: no beat to read — the arrest's own pressures (CPR relaxation phase, or the equalised circuit)
    cpp = noBeat?.cpp ?? 0;
    dtf = noBeat?.dtf ?? 1;
    demand = noBeat?.vf ? DEMAND_VF : DEMAND_ARREST; // FU-4 F1(d)
  } else {
    const rr = 60 / Math.max(20, hr);
    const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
    dtf = Math.max(0.05, (rr - tsys) / rr);
    cpp = b.aoDia - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
    const hrR = hr / r.hr;
    const ee = Math.sqrt(Math.max(0.1, c.eesF));
    const work = hrR * (Math.max(20, b.lvsp) / r.lvsp) * ee * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
    demand = modeled ? D_BASAL + D_EC * hrR * ee + (1 - D_BASAL - D_EC) * work : work; // FU-4 G1: + basal, E–C shares
  }
  c.cpp = cpp;
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  c.ratio = (flow * o2Rel) / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
  // FU-3 item 16: the hypoxaemic share of the deficit (δ weighted by the content loss 1 − o2Rel), rising with the
  // myocardium's hypoxic tolerance TAU_HYP_S and recovering as kIsch does (τ_up)
  const dHyp = c.delta * (1 - o2Rel);
  c.hyp += (dHyp - c.hyp) * (1 - Math.exp(-dt / (dHyp > c.hyp ? TAU_HYP_S : TAU_ISCH_UP_S)));
  if (c.hyp < 5e-4) c.hyp = 0;
  // FU-4 G1: kIsch carries the FLOW share of the deficit (the O2-content share is hyp's, FU-3); no floor in MODELED
  const dIsch = Math.max(0, 1 - flow / Math.max(0.05, demand));
  const target = Math.max(modeled ? K_ISCH_MIN : K_ISCH_MIN_MANUAL, 1 - G_ISCH * dIsch);
  const tau = target < c.kIsch ? (noBeat ? TAU_ISCH_ARREST_S : TAU_ISCH_DOWN_S) : TAU_ISCH_UP_S;
  c.kIsch += (target - c.kIsch) * (1 - Math.exp(-dt / tau));
  if (c.kIsch > 0.9995) c.kIsch = 1;
  // FU-4 G5 (MODELED): the RV is perfused through systole AND diastole, driven by aortic mean − RV mean pressure; its
  // demand follows RV pressure work (massive PE, RV infarct, PH crisis: the RV ischaemia spiral). The stabilised
  // reference has no RV pressures: the first beat read is the resting reference [ENG].
  if (modeled && b && !noBeat && b.rvsp !== undefined && b.rvMean !== undefined && Number.isFinite(b.rvsp)) {
    const perf = b.map - b.rvMean;
    c.rv0 ??= { perf, rvsp: b.rvsp, ...(b.rvedv !== undefined && Number.isFinite(b.rvedv) ? { edv: b.rvedv } : {}) };
    const hrR = hr / r.hr;
    const flowRv = cfr * Math.max(0, (perf - P_ZF) / Math.max(5, c.rv0.perf - P_ZF));
    // FU-4 G6 (Task 11 Step 1b (b)): the RV's pressure work is WALL STRESS, RVSP × RVEDV^⅓ — the same Laplace term the LV
    // demand carries (Suga 1990 [P]); with RVSP alone the dilating RV of a massive PE never became ischaemic in time
    // (the spiral took 23 min, measured). The factor is 1 when the beat carries no RV volume (unit rigs).
    const dil = c.rv0.edv !== undefined && b.rvedv !== undefined && Number.isFinite(b.rvedv) ? Math.cbrt(Math.max(10, b.rvedv) / Math.max(10, c.rv0.edv)) : 1;
    const demRv = D_BASAL + D_EC * hrR + (1 - D_BASAL - D_EC) * hrR * (Math.max(5, b.rvsp) / Math.max(5, c.rv0.rvsp)) * dil;
    const tRv = Math.max(K_ISCH_MIN, 1 - G_ISCH * Math.max(0, 1 - flowRv / Math.max(0.05, demRv)));
    c.kIschRv += (tRv - c.kIschRv) * (1 - Math.exp(-dt / (tRv < c.kIschRv ? TAU_ISCH_DOWN_S : TAU_ISCH_UP_S)));
    if (c.kIschRv > 0.9995) c.kIschRv = 1;
  }
  c.ischT = c.delta > 0.1 ? c.ischT + dt : 0;
  const stTarget = c.ischT >= ST_LAG_S ? -Math.min(0.3, c.delta) : 0;
  c.stMv += (stTarget - c.stMv) * (1 - Math.exp(-dt / (stTarget < c.stMv ? 15 : 60)));
}

/** The ST modifier patch for the ECG (null when below the 0.05 mV floor of Modifiers.ischaemicDepressionMv). */
export function stPatchOf(c: CoronaryState): { ischaemicDepressionMv: number } | null {
  return c.stMv <= -0.05 ? { ischaemicDepressionMv: Math.max(-0.3, Math.round(c.stMv * 100) / 100) } : null;
}
