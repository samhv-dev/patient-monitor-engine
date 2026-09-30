# FU-10 plan: the ordered find/replace pairs per task (paths relative to packages/engine-core/).
# Reconstructs the prototype tree from origin/main; check.py verifies each find is exactly-once and the result is
# byte-identical to <scratchpad>/fu-10/wt.
T = {}

T['A1'] = [
('src/l2/neuro/pipeline.ts',
"""  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
""",
"""  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  /** FU-10 E1: when an MH-susceptible patient was first exposed to each trigger (s) — read by Stage 7e, which owns MH
   * (R51 §6) and turns the exposure into the MH state with the trigger's onset latency. Absent = never exposed. */
  mhExposure?: { sux?: number; volatile?: number };
"""),
('src/l2/neuro/pipeline.ts',
"""    if (ns.profile.mhSusceptible && !ns.flags.mhMarked) {
      mark(ns, d.t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }""",
"""    if (ns.profile.mhSusceptible) {
      ns.mhExposure = { ...ns.mhExposure, sux: ns.mhExposure?.sux ?? d.t }; // FU-10 E1: 7e reads it
      if (!ns.flags.mhMarked) {
        mark(ns, d.t, 'mhTrigger');
        ns.flags.mhMarked = true;
      }
    }"""),
('src/l2/neuro/pipeline.ts',
"""  if (ns.profile.mhSusceptible && !ns.flags.mhMarked && x.macPotent > MH_VOLATILE_MAC) {
    mark(ns, t, 'mhTrigger');
    ns.flags.mhMarked = true;
  }""",
"""  if (ns.profile.mhSusceptible && x.macPotent > MH_VOLATILE_MAC && ns.mhExposure?.volatile === undefined) {
    ns.mhExposure = { ...ns.mhExposure, volatile: t }; // FU-10 E1: 7e reads it
    if (!ns.flags.mhMarked) {
      mark(ns, t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }
  }"""),
('src/l2/thermal/params.ts',
"""export const DANT_GAIN = 1.6;
""",
"""export const DANT_GAIN = 1.6;
/**
 * FU-10 E1 — MH from its triggers in a susceptible patient (7f publishes the exposure times; the MH state is 7e's).
 * Onset latency after each trigger: succinylcholine starts the hypermetabolism at once (the Stage 3 ramp then reaches
 * full activity over MH_ONSET_S, so EtCO2 doubles ≈ 14 min after the dose); a volatile alone starts it later. Direction:
 * Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 (North American MH Registry, 477 cases: onset
 * is shorter after succinylcholine with every volatile; without succinylcholine sevoflurane is faster than isoflurane or
 * desflurane); Larach MG et al., Anesth Analg 2010;110:498–507 (clinical presentation) [VERIFY the medians]. Magnitudes
 * [ENG]: 0 s with succinylcholine; 20 min for a volatile alone (inside the ET report's 10–60 min). Severity 1 = the
 * fulminant course of the instructor's `condition mh 1` (Ali Q2: fixed vs a seeded draw; fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
export const MH_VOLATILE_LATENCY_S = 1200;
export const MH_PROFILE_SEVERITY = 1;
"""),
('src/l2/thermal/mh.ts',
"""import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';
""",
"""import { DANT_GAIN, MH_ONSET_S, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_S } from './params.ts';
"""),
('src/l2/thermal/mh.ts',
"""/** 1 Hz (or any dt ≤ 1 s) update""",
"""/** FU-10 E1: an MH-susceptible patient's trigger exposure (7f `ps.neuro.mhExposure`, times in s). */
export interface MhExposure {
  sux?: number;
  volatile?: number;
}

/** FU-10 E1: the MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + MH_VOLATILE_LATENCY_S : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * FU-10 E1: start (or bring forward) the MH of a susceptible patient from its triggers. `owned` = the triggers already
 * started it (not the instructor's `condition mh`): until its onset a later, faster trigger may bring it forward; an
 * instructor's MH is never overridden, and an MH the instructor cleared (`condition mh 0`) is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owned: boolean, t: number): { mh: MhState | null; owned: boolean } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owned };
  if (mh === null && !owned) return { mh: { severity: MH_PROFILE_SEVERITY, t0 }, owned: true };
  if (mh !== null && owned && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owned };
  return { mh, owned };
}

/** 1 Hz (or any dt ≤ 1 s) update"""),
('src/l2/endo/pipeline.ts',
"""import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
""",
"""import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
import { mhFromExposure, type MhExposure } from '../thermal/mh.ts';
"""),
('src/l2/endo/pipeline.ts',
"""  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
""",
"""  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
  mhAuto?: boolean; // FU-10 E1: the MH state was started by the patient's triggers (absent = not yet)
"""),
('src/l2/endo/pipeline.ts',
"""  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
""",
"""  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
  // FU-10 E1: an MH-susceptible patient's triggers (7f's exposure times) start the MH state 7e owns (R51 §6)
  const mhx = (ctx.ps as { neuro?: { mhExposure?: MhExposure } }).neuro?.mhExposure;
  if (mhx) {
    const r = mhFromExposure(th.mh, mhx, es.mhAuto === true, tEnd);
    th.mh = r.mh;
    es.mhAuto = r.owned;
  }
"""),
('test/l2/neuro/pipeline.test.ts',
"""    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
""",
"""    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
    expect(ns.mhExposure).toEqual({ sux: 0 }); // FU-10 E1: the exposure time 7e turns into MH
"""),
]

