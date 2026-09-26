// The learner action bar: what the team at the bedside does. Each button is an `applyEvent` (brief §7.2
// ClinicalEvent). The engine does not model most of these events yet (Stage 7); the scenario runner still sees
// them, so transitions fire — shocks, drugs, CPR, pacing — while the rhythm changes come from the scenario.
// Stage 4b: the engine models the defibrillator and pacer, so a shock needs a charge first (200 J in 7 s).
import type { ClinicalEvent } from '@pme/controller';

export interface LearnerAction {
  id: string;
  label: string;
  event: ClinicalEvent;
  /** CPR is a toggle: the button alternates between `event` and `off`. */
  off?: ClinicalEvent;
}

export const LEARNER_ACTIONS: LearnerAction[] = [
  { id: 'charge200', label: 'Charge 200 J', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
  { id: 'shock200', label: 'Shock 200 J', event: { kind: 'defib', action: 'shock', energyJ: 200 } },
  { id: 'cpr', label: 'Start CPR', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 }, off: { kind: 'cpr', active: false } },
  { id: 'epi1', label: 'Epinephrine 1 mg', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } },
  { id: 'amio300', label: 'Amiodarone 300 mg', event: { kind: 'drug', drugId: 'amiodarone', dose: 300, unit: 'mg', route: 'iv' } },
  { id: 'adeno6', label: 'Adenosine 6 mg', event: { kind: 'drug', drugId: 'adenosine', dose: 6, unit: 'mg', route: 'iv' } },
  { id: 'adeno12', label: 'Adenosine 12 mg', event: { kind: 'drug', drugId: 'adenosine', dose: 12, unit: 'mg', route: 'iv' } },
  { id: 'atropine', label: 'Atropine 1 mg', event: { kind: 'drug', drugId: 'atropine', dose: 1, unit: 'mg', route: 'iv' } },
  { id: 'pace', label: 'Pace 80 mA', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 80 } }, // R39-4: ~10 % above the 70 mA default threshold
  { id: 'fluid', label: 'Fluid 1000 mL', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 1000, overS: 300 } },
  { id: 'propofol', label: 'Propofol 150 mg', event: { kind: 'drug', drugId: 'propofol', dose: 150, unit: 'mg', route: 'iv' } },
  { id: 'phenyl', label: 'Phenylephrine 100 µg', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } },
];
