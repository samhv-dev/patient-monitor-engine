// VF hybrid generator (brief §4.1 "Special generators", §11 C1; research 03 §1.8):
//   f_dom(t) = 5.5 − 1.5·(1 − e^(−t_noCPR/8 min)) Hz (+ CPR boost 0.75 Hz, + epinephrine 0.5 Hz)
//   A(t)     = A0·e^(−t_eff/τ_A), τ_A 7 min without CPR, 17.5 min with CPR (t_eff runs slower during CPR)
//   VF(t)    = A(t)/(2√2) · texture(f_dom(t)) along a slowly rotating VCG direction
// A is the peak-to-peak-equivalent amplitude in lead II (2√2·RMS). Recorded CUDB texture is time-warped to
// f_dom(t); without templates the AR(2) resonator bank is used. Coarse → fine at 0.2 mV; asystole hazard
// 0.02/min, forced below 0.05 mV. The generator integrates the clocks sample by sample (so CPR/epinephrine
// modifiers act immediately) and raises flags; the planner (vfClock) turns flags into rhythm changes.
import { normal, sfc32Next, type Sfc32State } from '../../../rng/sfc32.ts';
import type { Modifiers } from '../../../types.ts';
import { VF_SCALE, VF_TEMPLATES } from '../../../../templates/vf-cudb.ts';
import { arSample, createTex, decodeTemplates, texSample, type ArState, type TexState } from '../texture.ts';
import { HOOKS, NEVER, type RhythmCtx, type RhythmState } from '../rhythm-state.ts';
import { RHYTHMS } from '../rhythms.ts';
import type { EcgGenInputs } from '../ecg-gen.ts';

export const F0_HZ = 5.5; // brief §4.1
export const F_DROP_HZ = 1.5;
export const F_TAU_S = 8 * 60;
export const TAU_A_S = 7 * 60; // τ_A 6–8 min without CPR
export const TAU_A_CPR_S = 17.5 * 60; // 15–20 min with CPR
export const CPR_BOOST_HZ = 0.75; // CPR adds 0.5–1 Hz
const CPR_BOOST_TAU_S = 30; // [ENG]
export const EPI_A_GAIN = 0.3; // +20–40% A
export const EPI_F_HZ = 0.5; // +0.5 Hz
export const EPI_S = 180; // 2–4 min
export const A0_MV = 0.8; // 0.6–1.0 mV coarse
export const FINE_MV = 0.2; // coarse/fine split
export const ASYSTOLE_MV = 0.05;
export const HAZARD_PER_S = 0.02 / 60;
const FINE_START_MV = 0.15; // vfFine starts here [ENG]
/** VF VCG direction (lead II gain ≈ 1) plus a slow rotation of ±15% [ENG]. */
const VF_DIR = [0.25, 0.85, -0.3] as const;
const VF_ROT = [0.35, -0.1, 0.5] as const;
const ROT_PERIOD_S = 20; // slow rotation, one period per 20 s analysis window [ENG]
const TWO_SQRT2 = 2 * Math.SQRT2;

const TEX = VF_TEMPLATES.length > 0 ? decodeTemplates({ scale: VF_SCALE, items: VF_TEMPLATES }) : [];

export interface VfState {
  start: number;
  end: number;
  a0: number;
  tNoCpr: number;
  tEff: number;
  boost: number;
  rng: Sfc32State;
  tex: TexState | null;
  ar: ArState;
  fine: boolean;
  fineAt: number | null;
  asystoleAt: number | null;
  announcedFine: boolean;
}

/** Epinephrine bump b ∈ [0, 1]: sin² over EPI_S seconds, peak 1 at EPI_S/2 [ENG]. */
export function epiBump(mods: Modifiers, s: number): number {
  const e = mods.epinephrineAtS;
  if (e === null || s < e || s > e + EPI_S) return 0;
  return Math.sin((Math.PI * (s - e)) / EPI_S) ** 2;
}

export function vfFreqHz(v: VfState, mods: Modifiers, s: number): number {
  return F0_HZ - F_DROP_HZ * (1 - Math.exp(-v.tNoCpr / F_TAU_S)) + v.boost + EPI_F_HZ * epiBump(mods, s);
}