T['A2'] = [
('src/l2/thermal/params.ts',
"""export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
""",
"""export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG] — FU-10 E3: no longer read (NEURAXIAL_BLOCK_FRAC)
"""),
('src/l2/thermal/params.ts',
"""export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
""",
"""export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
/**
 * FU-10 E3 — neuraxial thermoregulation (Sessler DI, Anesthesiology 2000;92:578 and Lancet 2008;371:1791; Kurz A,
 * Sessler DI et al., Anesthesiology 1993;79:1193 [VERIFY]): the block abolishes vasoconstriction AND shivering below
 * its level only; centrally the patient keeps an unsedated patient's thresholds except that shivering starts ≈ 0.5 °C
 * lower (the warm, vasodilated legs are "felt" as warm). Redistribution is then ≈ half of general anaesthesia's
 * (Matsukawa T et al., Anesthesiology 1995;83:961: epidural −0.8 °C in hour 1 [VERIFY]). Sedation adds 7f's depth.
 * NEURAXIAL_BLOCK_FRAC: the fraction of the vasomotor/shivering effector mass below a T10 block [ENG: legs + lower trunk ≈ ½].
 */
export const NEURAXIAL_BLOCK_FRAC = 0.5;
export const NEURAXIAL_SHIVER_SHIFT_C = -0.5;
"""),
('src/l2/thermal/heat.ts',
"""  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';""",
"""  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_SHIVER_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';"""),
('src/l2/thermal/heat.ts',
"""/** Current thresholds (depth, set point; the shivering-only shift applied). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift };
}

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  if (st.anaesthesia === 'neuraxial') return { k: st.k0 * NEURAXIAL_KCP, f: 1 }; // no vasoconstriction below the block
  const f = vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}""",
"""/** Current thresholds (depth, set point; the shivering-only shifts applied: drugs, and a neuraxial block — FU-10 E3). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift + (st.anaesthesia === 'neuraxial' ? NEURAXIAL_SHIVER_SHIFT_C : 0) };
}

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */
const blocked = (st: ThermalState): number => (st.anaesthesia === 'neuraxial' ? NEURAXIAL_BLOCK_FRAC : 0);

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  // FU-10 E3: below a neuraxial block the vessels are fully dilated; above it they keep their thermoregulatory tone
  const b = blocked(st);
  const f = b + (1 - b) * vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}"""),
('src/l2/thermal/heat.ts',
"""    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb),
""",
"""    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
"""),
('src/l2/thermal/heat.ts',
"""  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial: the thresholds of a sedated
  // patient (decision 4: Stage 3's "no plateau" keeps shivering out of hour 8).
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'none' ? 0 : 1);""",
"""  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial (FU-10 E3): no central depth of
  // its own — the block acts on the effectors below it (kcp, shivering) and lowers the shivering threshold; sedation
  // reaches the thresholds through 7f's depth.
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'general' ? 1 : 0);"""),
('src/l2/thermal/heat.ts',
"""    depth: st.anaesthesia === 'none' ? 0 : 1,""",
"""    depth: st.anaesthesia === 'general' ? 1 : 0, // FU-10 E3: a neuraxial block has no central depth"""),
('test/l2/temp/temp.test.ts',
"""  it('neuraxial: smaller redistribution and no plateau (still falling below 34.5 °C in hour 8)', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[419]! - tc[479]!).toBeGreaterThan(0.1); // still falling in hour 8, where GA has plateaued
    expect(tc[479]!).toBeLessThan(34.5);
  });""",
"""  // FU-10 E3 (E-FU10-3, research/14 ET-04): "no plateau" meant no VASOCONSTRICTION plateau — the block abolishes the
  // legs' vasoconstriction, so the core keeps falling through the GA plateau's hours; it now stops only where shivering
  // ABOVE the block starts, below the lowered shivering threshold (35.5 °C; Kurz 1993). Before FU-10 the neuraxial state
  // took the GA thresholds (shivering 33.5 °C) and fell to 33.47 °C at 8 h with no shivering; now 35.22 °C, shivering.
  it('neuraxial: smaller redistribution, no vasoconstriction plateau; the fall stops only below the lowered shivering threshold', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3); // hour 2: still the linear phase (0.50 °C/h)
    expect(tc[479]!).toBeLessThan(35.5); // below the shivering threshold 36.0 − 0.5
    expect(st.out.shiverW).toBeGreaterThan(0); // shivering above the block defends it
  });"""),
]

