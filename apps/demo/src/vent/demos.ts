// The R27 + R36 demonstrations as data: a profile (lung-pathology row), starting settings, and the step applied
// after `settleS` sim seconds — ventilator settings and, for the vascular events the ventilator cannot cause,
// engine targets (Stage 7a stand-ins). The combined page runs them; the link tests assert the same steps.
import type { ProfileId, VentConfig } from '@pme/ventilator';

export interface LinkDemo {
  id: string;
  label: string;
  profile: ProfileId;
  start: Partial<VentConfig>;
  step: Partial<VentConfig>;
  /** Engine targets applied with the step (Stage 7a stand-ins: link/profiles.ts STAND_INS). */
  engineStep?: Array<{ variable: 'sbp' | 'dbp' | 'cvp' | 'hr' | 'shunt'; value: number; rampS: number }>;
  /** Stage V.1: engine `applyEvent` bodies sent with the step (lung and circulation conditions), as the R36 tests send them. */
  engineEvents?: Array<Record<string, unknown>>;
  settleS: number;
  watch: string;
}

export const DEMOS: LinkDemo[] = [
  { id: 'peep', label: 'PEEP 5 → 15', profile: 'normal', start: { peep: 5, fio2: 40 }, step: { peep: 15 }, settleS: 60, watch: 'CO/MAP fall, CVP rises' },
  { id: 'fio2', label: 'FiO2 40 → 100 %', profile: 'ards-moderate', start: { peep: 5, fio2: 40, vt: 420, pmax: 45 }, step: { fio2: 100 }, settleS: 60, watch: 'SpO2 rises over ~1–2 min' },
  { id: 'rr', label: 'RR 14 → 22', profile: 'normal', start: { rate: 14, vt: 500 }, step: { rate: 22 }, settleS: 60, watch: 'EtCO2 falls over minutes' },
  { id: 'copd', label: 'COPD: RR 10 → 20', profile: 'copd-gold-3-4', start: { rate: 10, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' }, step: { rate: 20 }, settleS: 90, watch: 'auto-PEEP ↑ → MAP ↓' },
  { id: 'ards', label: 'ARDS: PEEP 5 → 15', profile: 'ards-moderate', start: { peep: 5, fio2: 60, vt: 420, pmax: 45 }, step: { peep: 15 }, settleS: 90, watch: 'SpO2 ↑ (recruitment), CO ↓' },
  // Stage V.1 (G7b rulings 4+5+13): PEEP need not lower CO in HFrEF — the lung-water shunt falls and PCWP falls
  { id: 'hf', label: 'HF oedema: PEEP 5 → 12', profile: 'oedema-cardiogenic', start: { peep: 5, fio2: 40 }, step: { peep: 12 }, settleS: 90, watch: 'shunt/SpO2 ↑, PCWP ↓' },
  { id: 'ph', label: 'PH crisis: PEEP 15 + RR 8', profile: 'pulmonary-hypertension', start: { peep: 5, rate: 14 }, step: { peep: 15, rate: 8 }, settleS: 60, watch: 'hypercapnia + high PEEP: EtCO2 ↑, CVP ↑, BP ↓ (the 7b ph lungs on the 7a right heart)' },
  // Stage V.1: both are the engine's lung conditions now — the tension's pleural pressure (built through FU-4 F3's valve)
  // reaches the ventilator and 7a; the PE's alveolar dead space and shunt 0.10 are the data row's and, since FU-4 G6, the
  // dispatched lung `pe` also applies 7a's `pe` at the same severity (PVR ×9.0, the one PE PVR source). The page had lost
  // 7a's PE condition when 7a moved it out of STAND_INS (its demo sent only a MANUAL shunt 0.12). Measured (link sim,
  // MANUAL): EtCO2 36 → 22.7, MAP 105.7 → 97.3, CO 6.53 → 6.21 — MANUAL pressure targets hold BP up.
  { id: 'tension', label: 'Tension pneumothorax', profile: 'pneumothorax-simple', start: { pmax: 60 }, step: {}, engineEvents: [{ kind: 'lungCondition', id: 'ptxSimple', severity: 0 }, { kind: 'lungCondition', id: 'ptxTension', severity: 0.8 }], settleS: 60, watch: 'Ppeak/Pplat climb, SpO2 ↓, BP ↓ with CVP ↑' },
  { id: 'pe', label: 'Massive PE', profile: 'normal', start: {}, step: {}, engineEvents: [{ kind: 'lungCondition', id: 'pe', severity: 1 }], settleS: 60, watch: 'EtCO2 falls with unchanged ventilation; BP ↓ a little (MANUAL targets)' },
  { id: 'fibrosis', label: 'Fibrosis: VT 490 → 350, RR 20', profile: 'fibrosis-ild', start: { vt: 490, rate: 14 }, step: { vt: 350, rate: 20 }, settleS: 60, watch: 'driving pressure 16 → 12 cmH2O at the same minute ventilation' },
];
