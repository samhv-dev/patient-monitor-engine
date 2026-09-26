// The R27 + R36 demonstrations as data: a profile (lung-pathology row), starting settings, and the step applied
// after `settleS` sim seconds — ventilator settings and, for the vascular events the ventilator cannot cause,
// engine targets (Stage 7a stand-ins). The combined page runs them; the link tests assert the same steps.
import { STAND_INS, type ProfileId, type VentConfig } from '@pme/ventilator';

const withShunt = (id: string, shunt: number): NonNullable<LinkDemo['engineStep']> =>
  [...(STAND_INS[id] ?? []).map((x) => ({ variable: x.variable as 'sbp' | 'dbp' | 'cvp' | 'hr', value: x.value, rampS: x.rampS })), { variable: 'shunt', value: shunt, rampS: 0 }];

export interface LinkDemo {
  id: string;
  label: string;
  profile: ProfileId;
  start: Partial<VentConfig>;
  step: Partial<VentConfig>;
  /** Engine targets applied with the step (Stage 7a stand-ins: link/profiles.ts STAND_INS). */
  engineStep?: Array<{ variable: 'sbp' | 'dbp' | 'cvp' | 'hr' | 'shunt'; value: number; rampS: number }>;
  settleS: number;
  watch: string;
}

export const DEMOS: LinkDemo[] = [
  { id: 'peep', label: 'PEEP 5 → 15', profile: 'normal', start: { peep: 5, fio2: 40 }, step: { peep: 15 }, settleS: 60, watch: 'CO/MAP fall, CVP rises' },
  { id: 'fio2', label: 'FiO2 40 → 100 %', profile: 'ards-moderate', start: { peep: 5, fio2: 40, vt: 420, pmax: 45 }, step: { fio2: 100 }, settleS: 60, watch: 'SpO2 rises over ~1–2 min' },
  { id: 'rr', label: 'RR 14 → 22', profile: 'normal', start: { rate: 14, vt: 500 }, step: { rate: 22 }, settleS: 60, watch: 'EtCO2 falls over minutes' },
  { id: 'copd', label: 'COPD: RR 10 → 20', profile: 'copd-gold-3-4', start: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' }, step: { rate: 20 }, settleS: 90, watch: 'auto-PEEP ↑ → MAP ↓' },
  { id: 'ards', label: 'ARDS: PEEP 5 → 15', profile: 'ards-moderate', start: { peep: 5, fio2: 60, vt: 420, pmax: 45 }, step: { peep: 15 }, settleS: 90, watch: 'SpO2 ↑ (recruitment), CO ↓' },
  { id: 'hf', label: 'HF oedema: PEEP 5 → 12', profile: 'oedema-cardiogenic', start: { peep: 5, fio2: 40 }, step: { peep: 12 }, settleS: 90, watch: 'SpO2 ↑, CO ↓' },
  { id: 'ph', label: 'PH crisis: PEEP 15 + RR 8', profile: 'pulmonary-hypertension', start: { peep: 5, rate: 14 }, step: { peep: 15, rate: 8 }, settleS: 60, watch: 'hypercapnia + high PEEP: CVP ↑, BP ↓ (RV failure signature when 7a lands)' },
  { id: 'tension', label: 'Tension pneumothorax', profile: 'pneumothorax-simple', start: { pmax: 60 }, step: { compliance: 18, resistance: 14 }, engineStep: withShunt('pneumothorax-tension', 0.3), settleS: 60, watch: 'Ppeak/Pplat climb, SpO2 ↓, BP ↓ with CVP ↑' },
  { id: 'pe', label: 'Massive PE', profile: 'normal', start: {}, step: {}, engineStep: withShunt('pe-massive', 0.12), settleS: 60, watch: 'EtCO2 falls with unchanged ventilation; BP ↓' },
  { id: 'fibrosis', label: 'Fibrosis: VT 490 → 350, RR 20', profile: 'fibrosis-ild', start: { vt: 490, rate: 14 }, step: { vt: 350, rate: 20 }, settleS: 60, watch: 'driving pressure 16 → 12 cmH2O at the same minute ventilation' },
];