T['A3'] = [
('src/l2/thermal/params.ts',
"""export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
""",
"""export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
/**
 * FU-10 E5 — the depth the THRESHOLDS read is capped at the GA row. Before FU-10 `thresholds()` extrapolated the
 * awake → GA line to depth 1.5 (2.1 °C per depth unit), so 2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction
 * threshold at 34.55 °C and the plateau at 6.2 h; the tables' and Sessler's GA row IS the row for ordinary clinical
 * anaesthesia (vasoconstriction 34.5 ± 0.2 °C, the plateau at 3–4 h: Sessler DI, Anesthesiology 2000;92:578–596; Kurz A,
 * Plattner O, Sessler DI et al., Anesthesiology 1993;79:465). A deeper anaesthetic lowering the threshold further is a
 * concentration–threshold slope no source in the tables gives, so it is not extrapolated (R45; calibration queue).
 */
export const THR_DEPTH_MAX = 1;
/**
 * FU-10 E6 — age lowers both thermoregulatory thresholds: ≈ 1 °C lower from 60 to 80 y under general anaesthesia
 * (Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465 [VERIFY]; Frank SM et al., Anesthesiology
 * 1992;77:252). Linear between THR_AGE_FROM_Y and THR_AGE_TO_Y, applied to the vasoconstriction and shivering
 * thresholds only (the sweating threshold has no sourced age term).
 */
export const THR_AGE_FROM_Y = 60;
export const THR_AGE_TO_Y = 80;
export const THR_AGE_SHIFT_C = -1;
"""),
('src/l2/thermal/thresholds.ts',
"""import {
  SHIVER_MAX_X,""",
"""import {
  THR_AGE_FROM_Y, THR_AGE_SHIFT_C, THR_AGE_TO_Y, THR_DEPTH_MAX,
  SHIVER_MAX_X,"""),
('src/l2/thermal/thresholds.ts',
"""/** Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point). */
export function thresholds(depth: number, setShiftC: number): Thresholds {
  const d = Math.min(1.5, Math.max(0, depth));
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, Math.min(1, d)),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}""",
"""/** FU-10 E6: the age shift of the cold-defence thresholds, °C (0 up to 60 y, THR_AGE_SHIFT_C from 80 y; linear). */
export function ageShiftC(ageY: number): number {
  const f = Math.min(1, Math.max(0, (ageY - THR_AGE_FROM_Y) / (THR_AGE_TO_Y - THR_AGE_FROM_Y)));
  return THR_AGE_SHIFT_C * f;
}

/**
 * Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point) and the cold-defence
 * thresholds by the patient's age (FU-10 E6). The depth is capped at the GA row (FU-10 E5, THR_DEPTH_MAX).
 */
export function thresholds(depth: number, setShiftC: number, ageY = 40): Thresholds {
  const d = Math.min(THR_DEPTH_MAX, Math.max(0, depth));
  const age = ageShiftC(ageY);
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC + age,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, d),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC + age,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}"""),
('src/l2/thermal/heat.ts',
"""  const thr = thresholds(st.depth, st.setShift + st.feverShift);""",
"""  const thr = thresholds(st.depth, st.setShift + st.feverShift, st.ageY);"""),
('src/l2/thermal/heat.ts',
"""  effKg: number;
  env: Envelope;""",
"""  effKg: number;
  ageY: number; // FU-10 E6: the thermoregulatory thresholds fall with age (Kurz 1993)
  env: Envelope;"""),
('src/l2/thermal/heat.ts',
"""export function createThermal(tCore: number, effKg: number, heightCm = 175): ThermalState {""",
"""export function createThermal(tCore: number, effKg: number, heightCm = 175, ageY = 40): ThermalState {"""),
('src/l2/thermal/heat.ts',
"""    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg,""",
"""    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg, ageY,"""),
('src/l2/thermal/heat.ts',
"""  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70);""",
"""  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70, 175, st.ageY ?? 40);"""),
('src/l2/endo/pipeline.ts',
"""export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;""",
"""export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;
  ageY: number; // FU-10 E6: written into the heat model's `ageY` (the thresholds fall with age; Stage 3 owns `resp`)"""),
('src/l2/endo/pipeline.ts',
"""    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ecg: { tempC: 0, shiver: 0 },""",
"""    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ageY: profile?.ageY ?? 40, ecg: { tempC: 0, shiver: 0 },"""),
('src/l2/endo/pipeline.ts',
"""  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  observeDoses(es, pk);""",
"""  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  th.ageY = es.ageY; // FU-10 E6: the patient's age reaches the thermoregulatory thresholds (Stage 3 creates the state)
  observeDoses(es, pk);"""),
]

