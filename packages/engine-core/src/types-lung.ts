// Stage 7b public types (R27, R31, R36, R43) in their own file, as Stage 3 did: types.ts and types-resp.ts gain one
// line each. Conditions are the catalogue's ids (docs/physiology/stage-7-lung-pathology-catalogue.md, data in
// packages/engine-core/data/lung-pathology.ts).
export type LungSide = 'L' | 'R';

export const LUNG_CONDITION_IDS = [
  'ph', 'bronchospasm', 'asthma', 'anaphylaxis', 'copd', 'ards', 'ild', 'ssc', 'chestWall', 'obesity', 'pneumonia',
  'atelectasis', 'pulmOedema', 'effusion', 'ptxSimple', 'ptxTension', 'haemothorax', 'pe', 'fatEmbolism', 'vae',
  'aspiration', 'olv', 'endobronchial', 'bpf', 'airwayObstruction', 'cf', 'nmWeakness', 'diaphragmParalysis',
  'pregnancy', 'neonatalRds', 'covidPneumonitis', 'smokeInhalation',
] as const;
export type LungConditionId = (typeof LUNG_CONDITION_IDS)[number];

/** A condition on the patient: catalogue id, severity 0–1 (0 removes it), side for sided conditions, ARDS-type recruitability. */
export interface LungConditionSpec {
  id: LungConditionId;
  severity: number;
  side?: LungSide;
  /** Fraction of the condition's non-aerated lung that is recruitable (catalogue §6: high 0.5, low 0.15). */
  recruitFrac?: number;
}

/** applyEvent kinds added in Stage 7b (plan decision 11). */
export type LungClinicalEvent =
  | { kind: 'lungCondition'; id: LungConditionId; severity: number; side?: LungSide; recruitFrac?: number }
  | { kind: 'mainstem'; ventilated: 'both' | 'left' | 'right' }
  | { kind: 'recruit'; pressureCmH2O: number; durationS: number };

export type LungCommandBody = { type: 'applyEvent'; event: LungClinicalEvent };

/** One lung in `lungState.lungs` (R43). */
export interface LungStateLung {
  side: LungSide;
  complianceMlPerCmH2O: number; // this lung's respiratory-system compliance
  resistanceCmH2OPerLps: number; // this lung's airway resistance (carina → alveoli)
  tauS: number; // ventilation-weighted expiratory τ
  shunt: number; // fraction of this lung's flow through its collapsed part
  perfusionFrac: number; // fraction of pulmonary flow reaching this lung
  ventilated: boolean;
  aerated: number; // aerated fraction 0–1
}

/** Additive `lungState` fields (tables §4 lead, catalogue lead table, Q95). All optional on the event type. */
export interface LungStateExt {
  lungs: LungStateLung[];
  complianceSlowMlPerCmH2O: number;
  tauSlowS: number;
  fSlow: number;
  atelectasisFrac: number;
  resistanceExpCmH2OPerLps: number;
  chestWallComplianceMlPerCmH2O: number;
  recruitableFrac: number;
  vqAdmixture: number;
  leakFraction: number;
  autoPeepCmH2O: number;
  conditions: LungConditionSpec[];
}
