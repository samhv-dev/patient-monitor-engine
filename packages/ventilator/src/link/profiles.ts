// Link profiles: one per lung-pathology row (pathology/catalogue.ts). Each has
//  • `patient` — the engine PatientProfile; since Stage V.1 (G7b rulings 4+5+13) it carries the row's engine
//                `lungConditions` (VENT_ROW_MAP: condition, severity, side, recruitability), so shunt, recruitment,
//                dead space, PVR/HPV and pleural pressure are the 7b lungs' own and lungState is read as absolute.
//  • `vent`    — the ventilator's lung before the first lungState (mechanicsToVent: the row, generated from the
//                same engine data) plus the row's reference settings when it has its own (neonate, OLV).
//  • `standIn` — engine targets set at link start that STAND IN for physiology no stage models yet (vasoplegia in
//                anaphylaxis, RV outflow air lock in air embolism). Massive PE and tension pneumothorax no longer
//                send 7a's circulation condition: the lung condition is the one event (FU-4 G6's engine alias applies
//                7a's `pe` at the same severity — the one PE PVR source; `ptxTension` builds its pleural pressure
//                through FU-4 F3's one-way valve) (V.1).
import type { LungConditionSpec, PatientProfile, StateVar } from '@pme/engine-core';
import { VENT_ROW_MAP } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import { LUNG_PATHOLOGIES, type LungPathology } from '../pathology/catalogue.ts';
import { mechanicsToVent } from '../pathology/mechanics.ts';

export type ProfileId = string;
/** An engine target set over `rampS` seconds; in MANUAL mode pressures are targets, so shock is set, not caused. */
export interface StandIn { variable: StateVar; value: number; rampS: number }
export interface LinkProfile {
  id: string;
  label: string;
  group: LungPathology['group'];
  patient: PatientProfile;
  vent: Partial<VentConfig>;
  standIn: StandIn[];
  /** Fields this row carries that the engine cannot act on yet (shown in the picker tooltip and the gate note). */
  stage7: string;
}

const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } as const;
const ADULT: PatientProfile = { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M', sensors: SENSORS };
/** Patients that differ from the 70 kg adult (engine fields available today). */
const PATIENTS: Record<string, PatientProfile> = {
  'obesity-ohs': { ageY: 45, weightKg: 130, heightCm: 170, sex: 'M', sensors: SENSORS },
  pregnancy: { ageY: 30, weightKg: 80, heightCm: 165, sex: 'F', sensors: SENSORS, baseline: { hr: 92 } },
  'neonatal-rds': { ageY: 0.01, weightKg: 3, heightCm: 50, sex: 'M', sensors: SENSORS, baseline: { hr: 150, sbp: 55, dbp: 32 } },
  'copd-gold-3-4': { ...ADULT, ageY: 68, baseline: { volumeStatus: 0.6 } },
  // Stage V.1 (G7a NR-3 → G7b ruling 4+5+13): cardiogenic oedema is LV failure — 7a's hfref, moderate
  'oedema-cardiogenic': { ...ADULT, ageY: 70, baseline: { volumeStatus: 0.8 }, conditions: [{ id: 'hfref', severity: 0.67 }] },
};
const shock = (sbp: number, dbp: number, cvp: number, hr: number): StandIn[] =>
  ([['sbp', sbp], ['dbp', dbp], ['cvp', cvp], ['hr', hr]] as const).map(([variable, value]) => ({ variable, value, rampS: 20 }));
/**
 * 7a's own circulation condition for massive PE (φ 0.6, PE_VASO 1.0: PVR ×4.0). Stage V.1: NO profile sends it any
 * more — the profile sends the lung `pe` (severity 1) only; since FU-4 G6 (engine aliases.ts) either spelling applies
 * BOTH owners, 7a's φ mapping being the one PE PVR source (lung `pe` 1 → 7a `pe` 1: φ 0.8, PVR ×9.0) and the lungs
 * the dead space and shunt. Kept for the R36 massive-PE test, whose rig NR-3 closed (it sends both spellings,
 * each aliased to both owners). Tension pneumothorax: the lungs' `ptxTension` pPtx reaches 7a through respPleural.
 */
export interface CircConditionStandIn { id: 'pe' | 'tensionPtx'; severity: number }
export const CIRC_CONDITIONS: Record<string, CircConditionStandIn> = {
  'pe-massive': { id: 'pe', severity: 0.75 },
};
/** Recruitability of the two severe-ARDS rows (catalogue §6: high recruiter 0.5, low 0.15; VENT_ROW_MAP carries the mean). */
const RECRUIT_FRAC: Record<string, number> = { 'ards-severe-recruitable': 0.5, 'ards-severe-nonrecruitable': 0.15 };
/** The row's engine lung conditions (Stage V.1): none for 'normal' and 'atelectasis' (the induction atelectasis is dynamic). */
export function lungConditionsOf(id: string): LungConditionSpec[] {
  const m = VENT_ROW_MAP[id];
  if (!m) return [];
  const rf = RECRUIT_FRAC[id];
  return [{ id: m.id as LungConditionSpec['id'], severity: m.severity, ...(m.side ? { side: m.side } : {}), ...(rf !== undefined ? { recruitFrac: rf } : {}) }];
}
/** INTERIM (R41; deleted when Stage 7a's right heart consumes pvrMultiplier): Stage 7a/7g stand-ins [ENG] — the haemodynamic picture each condition produces, set as MANUAL targets. */
export const STAND_INS: Record<string, StandIn[]> = {
  'anaphylaxis-bronchospasm': shock(70, 35, 3, 125), // vasoplegia (Stage 7g)
  'air-embolism': shock(80, 50, 12, 110), // RV outflow air lock
};

export function profileOf(row: LungPathology): LinkProfile {
  const ref = row.ref;
  const refVent: Partial<VentConfig> = ref
    ? { ...(ref.vtMl !== undefined ? { vt: ref.vtMl } : {}), ...(ref.rr !== undefined ? { rate: ref.rr } : {}), ...(ref.peep !== undefined ? { peep: ref.peep } : {}), ...(ref.flowLpm !== undefined ? { vcFlow: ref.flowLpm } : {}) }
    : {};
  const later = Object.entries(row.wired).filter(([, w]) => w === 'stage7a' || w === 'stage7b' || w === 'not-modelled').map(([k, w]) => `${k}: ${w}`);
  const lc = lungConditionsOf(row.id);
  return {
    id: row.id, label: row.label, group: row.group, patient: { ...(PATIENTS[row.id] ?? ADULT), ...(lc.length ? { lungConditions: lc } : {}) },
    vent: { ...mechanicsToVent(row), ...refVent },
    standIn: STAND_INS[row.id] ?? [], stage7: later.join(', '),
  };
}

export const PROFILES: Record<ProfileId, LinkProfile> = Object.fromEntries(LUNG_PATHOLOGIES.map((r) => [r.id, profileOf(r)]));