T['A4'] = [
('src/l2/endo/params.ts',
"""export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
""",
"""export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
/** FU-10 E8: 7c's `insulinDextrose` row is dosed in insulin units with 25 g dextrose per 10 units (the row's regimen;
 * UK Renal Association 2020 / JBDS: 10 units soluble insulin in 50 mL 50 % glucose) [TXT]. */
export const INSDEX_DEXTROSE_G_PER_UNIT = 2.5;
"""),
('src/l2/endo/adapters.ts',
"""import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ } from './params.ts';""",
"""import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';"""),
('src/l2/endo/adapters.ts',
"""/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose).
 */""",
"""/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose). FU-10 E8: 7c's `insulinDextrose` row (the hyperkalaemia treatment; its K⁺ curve stays 7c's) is the same
 * insulin and dextrose to the glucose model — 10 units with 25 g, i.e. INSDEX_DEXTROSE_G_PER_UNIT per unit given.
 */"""),
('src/l2/endo/adapters.ts',
"""    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
""",
"""    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8
      insulinBolus(es.core.glucose, d.amount, es.weightKg);
      dextroseBolus(es.core.glucose, d.amount * INSDEX_DEXTROSE_G_PER_UNIT, es.weightKg);
    }
"""),
]

T['A5'] = [
('src/l2/endo/params.ts',
"""export const P2_PER_MIN = 0.025;""",
"""/**
 * FU-10 E12: the remote-insulin rate constant of the minimal model. 0.025/min put the nadir of an IV insulin bolus at
 * 13 min (research/14 ET-20a; the insulin-tolerance test puts it at 20–30 min, research/12 at 40–60). Bergman's own
 * estimates in normal subjects are ≈ 0.01–0.02/min (Bergman RN, Phillips LS, Cobelli C, J Clin Invest 1981;68:1456
 * [VERIFY]) — the slower remote compartment is the mechanism, not a bigger dose or a smaller SI. SI is re-anchored so
 * the steady-state action SI·(I − Ib) is unchanged (SI_PER_MIN_PER_UU is the same; only the LAG moves).
 */
export const P2_PER_MIN = 0.016;"""),
]

