// The dose picker's data (research/13 brief §7 "Dose picker"). Drug names and classes come from the engine's own library
// (7g `DRUGS`), so a drug a later stage adds is listed without a code change. The presets below are DRAFTS for Ali's
// review (brief Q6: "start from the 7g library's ranges; Ali reviews one table before Stage 9 code").
import { DRUGS, type DoseUnit, type RateUnit } from '@pme/engine-core';
import { drugName } from './glossary.ts';

export interface DrugPreset {
  bolus?: Array<[number, DoseUnit]>;
  infusion?: Array<[number, RateUnit]>;
  /** Other names people search for ("noradrenaline"). */
  aka?: string[];
}

/** Clinical display of an engine unit ("mcg" → "µg"). */
export const unitText = (u: string): string => u.replace(/mcg/g, 'µg');

export const PRESETS: Readonly<Record<string, DrugPreset>> = {
  propofol: { bolus: [[1, 'mg/kg'], [2, 'mg/kg'], [50, 'mg']], infusion: [[100, 'mcg/kg/min'], [150, 'mcg/kg/min']] },
  ketamine: { bolus: [[0.5, 'mg/kg'], [1, 'mg/kg'], [2, 'mg/kg']] },
  etomidate: { bolus: [[0.3, 'mg/kg']] },
  midazolam: { bolus: [[1, 'mg'], [2, 'mg']] },
  fentanyl: { bolus: [[1, 'mcg/kg'], [2, 'mcg/kg'], [50, 'mcg']] },
  remifentanil: { infusion: [[0.1, 'mcg/kg/min'], [0.2, 'mcg/kg/min']] },
  morphine: { bolus: [[2, 'mg'], [5, 'mg']] },
  rocuronium: { bolus: [[0.6, 'mg/kg'], [1.2, 'mg/kg']] },
  succinylcholine: { bolus: [[1, 'mg/kg'], [1.5, 'mg/kg']], aka: ['suxamethonium'] },
  sugammadex: { bolus: [[2, 'mg/kg'], [4, 'mg/kg'], [16, 'mg/kg']] },
  neostigmine: { bolus: [[50, 'mcg/kg']] },
  atropine: { bolus: [[0.5, 'mg'], [1, 'mg']] },
  glycopyrrolate: { bolus: [[0.2, 'mg']] },
  phenylephrine: { bolus: [[50, 'mcg'], [100, 'mcg'], [200, 'mcg']], infusion: [[0.5, 'mcg/kg/min']] },
  ephedrine: { bolus: [[6, 'mg'], [12, 'mg']] },
  norepinephrine: { infusion: [[0.05, 'mcg/kg/min'], [0.1, 'mcg/kg/min'], [0.2, 'mcg/kg/min']], aka: ['noradrenaline'] },
  epinephrine: { bolus: [[10, 'mcg'], [100, 'mcg'], [1, 'mg']], infusion: [[0.05, 'mcg/kg/min'], [0.1, 'mcg/kg/min']], aka: ['adrenaline'] },
  vasopressin: { bolus: [[1, 'units']], infusion: [[0.03, 'units/min']] },
  dobutamine: { infusion: [[5, 'mcg/kg/min'], [10, 'mcg/kg/min']] },
  esmolol: { bolus: [[0.5, 'mg/kg']] },
  labetalol: { bolus: [[5, 'mg'], [10, 'mg']] },
  amiodarone: { bolus: [[150, 'mg'], [300, 'mg']] },
  adenosine: { bolus: [[6, 'mg'], [12, 'mg']] },
  calciumChloride: { bolus: [[10, 'mg/kg'], [1, 'g']] },
  magnesium: { bolus: [[2, 'g']] },
  dantrolene: { bolus: [[2.5, 'mg/kg']] },
  naloxone: { bolus: [[40, 'mcg'], [100, 'mcg'], [400, 'mcg']] },
  lipidEmulsion: { bolus: [[1.5, 'mL/kg']], aka: ['intralipid'] },
};

export interface DrugItem {
  id: string;
  /** The display name in the site's set (glossary `DRUG_NAMES`, orchestrator ruling 5): read at use, not stored. */
  readonly name: string;
  cls: string;
  /** The unit the engine's library doses this drug in (mg, mcg, units, mmol, mL). */
  amountUnit: string;
  preset: DrugPreset;
}

/** Dose units offered for a drug: its own unit and per kg, plus g for drugs dosed in mg. */
export function doseUnits(d: DrugItem): DoseUnit[] {
  const a = d.amountUnit as DoseUnit;
  const u: DoseUnit[] = [a];
  if (a === 'mg' || a === 'mcg' || a === 'mL' || a === 'units' || a === 'mmol') u.push(`${a}/kg` as DoseUnit);
  if (a === 'mg') u.push('g', 'mcg');
  if (a === 'mcg') u.push('mg');
  return u;
}
export function rateUnits(d: DrugItem): RateUnit[] {
  const a = d.amountUnit;
  if (a === 'mcg') return ['mcg/kg/min', 'mcg/min'];
  if (a === 'mg') return ['mcg/kg/min', 'mg/kg/h', 'mg/h', 'mg/min'];
  if (a === 'units') return ['units/min', 'units/h'];
  return ['mL/h'];
}

export const DRUG_LIST: readonly DrugItem[] = Object.values(DRUGS)
  .filter((r) => r.cls !== 'placeholder')
  .map((r) => ({ id: r.id, get name() { return drugName(r.id); }, cls: r.cls, amountUnit: r.amountUnit, preset: PRESETS[r.id] ?? {} }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Search by name, id or another name ("noradr" finds norepinephrine). */
export function findDrugs(q: string): DrugItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [...DRUG_LIST];
  return DRUG_LIST.filter((d) => d.name.toLowerCase().includes(s) || d.id.toLowerCase().includes(s) || (d.preset.aka ?? []).some((a) => a.includes(s)));
}

/** "0.1 µg/kg/min = 7 µg/min" for this patient's weight; '' when the unit is not per kg. */
export function perKg(value: number, unit: string, weightKg: number): string {
  if (!unit.includes('/kg')) return '';
  const abs = value * weightKg;
  const digits = abs < 10 ? 1 : 0;
  return `${value} ${unitText(unit)} = ${abs.toFixed(digits)} ${unitText(unit.replace('/kg', ''))} for ${weightKg} kg`;
}
