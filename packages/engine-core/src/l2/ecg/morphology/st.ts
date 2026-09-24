// ST/T modifiers (brief §5; research 03 §1.6): STEMI by territory (reciprocal change emerges from the VCG
// projection), diffuse ischaemic depression, T inversion, long-QT T shape, Brugada type 1, digoxin effect.
import { WAVE, K_STRIDE } from '../kernels.ts';
import { kernelQtMs } from '../templates.ts';
import type { LeadId, StTerritory } from '../../../types.ts';
import type { Vec3 } from '../vcg.ts';
import type { MorphStage } from './index.ts';
import { addShaped, jPointS, mainT, scaleWaves } from './ops.ts';

/**
 * Injury vectors (VCG) and the lead in which `mm` is measured. Chosen so that, at mm = 2 (see the plan's
 * prototype table): anterior V2 +0.17 / V3 +0.20 with III −0.12, aVF −0.10; inferior III +0.20, aVF +0.17,
 * II +0.14 with aVL −0.13, I −0.06; lateral I +0.14, aVL +0.15, V5 +0.20 with III −0.17; septal V1 +0.16,
 * V2 +0.20; anterolateral V3 +0.20, V4 +0.18, I +0.08 with III −0.11; posterior V2 −0.20 (depression) [ENG].
 */
export const ST_TERRITORIES: Readonly<Record<StTerritory, { dir: Vec3; lead: LeadId; sign: 1 | -1 }>> = {
  inferior: { dir: [-0.3, 1, 0.3], lead: 'ecgIII', sign: 1 },
  anterior: { dir: [0.3, -0.75, -1], lead: 'V3', sign: 1 },
  septal: { dir: [-0.35, 0.05, -1], lead: 'V2', sign: 1 },
  lateral: { dir: [1, -0.35, 0.25], lead: 'V5', sign: 1 },
  anterolateral: { dir: [0.9, -0.55, -0.7], lead: 'V3', sign: 1 },
  posterior: { dir: [0, 0.05, 1], lead: 'V2', sign: -1 },
};
/** Diffuse subendocardial ischaemia: depression in II/V5, elevation in aVR [ENG]. */
export const ISCHAEMIA_DIR: Vec3 = [-0.6, -0.8, 0.25];
/** Brugada: coved elevation in the right precordial leads (V1 0.98, V2 1.40, V3 1.20, V4 0.49, V5 −0.01, I −0.15 per unit) [ENG]. */
export const BRUGADA_DIR: Vec3 = [-0.1, 0.1, -1];
const MEASURE_AFTER_J_S = 0.06; // ST measured at J + 60 ms (research 03 §1.6)

function qtS(k: readonly number[]): number {
  const q = kernelQtMs(k);
  return Number.isFinite(q) ? q / 1000 : 0.4;
}

/** STEMI: an ST kernel rising at the J point and fading into the T, sized so ST(J+60) = ±mm·0.1 mV in the lead. */
export const stStage: MorphStage = (k, _info, mods) => {
  if (!mods.st) return k;
  const ter = ST_TERRITORIES[mods.st.territory];
  const j = jPointS(k);
  const sFall = Math.max(0.04, (qtS(k) - j) / 3);
  return addShaped(k, j + 0.02, 0.01, sFall, ter.dir, ter.lead, ter.sign * mods.st.mm * 0.1, j + MEASURE_AFTER_J_S, WAVE.ST);
};

export const ischaemiaStage: MorphStage = (k, _info, mods) => {
  if (mods.ischaemicDepressionMv === 0) return k;
  const j = jPointS(k);
  return addShaped(k, j + 0.04, 0.015, 0.08, ISCHAEMIA_DIR, 'ecgII', mods.ischaemicDepressionMv, j + MEASURE_AFTER_J_S, WAVE.ST);
};

export const tInversionStage: MorphStage = (k, _info, mods) => (mods.tInversion > 0 ? scaleWaves(k, WAVE.T, 1 - 2 * mods.tInversion) : k);

/** Long QT: broad (σ ×1.3) and notched (second hump 60 ms later, 35%) T (research 03 §1.6). */
export const longQtStage: MorphStage = (k, _info, mods) => {
  if (!mods.longQT) return k;
  const t = mainT(k);
  if (t < 0) return k;
  k[t + 1] = (k[t + 1] as number) * 1.3;
  k[t + 2] = (k[t + 2] as number) * 1.3;
  k.push((k[t] as number) + 0.06, 0.03, 0.04, (k[t + 3] as number) * 0.35, (k[t + 4] as number) * 0.35, (k[t + 5] as number) * 0.35, WAVE.T);
  return k;
};

/** Brugada type 1: coved ST ≥ 0.2 mV in V1–V2 descending into an inverted T (research 03 §1.6). */
export const brugadaStage: MorphStage = (k, _info, mods) => {
  if (!mods.brugada1) return k;
  const j = jPointS(k);
  const t = mainT(k);
  addShaped(k, j + 0.01, 0.006, 0.07, BRUGADA_DIR, 'V2', 0.35, j + 0.01, WAVE.ST);
  if (t >= 0) addShaped(k, k[t] as number, 0.04, 0.04, BRUGADA_DIR, 'V2', -0.3, k[t] as number, WAVE.T);
  return k;
};

/** Digoxin: scooped ST depression (kernel −0.12 mV in II), flat T (×0.5), T/U 15% earlier → short QT (research 03 §1.6) [ENG values]. */
export const digoxinStage: MorphStage = (k, _info, mods) => {
  if (!mods.digoxin) return k;
  const t = mainT(k);
  if (t < 0) return k;
  const tDir: Vec3 = [k[t + 3] as number, k[t + 4] as number, k[t + 5] as number];
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * 0.85;
  scaleWaves(k, WAVE.T, 0.5);
  const j = jPointS(k);
  return addShaped(k, j + 0.09, 0.05, 0.05, [-tDir[0], -tDir[1], -tDir[2]], 'ecgII', -0.12, j + 0.09, WAVE.ST);
};