T['A6'] = [
('src/l2/endo/params.ts',
"""export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]""",
"""export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]
/**
 * FU-10 E13 — untreated adrenal insufficiency is a BASAL deficit, not only a blunted stress rise: the resting cortisol
 * is low, so the permissive support of vascular tone is already missing before any stress (Annane D et al., Crit Care
 * Med 2017;45:2078 / Intensive Care Med 2017 (the glucocorticoid-deficiency guidelines: vasopressor-dependent
 * hypotension reversed by hydrocortisone); Miller 10e ch. 35). Before FU-10 `cortResponse` 0.5 halved only the stress
 * RISE, so the resting patient was exactly normal (research/14 ET-15a). [ENG size: a basal cortisol at half normal,
 * the same fraction the stress response already carried.]
 */
export const AI_CORT_BASAL_F = 0.5;
/**
 * FU-10 E13 — cortisol is PERMISSIVE for vascular tone: below the basal level the vessels lose part of their resting
 * resistance (the vasoplegia of glucocorticoid deficiency; Annane 2017). × on SVR = 1 − CORT_SVR_PERMISSIVE · (1 −
 * cortisol/basal), applied BELOW basal only (a high cortisol does not raise SVR: the receptor is saturated) [ENG size:
 * the ET-15a target is a lower resting/post-induction MAP that a vasopressor answers poorly].
 */
export const CORT_SVR_PERMISSIVE = 0.25;
/**
 * FU-10 E10 — one induction dose of etomidate inhibits 11β-hydroxylase, so the adrenal cannot make cortisol for hours
 * (Wagner RL, White PF et al., NEJM 1984;310:1415; Absalom A, Pledger D, Kong A, Anaesthesia 1999;54:861 [VERIFY]).
 * The suppression follows the dose with a first-order recovery (t½ chosen inside the sources' 6–12 h) and multiplies the
 * adrenal's cortisol RESPONSE (`cortResponse`), so the resting level is untouched and the surgical rise is blunted.
 * ETOM_SUPPR_MAX at the 0.3 mg/kg reference dose [ENG: the ET-34 target is cortisol ≤ 0.8 × propofol's at 4 h].
 */
export const ETOM_SUPPR_MAX = 0.6;
export const ETOM_SUPPR_REF_MG_KG = 0.3;
export const ETOM_SUPPR_T12_S = 8 * 3600;"""),
('src/l2/endo/hormones.ts',
"""  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)""",
"""  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  /** FU-10 E13: × on the BASAL cortisol target (adrenal insufficiency: a resting deficit, not only a blunted rise). */
  cortBasalF?: number;"""),
('src/l2/endo/hormones.ts',
"""export function createHormones(): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}""",
"""export function createHormones(cortBasalF = 1): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL * cortBasalF, cortDrive: 0 };
}"""),
('src/l2/endo/hormones.ts',
"""  const cSs = CORT_BASAL * (1 + CORT_GAIN * h.cortDrive * x.cortResponse);""",
"""  const cSs = CORT_BASAL * (x.cortBasalF ?? 1) * (1 + CORT_GAIN * h.cortDrive * x.cortResponse); // FU-10 E13: the basal deficit"""),
('src/l2/endo/effects.ts',
"""  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0,
} from './params.ts';""",
"""  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0, CORT_SVR_PERMISSIVE,
} from './params.ts';"""),
('src/l2/endo/effects.ts',
"""    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al),""",
"""    // FU-10 E13: cortisol's permissive effect on resting vascular tone, below basal only
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al) * (1 - CORT_SVR_PERMISSIVE * Math.max(0, 1 - h.cort / CORT_BASAL)),"""),
('src/l2/endo/core.ts',
"""/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */""",
"""/**
 * FU-10 E10/E13: the adrenal's cortisol RESPONSE — halved by the adrenal-insufficiency profile (as before) and, on top
 * of it, suppressed by an 11β-hydroxylase inhibitor the patient has had (etomidate: `etomSuppr`, 0–1).
 */
export function cortResponseOf(c: EndoCore): number {
  return (c.profile.adrenalInsufficiency ? 0.5 : 1) * Math.max(0, 1 - ETOM_SUPPR_MAX * Math.min(1, Math.max(0, c.etomSuppr ?? 0)));
}

/** FU-10 E13: the × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */
export const cortBasalF = (p: EndoProfile): number => (p.adrenalInsufficiency ? AI_CORT_BASAL_F : 1);

/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */"""),
('src/l2/endo/core.ts',
"""  const cortResponse = p.adrenalInsufficiency ? 0.5 : 1;""",
"""  const cortResponse = cortResponseOf(c);"""),
('src/l2/endo/core.ts',
"""  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  out: EndoOut;""",
"""  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  /** FU-10 E10: 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;
  out: EndoOut;"""),
('src/l2/endo/core.ts',
"""  const c: EndoCore = {
    profile, hormones: createHormones(), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg }, out: null as unknown as EndoOut,
  };""",
"""  const c: EndoCore = {
    profile, hormones: createHormones(cortBasalF(profile)), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg },
    etomSuppr: 0, out: null as unknown as EndoOut,
  };"""),
('src/l2/endo/core.ts',
"""import {
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';""",
"""import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';"""),
('src/l2/endo/core.ts',
"""  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);""",
"""  // FU-10 E10: an 11β-hydroxylase inhibitor's suppression recovers first-order (etomidate: 6–12 h)
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: cortResponseOf(c), cortBasalF: cortBasalF(c.profile), epiExoPgMl: x.epiExoPgMl,
  }, dtS);"""),
('src/l2/endo/core.ts',
"""  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
  const gp = glucoseProfile(c.profile);""",
"""  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c));
  const gp = glucoseProfile(c.profile);"""),
('src/l2/endo/adapters.ts',
"""    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8""",
"""    else if (d.agent === 'etomidate') { // FU-10 E10: 11β-hydroxylase suppression for hours after one induction dose
      const perKg = d.amountUnit === 'mg/kg' ? d.amount : d.amountUnit === 'mg' ? d.amount / es.weightKg : 0;
      if (perKg > 0) es.core.etomSuppr = Math.min(1, (es.core.etomSuppr ?? 0) + perKg / ETOM_SUPPR_REF_MG_KG);
    } else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8"""),
('src/l2/endo/adapters.ts',
"""import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';""",
"""import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, ETOM_SUPPR_REF_MG_KG, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';"""),
('src/l2/endo/adapters.ts',
"""type DoseLike = { agent: string; amount: number; amountUnit: string };""",
"""type DoseLike = { agent: string; amount: number; amountUnit: string; mgPerKg?: number | null };"""),
]

