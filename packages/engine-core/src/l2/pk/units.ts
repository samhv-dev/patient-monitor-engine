// Dose and rate normalisation (Stage 7g). The API keeps the brief's units; each library row has ONE amount unit.
import type { DoseUnit, RateUnit } from '../../types-pk.ts';

export type AmountUnit = 'mg' | 'mcg' | 'units' | 'mmol' | 'mL';
const MASS: Record<string, number> = { g: 1e6, mg: 1000, mcg: 1 }; // in µg

/** Bolus dose → amount in `amountUnit`, or an error string. `perMl` = syringe concentration (amountUnit per mL). */
export function toAmount(dose: number, unit: DoseUnit | RateUnit, amountUnit: AmountUnit, weightKg: number, perMl?: number): number | string {
  const perKg = unit.endsWith('/kg');
  const base = perKg ? unit.slice(0, -3) : unit;
  const d = perKg ? dose * weightKg : dose;
  if (base === amountUnit) return d; // before the volume rule: a drug dosed in mL (lipid, hypertonic saline) needs no concentration
  if (base === 'mL') return perMl !== undefined ? d * perMl : 'a volume dose needs the drug concentration';
  if (base in MASS && amountUnit in MASS) return (d * (MASS[base] as number)) / (MASS[amountUnit] as number);
  if (base === 'mEq' && amountUnit === 'mmol') return d; // monovalent (bicarbonate); 7c converts divalent ions itself
  return `unit ${unit} does not fit a drug dosed in ${amountUnit}`;
}

/** Rate → amount/min in `amountUnit`, or an error string. mL/h needs the syringe concentration. */
export function toRate(rate: number, unit: RateUnit, amountUnit: AmountUnit, weightKg: number, perMl?: number): number | string {
  const [num, ...rest] = unit.split('/');
  const per = rest.join('/'); // 'kg/min', 'min', 'h', 'kg/h'
  const perKg = per.startsWith('kg/');
  const time = perKg ? per.slice(3) : per;
  const minutes = time === 'h' ? 60 : time === 'min' ? 1 : NaN;
  if (!Number.isFinite(minutes)) return `unit ${unit} is not a rate`;
  const a = toAmount(rate, num as DoseUnit, amountUnit, 1, perMl);
  if (typeof a === 'string') return a;
  return ((perKg ? a * weightKg : a) as number) / minutes;
}
