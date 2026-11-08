// The ids of the validation gate's expected failures (brief 84): one per missing mechanism, each the row of
// docs/guides/known-deviations.md "Validation gate: expected failures" that names it. A suite marks a row with
// `miss(ID, since, measured)`; the band stays as its source states it. Audit ids: docs/review-inputs/research/44.
import type { ExpectedMiss } from '../segments/types.ts';

export const MECHANISMS = {
  A: { id: 'A: electromechanical delay and transit time, wave reflection (stage)', mechanism: 'a sourced electromechanical delay and aorta → radial transit, and a radial incisura after valve closure from wave reflection instead of the 5 Hz resonator trough (audit V-01, V-02, DEV-04)' },
  B: { id: 'B: pleth shape (mechanism)', mechanism: 'the finger pulse shape: median-beat PPG against ABP shape (audit X-14, DEV-04)' },
  D: { id: 'D: RV diastolic/pericardial mechanics (mechanism brief)', mechanism: 'RV dilation under pericardial constraint and ventricular interdependence in RV infarct (audit V-11)' },
  E: { id: 'E: septic time course and fluid-refractory vasoplegia (mechanism brief)', mechanism: 'the onset over hours, not a 600-s ramp, and arteriolar tone that fluid alone does not restore (audit V-12)' },
  F: { id: 'F: preload-fixed stroke volume at low CVP (mechanism brief)', mechanism: 'SV set by preload, so a slower β-blocked heart loses output at near-zero filling pressure (research 46 §F)' },
  G: { id: 'G: respiratory effort under controlled ventilation (mechanism brief)', mechanism: 'the drive and effort visible while the ventilator breathes, so effort before reversal can be measured (audit DEV-06)' },
  H: { id: 'H: pleth reference SV₀ = the settled resting SV (PR #333)', mechanism: 'the PI reference stroke volume is the patient\'s own settled resting SV, not the bare-circuit stabiliser\'s (brief 79, PR #333)' },
} as const;

export const miss = (k: keyof typeof MECHANISMS, since: string, measured: string): ExpectedMiss => ({ ...MECHANISMS[k], since, measured });