T['A7'] = [
('src/types-endo.ts',
"""export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';""",
"""export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — `false` OMITS the long-acting basal insulin (the missed-dose case: ketosis within hours).
   * Default `true` (the profile as it behaved before FU-10). FU-8 A16 carries it into `pme-scenario/1`. */
  basalInsulin?: boolean;"""),
('src/l2/endo/core.ts',
"""export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';""",
"""export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — false omits the long-acting basal insulin (insulin-deficient: ketogenesis, K⁺ efflux). */
  basalInsulin: boolean;"""),
('src/l2/endo/core.ts',
"""export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false };""",
"""export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true };"""),
('src/l2/endo/core.ts',
"""  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: true };""",
"""  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: p.basalInsulin !== false }; // FU-10 E7"""),
('src/l2/endo/params.ts',
"""export const MH_K_EFFLUX = 2.2;""",
"""/**
 * FU-10 E7 — ketogenesis from the insulin DEFICIT. 7e's glucose model already integrates the deficit as `egpDef` (0–1,
 * τ 3 h: the insulinopenic release of hepatic output); unrestrained lipolysis and hepatic ketogenesis follow the same
 * deficit, so the ketoacid production rate is KETO_MMOL_MIN_MAX · egpDef per 70 kg, delivered to 7c's ketoacid pool.
 * Size [ENG]: 25 mmol/L of ketoacids in ≈ 17 L of ECF is 7c's established DKA (`DKA_KETO_MMOL_L`), and omitted basal
 * insulin in type 1 produces ketosis (β-hydroxybutyrate > 3 mmol/L) within hours (JBDS-IP perioperative diabetes 2023;
 * JBDS DKA 2023; Kitabchi AE et al., Diabetes Care 2009;32:1335) — 0.5 mmol/min at a full deficit reaches ≈ 3 mmol/L in
 * ≈ 100 min and the established pool in ≈ 8 h.
 */
export const KETO_MMOL_MIN_MAX = 0.5;
/**
 * FU-10 E11 — a fever is an added HEAT SOURCE, not only a raised set point. An anaesthetised, vasodilated patient
 * cannot defend a set point (no shivering, no vasoconstriction), so on main a septic or thyrotoxic patient under GA at
 * 21 °C stayed at 36.6–36.9 °C (research/14 ET-12, ET-13a) while the tables ask for 38.5–41 °C. Pyrogens (and thyroid
 * hormone) raise heat production directly: prostaglandin-driven thermogenesis in sepsis (Miller 10e ch. 46: fever raises
 * VO2 10–13 %/°C) and the uncoupled metabolism of thyrotoxicosis. PYROGEN_W_70: watts added at a full condition (sepsis
 * severity 1 / storm 1) for a 70 kg patient [ENG; fit target: a febrile core 38.5–41 °C under GA in a 21 °C theatre —
 * the metabolic vo2F rows already carry their own heat, this is what is left]. Scaled by body size like every heat term.
 */
export const PYROGEN_W_70 = 120;
/** FU-10 E11: the set-point shift at which the pyrogenic heat is full (the sepsis/storm rows' own shift) [ENG]. */
export const PYROGEN_SET_REF_C = 2;
/** FU-10 E7: the insulin deficit shifts K OUT of the cells (Kitabchi 2009: insulinopenia is one of DKA's two causes of
 * hyperkalaemia) — mmol/L of K set point at a full deficit [ENG: with the hyperosmolar term, DKA presents ≥ healthy]. */
export const KETO_K_EFFLUX = 1.4;
/** FU-10 E7: hyperosmolar hyperglycaemia is the other (water leaves the cells with K): mmol/L of K set point per mg/dL
 * of glucose above HYPEROSM_FROM_MGDL [ENG; Kitabchi 2009]. */
export const HYPEROSM_K_PER_MGDL = 0.002;
export const HYPEROSM_FROM_MGDL = 200;
export const MH_K_EFFLUX = 2.2;"""),
('src/l2/endo/core.ts',
"""  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c""",
"""  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c
  /** FU-10 E7: ketoacid production from the INSULIN DEFICIT, mmol/min → 7c's ketoacid pool (`blood.core.endoKetoMmolMin`). */
  ketoMmolMin: number;"""),
('src/l2/endo/core.ts',
"""    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity,""",
"""    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity
      // FU-10 E7: insulin deficiency and hyperosmolar hyperglycaemia drive K OUT of the cells (JBDS DKA 2023: K is often
      // high at presentation despite a total-body deficit) — the two DKA causes the old K path had no term for.
      // The instructor's `dka` condition (7c's severity) IS insulinopenia, so it carries the same efflux even though the
      // patient's own insulin is normal — without this DKA presented HYPOkalaemic (research/14 ET-23c)
      + KETO_K_EFFLUX * Math.max(g.egpDef, Math.min(1, Math.max(0, x.dkaSeverity))) + HYPEROSM_K_PER_MGDL * Math.max(0, g.g - HYPEROSM_FROM_MGDL),
    ketoMmolMin: KETO_MMOL_MIN_MAX * g.egpDef * (x.weightKg / 70),"""),
('src/l2/endo/core.ts',
"""import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,""",
"""import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,"""),
('src/l2/endo/adapters.ts',
"""  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };""",
"""  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };"""),
('src/l2/endo/adapters.ts',
"""  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;""",
"""  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  c.endoKetoMmolMin = o.ketoMmolMin; // FU-10 E7: ketogenesis from the insulin deficit — 7c integrates it into its pool"""),
('src/l2/blood/core.ts',
"""  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux""",
"""  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux
  // FU-10 E7 (E-FU10-2): Stage 7e's ketogenesis from the insulin deficit enters 7c's ketoacid pool, which 7c owns: the
  // acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive then all emerge as they do for `condition dka`
  so.keto += Math.max(0, (bc as { endoKetoMmolMin?: number }).endoKetoMmolMin ?? 0) * (dtS / 60);"""),
('test/l2/endo/core.test.ts',
"""const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;""",
"""const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true } as const; // FU-10 E7: the basal insulin can now be omitted"""),
]

