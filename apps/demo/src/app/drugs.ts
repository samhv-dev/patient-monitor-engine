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
  // FU-7.1 A1 (research/24 P1): every neuromuscular blocker opens on its intubating dose in mg/kg — without a preset
  // the dose started at 0 in µg and "0.15" gave 0.15 µg. Doses [TXT]: the drug labels (Nimbex 0.15–0.2 mg/kg;
  // vecuronium 0.08–0.1; atracurium 0.4–0.5; Mivacron 0.15–0.2 mg/kg, 0.2 over 30 s) as the 7g rows quote them.
  cisatracurium: { bolus: [[0.15, 'mg/kg'], [0.2, 'mg/kg']] },
  vecuronium: { bolus: [[0.1, 'mg/kg']] },
  atracurium: { bolus: [[0.5, 'mg/kg']] },
  mivacurium: { bolus: [[0.2, 'mg/kg']] },
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
  // FU-7.1 A5 (Ali 2026-10-10): potassium chloride is INFUSED, never pushed — the picker opens on Infusion with the
  // peripheral 10 mmol/h and the central 20 mmol/h (10 and 20 mmol over the hour), and offers no bolus preset. The
  // engine warns, with its source, if a bolus or a faster rate is ordered anyway (l2/pk rows-other.ts maxRatePerH).
  potassiumChloride: { infusion: [[10, 'mmol/h'], [20, 'mmol/h']], aka: ['kcl', 'potassium'] },
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

/** The neuromuscular blockers' classes: dosed in µg by the engine's rows, prescribed in mg/kg. */
const NMB_CLASSES = new Set(['nmb', 'depolariser']);

/** Dose units offered for a drug: its own unit and per kg, plus g for drugs dosed in mg (FU-7.1 A1: mg/kg for the
 * neuromuscular blockers, the unit they are prescribed in; not for the other µg drugs, where mg/kg is a 1000× trap). */
export function doseUnits(d: DrugItem): DoseUnit[] {
  const a = d.amountUnit as DoseUnit;
  const u: DoseUnit[] = [a];
  if (a === 'mg' || a === 'mcg' || a === 'mL' || a === 'units' || a === 'mmol') u.push(`${a}/kg` as DoseUnit);
  if (a === 'mg') u.push('g', 'mcg');
  if (a === 'mcg') u.push('mg');
  if (a === 'mcg' && NMB_CLASSES.has(d.cls)) u.push('mg/kg');
  return u;
}
export function rateUnits(d: DrugItem): RateUnit[] {
  const a = d.amountUnit;
  if (a === 'mcg') return ['mcg/kg/min', 'mcg/min'];
  if (a === 'mg') return ['mcg/kg/min', 'mg/kg/h', 'mg/h', 'mg/min'];
  if (a === 'units') return ['units/min', 'units/h'];
  if (a === 'mmol') return ['mmol/h']; // FU-7.1 A5: potassium chloride (10–20 mmol/h)
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
