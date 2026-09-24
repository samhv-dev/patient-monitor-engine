// Morphology pipeline: modifiers applied to one beat's kernel list (brief §5 "Modifiers"). Each stage is a pure
// function (kernels, info, mods) → kernels. Later tasks append stages to MORPH_STAGES.
import type { Modifiers } from '../../../types.ts';
import type { BeatTemplateId } from '../beat-templates.ts';
import { alternansStage, axisStage, bbbStage, lowVoltageStage, lvhStage, qrsOverrideStage, transitionStage } from './conduction.ts';
import { brugadaStage, digoxinStage, ischaemiaStage, longQtStage, stStage, tInversionStage } from './st.ts';

export interface BeatInfo {
  template: BeatTemplateId;
  /** Supraventricular (conducted/junctional/atrial-origin) beat: BBB, WPW-type changes apply. */
  supra: boolean;
  qtMs: number;
  seq: number;
}

export type MorphStage = (k: number[], info: BeatInfo, mods: Modifiers) => number[];

/** Order matters: fingerprint → timing (overrides, K, temperature) → conduction/axis/voltage → ST/T → alternans. */
export const MORPH_STAGES: MorphStage[] = [
  qrsOverrideStage,
  bbbStage,
  axisStage,
  transitionStage,
  lvhStage,
  lowVoltageStage,
  longQtStage,
  digoxinStage,
  tInversionStage,
  stStage,
  ischaemiaStage,
  brugadaStage,
  alternansStage,
];

export function applyMorphology(k: number[], info: BeatInfo, mods: Modifiers): number[] {
  let out = k;
  for (const stage of MORPH_STAGES) out = stage(out, info, mods);
  return out;
}

/** P-wave modifiers (hyperkalaemia flattening, low voltage, individuality). Later tasks append stages. */
export type PStage = (k: number[], mods: Modifiers) => number[];
export const P_STAGES: PStage[] = [];

export function applyPMorphology(k: number[], mods: Modifiers): number[] {
  let out = k;
  for (const stage of P_STAGES) out = stage(out, mods);
  return out;
}

/** PR additions from modifiers (ms). Later tasks append terms. */
export type PrTerm = (mods: Modifiers) => number;
export const PR_TERMS: PrTerm[] = [];

export function prDeltaMs(mods: Modifiers): number {
  let d = 0;
  for (const f of PR_TERMS) d += f(mods);
  return d;
}