T['A8'] = [
('src/l2/endo/core.ts',
"""  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds""",
"""  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  /** FU-10 E11: pyrogenic heat production, W — a direct heat source the anaesthetised patient cannot switch off. */
  pyrogenW: number;"""),
('src/l2/endo/core.ts',
"""    vo2F: th.vo2F * cd.vo2F,
    setShiftC,""",
"""    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    // FU-10 E11: the inflammatory/thyrotoxic heat source, sized by the same set-point shift the rows already declare
    pyrogenW: PYROGEN_W_70 * (x.weightKg / 70) * Math.min(1, Math.max(0, setShiftC / PYROGEN_SET_REF_C)),"""),
('src/l2/endo/core.ts',
"""  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,""",
"""  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,
  PYROGEN_SET_REF_C, PYROGEN_W_70,"""),
('src/l2/thermal/heat.ts',
"""  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core""",
"""  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  /** FU-10 E11: pyrogenic heat, W — a direct source (sepsis, SIRS, thyroid storm) the anaesthetised patient cannot
   * switch off, written by 7e's endo core beside `extraX`. It is heat only: VO2/VCO2 stay the rows' `vo2F`. */
  pyrogenW: number;"""),
('src/l2/thermal/heat.ts',
"""    metabolicW: basalW(st) + st.m0 * (st.extraX - 1),""",
"""    metabolicW: basalW(st) + st.m0 * (st.extraX - 1) + Math.max(0, st.pyrogenW ?? 0), // FU-10 E11: the pyrogenic source"""),
('src/l2/thermal/heat.ts',
"""fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),""",
"""fluidWarmer: false, extraX: 1, pyrogenW: 0, dantE: 0, out: zeroOut(),"""),
('src/l2/endo/pipeline.ts',
"""    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)""",
"""    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.pyrogenW = o.pyrogenW; // FU-10 E11: the pyrogenic heat source (a fever the anaesthetised patient cannot defend)"""),
]

