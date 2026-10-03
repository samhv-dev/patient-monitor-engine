// The instructor's targets (engine StateVars) in clinical units: glossary label, display scale, step and range. Ranges
// are the engine's own (l1/state.ts STATE_SCHEMA), shown in the display unit. Order = the order a clinician reads a
// monitor: rate and rhythm, pressures, oxygenation, ventilation, temperature, then the model inputs.
import type { StateVar } from '@pme/engine-core';
import { entry, shortLabel, unitOf } from './glossary.ts';

export interface VitalSpec {
  v: StateVar;
  /** Glossary entry number (research/11 §5 or the Stage 9 additions). */
  n: number;
  /** Display = engine value × scale. */
  scale: number;
  unit: string;
  step: number;
  digits: number;
  min: number;
  max: number;
  group: 'Rate and pressures' | 'Oxygenation and ventilation' | 'Temperature and chemistry' | 'Model inputs';
  /** Shown only in MANUAL mode (inputs the model computes itself in MODELED). */
  manualOnly?: boolean;
  /**
   * In MODELED mode the engine accepts a hold on this value but its model keeps computing it (measured on the merged
   * base: the value does not move and the flag reads "Model override"), so the row says so and Set is disabled.
   */
  modelOwned?: boolean;
  /** The engine sets this value only as a target (a device setting, not a model value): Set never sends a hold. */
  direct?: boolean;
  /** The engine does not model this value yet (it refuses every change): the row is not shown. */
  notYet?: boolean;
}

const v = (s: Omit<VitalSpec, 'unit'> & { unit?: string }): VitalSpec => ({ ...s, unit: s.unit ?? unitOf(entry(s.n)) });
export const VITALS: readonly VitalSpec[] = [
  v({ v: 'hr', n: 1, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures' }),
  v({ v: 'sbp', n: 5, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures', modelOwned: true }),
  v({ v: 'dbp', n: 6, scale: 1, step: 1, digits: 0, min: 0, max: 300, group: 'Rate and pressures', modelOwned: true }),
  v({ v: 'cvp', n: 8, scale: 1, step: 1, digits: 0, min: -5, max: 40, group: 'Rate and pressures', modelOwned: true }),
  v({ v: 'papSys', n: 9, scale: 1, step: 1, digits: 0, min: 0, max: 120, group: 'Rate and pressures' }),
  v({ v: 'papDia', n: 10, scale: 1, step: 1, digits: 0, min: 0, max: 60, group: 'Rate and pressures' }),
  v({ v: 'pawp', n: 12, scale: 1, step: 1, digits: 0, min: 0, max: 40, group: 'Rate and pressures', modelOwned: true }),
  v({ v: 'spo2', n: 3, scale: 1, step: 1, digits: 0, min: 0, max: 100, group: 'Oxygenation and ventilation' }),
  v({ v: 'pi', n: 4, scale: 1, step: 0.1, digits: 1, min: 0.02, max: 20, group: 'Oxygenation and ventilation' }),
  v({ v: 'etco2', n: 15, scale: 1, step: 1, digits: 0, min: 0, max: 150, group: 'Oxygenation and ventilation', modelOwned: true }),
  v({ v: 'rr', n: 18, scale: 1, step: 1, digits: 0, min: 0, max: 80, unit: '/min', group: 'Oxygenation and ventilation' }),
  v({ v: 'vt', n: 125, scale: 1, step: 10, digits: 0, min: 0, max: 1500, unit: 'mL', group: 'Oxygenation and ventilation' }),
  v({ v: 'fio2', n: 130, scale: 100, step: 1, digits: 0, min: 21, max: 100, unit: '%', group: 'Oxygenation and ventilation' }),
  v({ v: 'shunt', n: 119, scale: 100, step: 1, digits: 0, min: 0, max: 50, group: 'Oxygenation and ventilation' }),
  v({ v: 'tempCore', n: 19, scale: 1, step: 0.1, digits: 1, min: 25, max: 43, group: 'Temperature and chemistry' }),
  v({ v: 'k', n: 188, scale: 1, step: 0.1, digits: 1, min: 2, max: 9, group: 'Temperature and chemistry', notYet: true }),
  v({ v: 'qtc', n: 23, scale: 1, step: 5, digits: 0, min: 300, max: 650, group: 'Temperature and chemistry', notYet: true }),
  v({ v: 'contractility', n: 298, scale: 1, step: 0.05, digits: 2, min: 0.1, max: 2, unit: '× baseline', group: 'Model inputs', manualOnly: true }),
  v({ v: 'volumeStatus', n: 299, scale: 1, step: 0.05, digits: 2, min: 0, max: 1, unit: '× baseline', group: 'Model inputs', manualOnly: true }),
  v({ v: 'svr', n: 61, scale: 1333.22, step: 50, digits: 0, min: 400, max: 4000, unit: 'dyn·s·cm⁻⁵', group: 'Model inputs', notYet: true }),
  v({ v: 'paceThresholdMa', n: 282, scale: 1, step: 5, digits: 0, min: 10, max: 200, group: 'Model inputs', direct: true }),
];

export const vitalOf = (x: StateVar): VitalSpec | undefined => VITALS.find((s) => s.v === x);
/** "HR", "ART S" — the glossary label of a target. */
export const vitalLabel = (x: StateVar): string => {
  const s = vitalOf(x);
  return s ? shortLabel(entry(s.n)) : 'Target';
};
/** Engine value → the display string without unit ("0.10" → "10"). */
export const showVital = (s: VitalSpec, engineValue: number | undefined): string =>
  engineValue === undefined || !Number.isFinite(engineValue) ? '--' : (engineValue * s.scale).toFixed(s.digits);
