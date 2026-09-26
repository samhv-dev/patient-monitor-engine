// Link profiles: one per lung-pathology row (pathology/catalogue.ts). Each has
//  • `patient` — the engine PatientProfile using ONLY fields on main today (ageY, weightKg, heightCm, sex,
//                baseline StateVars, sensors). Obesity reaches the engine's FRC rule; nothing else does yet.
//  • `vent`    — the ventilator's lung (mechanicsToVent) plus the row's reference settings when it has its own
//                (neonate, one-lung ventilation) — the BASE that lungState modulates (lung-input.ts).
//  • `recruit` — the interim PEEP → shunt curve (link/recruit.ts), or null; `shunt` is sent once when null.
//  • `standIn` — engine targets set at link start that STAND IN for Stage 7a physiology the engine lacks
//                (RV failure in massive PE, obstructive shock in tension pneumothorax, vasoplegia in anaphylaxis).
// STAGE 7 TARGETS (R22/R24/R31/R36): pvrMultiplier/hpvSensitivity (7a), dead space/diffusion (7b), and the
// profile mechanics themselves move into lungState; `standIn` is deleted when 7a lands.
import type { PatientProfile, StateVar } from '@pme/engine-core';
import type { VentConfig } from '../types.ts';
import { LUNG_PATHOLOGIES, type LungPathology } from '../pathology/catalogue.ts';
import { mechanicsToVent, recruitOf } from '../pathology/mechanics.ts';
import type { RecruitParams } from './recruit.ts';

export type ProfileId = string;
/** An engine target set over `rampS` seconds; in MANUAL mode pressures are targets, so shock is set, not caused. */
export interface StandIn { variable: StateVar; value: number; rampS: number }
export interface LinkProfile {
  id: string;
  label: string;
  group: LungPathology['group'];
  patient: PatientProfile;
  vent: Partial<VentConfig>;
  recruit: RecruitParams | null;
  shunt: number;
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
  'oedema-cardiogenic': { ...ADULT, ageY: 70, baseline: { volumeStatus: 0.8 } },
};
const shock = (sbp: number, dbp: number, cvp: number, hr: number): StandIn[] =>
  ([['sbp', sbp], ['dbp', dbp], ['cvp', cvp], ['hr', hr]] as const).map(([variable, value]) => ({ variable, value, rampS: 20 }));
/** Stage 7a/7g stand-ins [ENG]: the haemodynamic picture each condition produces, set as MANUAL targets. */
export const STAND_INS: Record<string, StandIn[]> = {
  'pe-massive': shock(70, 45, 15, 120), // RV failure → low CO; EtCO2 falls through Stage 3's low-flow factor
  'pneumothorax-tension': shock(65, 40, 18, 125), // obstructive shock
  'anaphylaxis-bronchospasm': shock(70, 35, 3, 125), // vasoplegia (Stage 7g)
  'air-embolism': shock(80, 50, 12, 110), // RV outflow air lock
};

export function profileOf(row: LungPathology): LinkProfile {
  const ref = row.ref;
  const refVent: Partial<VentConfig> = ref
    ? { ...(ref.vtMl !== undefined ? { vt: ref.vtMl } : {}), ...(ref.rr !== undefined ? { rate: ref.rr } : {}), ...(ref.peep !== undefined ? { peep: ref.peep } : {}), ...(ref.flowLpm !== undefined ? { vcFlow: ref.flowLpm } : {}) }
    : {};
  const later = Object.entries(row.wired).filter(([, w]) => w === 'stage7a' || w === 'stage7b' || w === 'not-modelled').map(([k, w]) => `${k}: ${w}`);
  return {
    id: row.id, label: row.label, group: row.group, patient: PATIENTS[row.id] ?? ADULT,
    vent: { ...mechanicsToVent(row), ...refVent }, recruit: recruitOf(row), shunt: row.shunt.value,
    standIn: STAND_INS[row.id] ?? [], stage7: later.join(', '),
  };
}

export const PROFILES: Record<ProfileId, LinkProfile> = Object.fromEntries(LUNG_PATHOLOGIES.map((r) => [r.id, profileOf(r)]));
