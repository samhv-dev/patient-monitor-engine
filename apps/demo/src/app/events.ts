// Acute events (Task 26, showcase additions): the engine's systemic conditions an instructor starts and stops during a
// case — tamponade, tension pneumothorax, massive PE, anaphylaxis, septic shock, malignant hyperthermia and the rest of
// the `applyEvent { kind: 'condition' }` catalogue (7a circulation, 7c blood, 7d organs, 7e endocrine, Stage 3 MH).
// Each is one command with a severity 0–1; severity 0 stops it. Two classic events have no command of their own, so
// their rows say how to produce them with what the engine does model. No DOM here.
import type { CommandInput } from '@pme/controller';

export interface AcuteEvent {
  id: string;
  label: string;
  /** Tooltip text: what the event does in the model, in clinical words. */
  detail: string;
}

export const ACUTE_EVENTS: readonly AcuteEvent[] = [
  { id: 'tamponade', label: 'Cardiac tamponade', detail: 'Pericardial fluid limits filling: falling pressure, rising CVP, pulsus paradoxus; propofol can tip it into PEA.' },
  { id: 'tensionPtx', label: 'Tension pneumothorax', detail: 'Pleural pressure builds with every breath: rising airway pressures, falling venous return and pressure.' },
  { id: 'pe', label: 'Massive pulmonary embolism', detail: 'Obstructed pulmonary circulation: right-ventricular failure, falling EtCO₂ and pressure.' },
  { id: 'anaphylaxis', label: 'Anaphylaxis', detail: 'Vasodilatation, capillary leak and bronchospasm; treat with epinephrine and fluids.' },
  { id: 'sepsis', label: 'Septic shock', detail: 'Warm septic shock developing over minutes: low SVR, tachycardia, lactate rise.' },
  { id: 'mh', label: 'Malignant hyperthermia', detail: 'Hypermetabolism: rising EtCO₂, tachycardia, then temperature; treat with dantrolene.' },
  { id: 'rvInfarct', label: 'Right-ventricular infarction', detail: 'A failing right ventricle: hypotension with high CVP and clear lungs.' },
  { id: 'thyroidStorm', label: 'Thyroid storm', detail: 'Hypermetabolism with tachycardia and fever.' },
  { id: 'sirs', label: 'Systemic inflammatory response', detail: 'Inflammation without infection: tachycardia, vasodilatation, fever.' },
  { id: 'hypermetabolic', label: 'Hypermetabolic state', detail: 'Raised oxygen consumption and CO₂ production.' },
  { id: 'dka', label: 'Diabetic ketoacidosis', detail: 'Ketoacidosis with a compensating respiratory drive.' },
  { id: 'burns', label: 'Major burns', detail: 'Burned tissue: succinylcholine releases a large potassium load.' },
  { id: 'tbi', label: 'Traumatic brain injury', detail: 'Rising intracranial pressure, falling cerebral perfusion.' },
  { id: 'hepaticFailure', label: 'Acute liver failure', detail: 'Reduced hepatic clearance of drugs and lactate.' },
  { id: 'aki', label: 'Acute kidney injury', detail: 'Falling urine output and potassium clearance.' },
];

/** Events the engine has no command for, with how to produce them in this version. */
export const NOT_AN_EVENT: readonly { label: string; how: string }[] = [
  { label: 'Hyperkalaemia', how: 'No direct command yet: start Major burns, then give succinylcholine 1.5 mg/kg — potassium rises within minutes.' },
  { label: 'Myocardial ischaemia', how: 'No direct command yet: it arises from the coronary supply — choose the "Aortic stenosis and CAD" patient on Start and let the pressure fall. Right-ventricular infarction is in the list above.' },
];

export const SEVERITIES: readonly [string, string, number][] = [['mild', 'Mild', 0.33], ['moderate', 'Moderate', 0.67], ['severe', 'Severe', 1]];

export const eventLabel = (id: string): string => ACUTE_EVENTS.find((e) => e.id === id)?.label ?? 'Condition';

/** Severity word for a 0–1 severity (the same bands as the log's). */
export const severityWord = (s: number): string => (s <= 0 ? 'stopped' : s < 0.45 ? 'mild' : s < 0.8 ? 'moderate' : 'severe');

/** The engine command that starts (severity > 0) or stops (0) an acute event. */
export function conditionCommand(id: string, severity: number): CommandInput {
  return { type: 'applyEvent', event: { kind: 'condition', id, severity } } as CommandInput;
}

/** "Cardiac tamponade (severe)", for the session bar and the Patient tab. */
export function activeText(active: ReadonlyMap<string, number>): string[] {
  return [...active].map(([id, s]) => `${eventLabel(id)} (${severityWord(s)})`);
}