T['B2'] = [
('src/l2/thermal/heat.ts',
"""  pyrogenW: number;""",
"""  pyrogenW: number;
  /** FU-10 E2: the fraction of the O2 demand actually consumed (7c `o2.vo2 / o2.demand`), written by 7e every pass.
   * Aerobic muscle heat (MH, shivering) cannot exceed the oxygen it burns, so the core stops rising when flow stops. */
  o2F: number;"""),
('src/l2/thermal/heat.ts',
"""fluidWarmer: false, extraX: 1, pyrogenW: 0, dantE: 0, out: zeroOut(),""",
"""fluidWarmer: false, extraX: 1, pyrogenW: 0, o2F: 1, dantE: 0, out: zeroOut(),"""),
('src/l2/thermal/heat.ts',
"""/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */""",
"""/** FU-10 E2: the delivered fraction of the O2 demand (1 without 7c, clamped to [0, 1]). */
const o2Frac = (st: ThermalState): number => Math.min(1, Math.max(0, st.o2F ?? 1));

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */"""),
('src/l2/thermal/heat.ts',
"""    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t),""",
"""    // FU-10 E2: both are AEROBIC muscle heat — limited by the oxygen the circulation delivers (`o2F`, 1 when 7c is absent)
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)) * o2Frac(st), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t) * o2Frac(st),"""),
('src/l2/endo/adapters.ts',
"""  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };""",
"""  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; o2?: { vo2?: number; demand?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };"""),
('src/l2/endo/adapters.ts',
"""export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;""",
"""/** FU-10 E2: 7c's delivered O2 fraction (`vo2 / demand`); 1 without 7c or at zero demand. */
export function o2Fraction(blood: BloodLike | undefined): number {
  const o = blood?.core?.o2;
  if (!o || !num(o.vo2) || !num(o.demand) || o.demand <= 0) return 1;
  return Math.min(1, Math.max(0, o.vo2 / o.demand));
}

export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;"""),
('src/l2/endo/adapters.ts',
"""  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;""",
"""  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;
  th.o2F = o2Fraction(bloodOf(ctx.ps)); // FU-10 E2: the aerobic-heat limit"""),
]

ORDER = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B2']