export function vfAmplitudeMv(v: VfState, mods: Modifiers, s: number): number {
  return v.a0 * Math.exp(-v.tEff / TAU_A_S) * (1 + EPI_A_GAIN * epiBump(mods, s));
}

function onApply(st: RhythmState, _prev: unknown, t0: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  if (d.continuous !== 'vf') {
    if (st.vf && st.vf.end >= NEVER) st.vf.end = t0;
    return;
  }
  if (st.vf && st.vf.end >= NEVER) return; // coarse ↔ fine switch keeps the running episode
  const rng: Sfc32State = [sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome), sfc32Next(ctx.rng.outcome)];
  const a0 = st.opts.vfAmplitudeMv ?? A0_MV;
  // vfFine starts as if VF had decayed from A0 to 0.15 mV without CPR.
  const t = st.id === 'vfFine' ? TAU_A_S * Math.log(a0 / FINE_START_MV) : 0;
  st.vf = {
    start: t0, end: NEVER, a0, tNoCpr: t, tEff: t, boost: 0, rng,
    tex: TEX.length > 0 ? createTex(TEX.length, [rng[0], rng[1] ^ 0x9e37, rng[2], rng[3]]) : null,
    ar: { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] },
    fine: st.id === 'vfFine', fineAt: null, asystoleAt: null, announcedFine: st.id === 'vfFine',
  };
  st.records.push({ type: 'rhythmSegment', t: t0, rhythm: st.id, seed: rng[0], ...(TEX.length > 0 ? { templateId: 'vf-cudb' } : {}) });
}

/** VCG source: one VF sample. */
export function vfSource(g: EcgGenInputs, n: number, s: number, acc: Float64Array): void {
  const v = g.st.vf;
  if (!v || s < v.start || s >= v.end) return;
  const dt = 1 / 500;
  const cpr = g.mods.artefact.cpr !== null;
  if (cpr) v.tEff += (dt * TAU_A_S) / TAU_A_CPR_S;
  else {
    v.tEff += dt;
    v.tNoCpr += dt;
  }
  v.boost += ((cpr ? CPR_BOOST_HZ : 0) - v.boost) * (dt / CPR_BOOST_TAU_S);
  const f = vfFreqHz(v, g.mods, s);
  const a = vfAmplitudeMv(v, g.mods, s);
  const u = v.tex ? texSample(TEX, v.tex, f) : arSample(v.ar, f, [normal(v.rng), normal(v.rng), normal(v.rng), normal(v.rng)]);
  const k = (a / TWO_SQRT2) * u;
  const r = 0.15 * Math.sin((2 * Math.PI * s) / ROT_PERIOD_S + (v.rng[3] % 7));
  acc[0] = (acc[0] as number) + k * (VF_DIR[0] + r * VF_ROT[0]);
  acc[1] = (acc[1] as number) + k * (VF_DIR[1] + r * VF_ROT[1]);
  acc[2] = (acc[2] as number) + k * (VF_DIR[2] + r * VF_ROT[2]);
  if (n % 500 === 0) {
    if (!v.fine && a < FINE_MV) {
      v.fine = true;
      v.fineAt = s;
    }
    const auto = g.st.opts.autoAsystole !== false;
    if (auto && v.asystoleAt === null && (a < ASYSTOLE_MV || sfc32Next(v.rng) / 4294967296 < HAZARD_PER_S)) v.asystoleAt = s;
  }
}

/** Planner clock: announces coarse → fine and performs VF → asystole. */
export const vfClock = {
  next(st: RhythmState): number {
    const v = st.vf;
    if (!v || v.end < NEVER) return NEVER;
    const a = v.fineAt !== null && !v.announcedFine ? v.fineAt : NEVER;
    const b = v.asystoleAt ?? NEVER;
    return Math.min(a, b);
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const v = st.vf as VfState;
    if (v.fineAt !== null && !v.announcedFine && t === v.fineAt) {
      v.announcedFine = true;
      st.id = 'vfFine';
      st.records.push({ type: 'rhythmSegment', t, rhythm: 'vfFine', seed: v.rng[0] });
      return;
    }
    v.asystoleAt = null;
    HOOKS.apply(st, 'asystole', {}, t, true, ctx);
    st.records.push({ type: 'rhythmSegment', t: st.planT, rhythm: 'asystole', seed: 0 });
  },
};

HOOKS.onApply.push(onApply);
